#!/usr/bin/env python3
"""Colisiones de etiqueta de hallazgo ENTRE ramas hermanas vivas (#5).

``check-ids-duplicados.sh`` mide el arbol de trabajo: dos etiquetas iguales
**aqui**. Es correcto y es ciego a la mitad que duele — dos ramas que avanzan
en paralelo eligen el numero siguiente mirando cada una su propio arbol, y la
colision no existe en ninguna de las dos: **nace en el merge**. Ahi Sphinx
emite ``duplicate label`` y el ``:ref:`` resuelve al hallazgo equivocado, en
silencio.

Medido al escribirlo, sobre las ramas remotas de este repo: **6 colisiones**
vivas, cinco de ellas (``h-api-399``, ``400``, ``401``, ``410``, ``411``)
entre ``feature/integrar-addons-faltantes-referencia`` y el resto, y una
—``h-docs-440``— entre ``feature/kaupamex-l0`` y ``feature/kaupamex-l2``,
tomada el mismo dia por dos sesiones distintas para hallazgos distintos.

El criterio de colision es **la ruta, no la rama**: la misma etiqueta en el
mismo archivo en cinco ramas es historia compartida y no es un defecto; la
misma etiqueta en DOS rutas distintas es una colision, la vea quien la vea.

Lectura sin materializar nada: ``git grep`` sobre la referencia remota. No se
hace ``checkout`` de ninguna rama — la misma disciplina que rige para
``odoo-tools``, y aqui ademas evita ensuciar el arbol de quien corre el gate.

*Metrica:* declaraciones ``^.. _h-<capa>-NNN:`` bajo ``source/`` en cada
referencia remota viva, agrupadas por etiqueta.
*Ciega a:* (1) una colision entre una rama viva y otra **local sin publicar**
—solo ve lo que esta en ``origin``—; (2) que dos rutas distintas describan el
mismo hallazgo movido de sitio, que se lee como colision y no lo es; (3) el
contenido: dos hallazgos con la misma etiqueta Y la misma ruta pero cuerpos
distintos pasan.
"""
import argparse
import collections
import re
import subprocess
import sys

EXIT_OK = 0
EXIT_COLISION = 1
EXIT_GUARD = 2

RE_ETIQUETA = re.compile(r'^\.\. _h-(?:api|docs|ui|db|server)-[0-9]+:')
PATRON_GREP = r'^\.\. _h-(api|docs|ui|db|server)-[0-9]+:'


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, check=False).stdout


def refs_vivas(base):
    """Las ramas remotas que aun no estan fusionadas en ``base``.

    ``base`` misma cuenta como viva: es el destino, y una colision contra ella
    es la que va a estallar primero.
    """
    todas = [r for r in git('for-each-ref', '--format=%(refname:short)',
                            'refs/remotes/origin').split() if not r.endswith('/HEAD')]
    fusionadas = set(git('branch', '-r', '--merged', base,
                         '--format=%(refname:short)').split())
    return [r for r in todas if r == base or r not in fusionadas]


def declaraciones(ref):
    """{etiqueta: {ruta}} de una referencia, sin materializarla."""
    salida = git('grep', '-oE', PATRON_GREP, ref, '--', 'source/')
    por_etiqueta = collections.defaultdict(set)
    for linea in salida.splitlines():
        partes = linea.split(':', 2)
        if len(partes) < 3:
            continue
        ruta, coincidencia = partes[1], partes[2].strip()
        if RE_ETIQUETA.match(coincidencia):
            por_etiqueta[coincidencia].add(ruta)
    return por_etiqueta


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--base', default='origin/develop',
                        help='rama destino contra la que se decide si otra sigue viva')
    parser.add_argument('--quiet', action='store_true', help='solo el conteo')
    parser.add_argument('--strict', action='store_true', help='exit 1 si hay colisiones')
    parser.add_argument('--siguiente', metavar='CAPA',
                        help='imprime el primer ID libre de esa capa entre TODAS '
                             'las ramas remotas (api|docs|ui|db|server) y termina')
    parser.add_argument('--entre', nargs=2, metavar=('REF-A', 'REF-B'),
                        help='mide colisiones entre EXACTAMENTE dos referencias '
                             '(origen y destino de una integracion), sin tocar el '
                             'resto de ramas. El criterio sigue siendo la ruta, no '
                             'la rama')
    args = parser.parse_args(argv)

    if not git('rev-parse', '--git-dir').strip():
        print('ERROR — no es un repositorio git. NO se emite veredicto.', file=sys.stderr)
        return EXIT_GUARD

    if args.entre:
        # Modo par: la pregunta de una integracion es «¿origen y destino chocan?»,
        # no «¿chocan todas las ramas vivas?». El criterio no cambia (la ruta, no
        # la rama); cambia el universo, que aqui son exactamente estas dos refs.
        refs_par = args.entre
        for ref in refs_par:
            if not git('rev-parse', '--verify', '--quiet', ref).strip():
                print(f'ERROR — la referencia «{ref}» no resuelve. NO se emite '
                      'veredicto: un verde sin las dos refs medidas no discrimina.',
                      file=sys.stderr)
                return EXIT_GUARD
        rutas_par = collections.defaultdict(set)   # etiqueta -> {ruta}
        duenos_par = collections.defaultdict(set)  # etiqueta -> {(ref, ruta)}
        for ref in refs_par:
            for etiqueta, conjunto in declaraciones(ref).items():
                rutas_par[etiqueta].update(conjunto)
                for ruta in conjunto:
                    duenos_par[etiqueta].add((ref, ruta))
        colisiones_par = {e: duenos_par[e] for e, r in rutas_par.items() if len(r) > 1}
        if args.quiet:
            print(len(colisiones_par))
        else:
            print('check_ids_entre_ramas --entre:')
            print(f'  refs medidas: {refs_par[0]}  vs  {refs_par[1]}')
            print(f'  etiquetas distintas: {len(rutas_par)}')
            print(f'  colisiones entre las dos refs: {len(colisiones_par)}')
            for etiqueta in sorted(colisiones_par):
                print(f'     {etiqueta}')
                for ref, ruta in sorted(colisiones_par[etiqueta]):
                    print(f'        {ref}')
                    print(f'           {ruta}')
        if args.strict and colisiones_par:
            return EXIT_COLISION
        return EXIT_OK

    if args.siguiente:
        usados = set()
        patron = re.compile(rf'_h-{re.escape(args.siguiente)}-(\d+):')
        for ref in [r for r in git('for-each-ref', '--format=%(refname:short)',
                                   'refs/remotes/origin').split() if not r.endswith('/HEAD')]:
            usados.update(int(m.group(1))
                          for m in patron.finditer(git('grep', '-ohE', PATRON_GREP, ref,
                                                       '--', 'source/')))
        if not usados:
            print(f'ERROR — 0 etiquetas h-{args.siguiente}-NNN en las ramas remotas. '
                  'NO se propone un ID: sin universo medido, el "1" seria una '
                  'suposicion.', file=sys.stderr)
            return EXIT_GUARD
        print(max(usados) + 1)
        return EXIT_OK

    ramas = refs_vivas(args.base)
    if not ramas:
        print('ERROR — 0 ramas remotas que medir. NO se emite veredicto: un '
              'verde sin universo es un verde que no discrimina.', file=sys.stderr)
        return EXIT_GUARD

    rutas = collections.defaultdict(set)     # etiqueta -> {ruta}
    duenos = collections.defaultdict(set)    # etiqueta -> {(rama, ruta)}
    for ref in ramas:
        for etiqueta, conjunto in declaraciones(ref).items():
            rutas[etiqueta].update(conjunto)
            for ruta in conjunto:
                duenos[etiqueta].add((ref, ruta))

    colisiones = {e: duenos[e] for e, r in rutas.items() if len(r) > 1}

    if args.quiet:
        print(len(colisiones))
    else:
        print('check_ids_entre_ramas:')
        print(f'  ramas vivas medidas: {len(ramas)} (base: {args.base})')
        for r in ramas:
            print(f'     {r}')
        print(f'  etiquetas distintas: {len(rutas)}')
        print(f'  colisiones entre ramas: {len(colisiones)}')
        for etiqueta in sorted(colisiones):
            print(f'     {etiqueta}')
            for rama, ruta in sorted(colisiones[etiqueta]):
                print(f'        {rama}')
                print(f'           {ruta}')
        print()
        print('  El criterio es la RUTA, no la rama: la misma etiqueta en el mismo')
        print('  archivo en varias ramas es historia compartida, no un defecto.')
        print('  Para elegir el siguiente ID sin chocar:')
        print('     python3 .claude/scripts/gates/check_ids_entre_ramas.py --siguiente docs')

    if args.strict and colisiones:
        return EXIT_COLISION
    return EXIT_OK


if __name__ == '__main__':
    sys.exit(main())
