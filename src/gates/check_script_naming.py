#!/usr/bin/env python3
"""Un `.py` es un módulo: su nombre va en snake_case.

El nombre de un archivo Python **es** el nombre del módulo que se importa, así
que un guion medio lo vuelve inimportable — `import mi-guion` es un error de
sintaxis. PEP 8 lo manda por esa razón, no por estética.

**El costo era real y estaba medido.** Antes de cerrar este grifo había 41
`.py` con guion medio en `.claude/`, y el rodeo que exigen aparecía **10 veces**
en el árbol::

    tests/test_clasificar_agentes.py:39
        spec = importlib.util.spec_from_file_location("clf", HERE / "clasificar_agentes.py")

`clasificar_agentes.py` nació como ejecutable de una vía y a la semana tenía
test. *"Nunca se va a importar"* no es una propiedad del archivo: es una apuesta
sobre el futuro, y se perdió.

Lo que este gate NO decide — el shell
--------------------------------------

Ni POSIX (IEEE Std 1003.1) ni ShellCheck fijan convención de nombre para un
`.sh`: el nombre no es parte de la sintaxis del lenguaje ni se importa. Por eso
la convención de shell es **local**, y en este árbol hay **dos vivas**, ninguna
equivocada:

===========================================  ==================  =========
Raíz                                         Dominante           Reparto
===========================================  ==================  =========
``.claude/scripts`` + ``.claude/hooks``      kebab               102 / 0
``server/scripts``                           snake               4 / 76
``db/scripts``                               snake               4 / 9
``{docs,api,ui}/scripts``                    mezclada            16 / 7
===========================================  ==================  =========

Legislar «kebab siempre» habría marcado como defecto los 76 provisioners de
`server`, que son consistentes entre sí. Es el sub-patrón **A** de
``metrica-decide-la-conclusion.md``: se midió una raíz y se concluyó sobre el
árbol. El veredicto por raíz es una decisión del ejecutor, no de este guion.

El segundo eje: el IDIOMA del nombre (``--idioma``)
----------------------------------------------------

Añadido 2026-08-28 por directiva del ejecutor: *«nuestros archivos, clases,
funciones, firmas de funciones van a ir en inglés, los comentarios tienen que
ir en español»*. Cierra la decisión **#647**, que este mismo guion declaraba
fuera de su alcance —«el idioma del nombre … es otro eje»— sin resolverla.

Son dos ejes independientes sobre el mismo nombre y se miden por separado:
``my-english-name.py`` incumple el primero y no el segundo;
``check_rst_convenciones.py`` incumple el segundo y no el primero.

El léxico NO se escribe aquí. Se reusa ``spanish_words_in`` de
``api: scripts/check_identifier_language.py``, que es el criterio que el
proyecto ya acepta para la misma pregunta sobre un identificador — y el nombre
de un módulo Python **es** un identificador. Duplicar la lista sería fabricar
una segunda fuente de verdad que nadie sincroniza. Si ese archivo no está,
el gate **rehúsa con 2 y no emite cifra**: un 0 sin léxico sería un verde
falso.

Métrica (eje 1): archivos ``*.py`` con guion medio en el nombre base, bajo las
raíces declaradas en ``RAICES``.
Métrica (eje 2): tokens españoles en el nombre base de ``*.py`` y ``*.sh``,
partiendo por ``-`` y ``_``, contra el baseline congelado.
Ciega a: la convención de separador de ``.sh`` —que sigue siendo local por raíz
y decisión del ejecutor (#646)—; a todo archivo fuera de esas raíces; y, en el
eje 2, a la palabra que existe en los dos idiomas (``total``, ``final``,
``normal``), que es la ceguera declarada del léxico que reusa. El eje 2 es una
**cota inferior**: un 0 no prueba que no quede español, prueba que no queda del
que este instrumento sabe ver.
"""
from __future__ import annotations

import argparse
import ast
import importlib.util
import os
import pathlib
import sys

# Raíces medidas. Un `.py` fuera de aquí no lo ve este gate — declararlo es
# preferible a un barrido implícito cuyo alcance nadie conoce.
RAICES = ('.claude', 'scripts', 'src', 'tests', 'addons', 'provisioners', 'utils')

EXCLUIR = ('node_modules', '.venv', 'venv', '__pycache__', 'build', 'dist',
           'eventos', 'tools')

# El léxico vive en el gate hermano de `api`, que es donde se mantiene. La
# variable permite apuntarlo a otro sitio —o a ninguno, para probar el guard.
LEXICO = os.environ.get('IDIOMA_GATE_LEXICO',
                        '/home/user/kaupamex-api/scripts/check_identifier_language.py')
BASELINE = pathlib.Path(__file__).parent / 'script_naming_language_baseline.txt'
IDENTIFIER_BASELINE = (pathlib.Path(__file__).parent
                      / 'identifier_language_baseline_claude.txt')


def cargar_lexico():
    """`spanish_words_in` del gate hermano, o rehúsa.

    Sin léxico no hay veredicto. Se sale con 2 y sin cifra porque un 0 aquí
    se leería como «no hay español» cuando significa «no pude medir» — el
    sub-patrón D de `metrica-decide-la-conclusion.md`.
    """
    ruta = pathlib.Path(LEXICO)
    if not ruta.is_file():
        print(f'ERROR — no se encontró el léxico en {ruta}. El eje de idioma '
              f'reusa `spanish_words_in` de api/scripts/'
              f'check_identifier_language.py; sin él NO se emite conteo, '
              f'porque un 0 sería un verde falso.', file=sys.stderr)
        raise SystemExit(2)
    spec = importlib.util.spec_from_file_location('_lexico', ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo.spanish_words_in


def cargar_baseline():
    if not BASELINE.is_file():
        return set()
    return {ln.strip() for ln in BASELINE.read_text(encoding='utf-8').splitlines()
            if ln.strip() and not ln.startswith('#')}


def scan_idioma(raiz):
    """Devuelve (infractores, total medido) del eje de idioma.

    Cada infractor es `(ruta relativa, tokens españoles)`. El nombre se parte
    por `-` y por `_`: los dos separadores conviven en el árbol y el idioma es
    ortogonal a cuál se use.
    """
    espanol = cargar_lexico()
    baseline = cargar_baseline()
    infractores, total = [], 0
    for sub in RAICES:
        base = raiz / sub
        if not base.is_dir():
            continue
        for patron in ('*.py', '*.sh'):
            for f in sorted(base.rglob(patron)):
                if any(p in EXCLUIR for p in f.parts):
                    continue
                total += 1
                relativa = str(f.relative_to(raiz))
                if relativa in baseline:
                    continue
                hits = espanol(f.stem.replace('-', '_'))
                if hits:
                    infractores.append((relativa, hits))
    return infractores, total


def scan(raiz: pathlib.Path) -> tuple[list[pathlib.Path], int]:
    """Devuelve (infractores, total medido) bajo `raiz`."""
    infractores: list[pathlib.Path] = []
    total = 0
    for sub in RAICES:
        base = raiz / sub
        if not base.is_dir():
            continue
        for f in base.rglob('*.py'):
            if any(p in EXCLUIR for p in f.parts):
                continue
            total += 1
            if '-' in f.name:
                infractores.append(f)
    return infractores, total


def load_identifier_lexicon():
    """El modulo del gate hermano, no solo una de sus funciones.

    El eje 3 necesita tres simbolos suyos —``declared_identifiers``,
    ``code_suffix_families`` y ``spanish_words_in``—, asi que carga el modulo
    entero en vez de una funcion suelta. Rehusa igual que ``cargar_lexico``:
    sin lexico NO hay veredicto, porque un 0 se leeria como «no hay espanol»
    cuando significa «no pude medir».
    """
    ruta = pathlib.Path(LEXICO)
    if not ruta.is_file():
        print(f'ERROR — no se encontró el léxico en {ruta}. El eje de '
              f'identificadores reusa `declared_identifiers` y '
              f'`spanish_words_in` de api/scripts/check_identifier_language.py; '
              f'sin él NO se emite conteo, porque un 0 sería un verde falso.',
              file=sys.stderr)
        raise SystemExit(2)
    spec = importlib.util.spec_from_file_location('_lexico', ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def load_identifier_baseline():
    if not IDENTIFIER_BASELINE.is_file():
        return set()
    return {ln.strip()
            for ln in IDENTIFIER_BASELINE.read_text(encoding='utf-8').splitlines()
            if ln.strip() and not ln.startswith('#')}


def scan_identifiers(root):
    """Devuelve ``(infractores, total medido)`` del eje de identificadores.

    Cada infractor es ``(ruta relativa, identificador, linea, palabras)``. El
    archivo que no parsea no se cuenta como medido: contarlo inflaria el
    denominador con archivos sobre los que el instrumento no dijo nada.
    """
    lexico = load_identifier_lexicon()
    baseline = load_identifier_baseline()
    infractores, total = [], 0
    for sub in RAICES:
        base = root / sub
        if not base.is_dir():
            continue
        for f in sorted(base.rglob('*.py')):
            if any(p in EXCLUIR for p in f.parts):
                continue
            try:
                tree = ast.parse(f.read_text(encoding='utf-8'))
            except (SyntaxError, UnicodeDecodeError):
                continue
            total += 1
            relativa = str(f.relative_to(root))
            declared = list(lexico.declared_identifiers(tree))
            families = lexico.code_suffix_families(n for n, _ in declared)
            seen = set()
            for name, lineno in declared:
                if name in seen:
                    continue
                hits = lexico.spanish_words_in(name, families)
                if not hits:
                    continue
                seen.add(name)
                if f'{relativa}::{name}' in baseline:
                    continue
                infractores.append((relativa, name, lineno, hits))
    return infractores, total


def main_identifiers(root, args):
    """La rama del eje 3. Su universo y su ceguera son otros que los del nombre."""
    if args.write_baseline:
        # Se escribe SIN baseline previo: congela lo que hay hoy.
        IDENTIFIER_BASELINE.write_text('')
        infractores, total = scan_identifiers(root)
        IDENTIFIER_BASELINE.write_text(
            '# Deuda heredada de identificadores en español bajo .claude/**.\n'
            '# El gate hermano de api mide src/, tests/ y addons/; este mide lo\n'
            '# que aquél no alcanza. Una entrada listada NO bloquea; una nueva\n'
            '# SÍ. Se paga al tocar el archivo: al traducir el identificador,\n'
            '# quitar su línea — si no, el baseline miente sobre deuda que ya\n'
            '# no existe. Barrido: tarea #147.\n'
            + ''.join(f'{r}::{n}\n'
                      for r, n, _, _ in sorted(set(
                          (r, n, 0, ()) for r, n, _, _ in infractores))))
        print(f'baseline escrito: {len(set((r, n) for r, n, _, _ in infractores))} '
              f'identificador(es) congelado(s) (alcance medido: {total} archivo(s))')
        return 0

    infractores, total = scan_identifiers(root)

    if args.quiet:
        print(len(infractores))
    else:
        for relativa, name, lineno, hits in infractores:
            print(f'  {relativa}:{lineno}  {name}  ->  español: {", ".join(hits)}')
        print(f'{len(infractores)} identificador(es) en español '
              f'(alcance medido: {total} archivo(s) .py bajo '
              f'{"/".join(RAICES)}; {len(load_identifier_baseline())} '
              f'congelado(s) en baseline)')
        print('  Cota inferior: ciega a la palabra que existe en los dos '
              'idiomas (total, final, normal).')
        print('  Traducir la palabra, no buscarle un sinónimo: Modelo -> Model, '
              '_Base se queda _Base.')
    return 1 if (args.strict and infractores) else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('raiz', nargs='?', default='.', help='raíz del repositorio')
    ap.add_argument('--quiet', action='store_true', help='sólo el conteo')
    ap.add_argument('--strict', action='store_true', help='exit 1 si hay infractores')
    ap.add_argument('--idioma', action='store_true',
                    help='mide el eje 2: el idioma del nombre, no el separador')
    ap.add_argument('--identifiers', action='store_true',
                    help='mide el eje 3: el idioma de los símbolos '
                         'declarados DENTRO del .py')
    ap.add_argument('--write-baseline', action='store_true',
                    help='congela la deuda heredada del eje de idioma')
    args = ap.parse_args()

    raiz = pathlib.Path(args.raiz).resolve()

    if args.identifiers:
        return main_identifiers(raiz, args)

    if args.idioma:
        return main_idioma(raiz, args)

    infractores, total = scan(raiz)

    if args.quiet:
        print(len(infractores))
    else:
        for f in infractores:
            print(f'  {f.relative_to(raiz)}  ->  {f.name.replace("-", "_")}')
        print(
            f'{len(infractores)} archivo(s) .py con guion medio '
            f'(alcance medido: {total} archivo(s) .py bajo {"/".join(RAICES)})'
        )
    return 1 if (args.strict and infractores) else 0


def main_idioma(raiz, args):
    """La rama del eje 2. Separada porque su veredicto y su ceguera son otros."""
    if args.write_baseline:
        # El baseline se escribe SIN baseline previo: congela lo que hay hoy.
        BASELINE.write_text('')
        infractores, total = scan_idioma(raiz)
        BASELINE.write_text(
            '# Deuda heredada del eje de idioma en nombres de archivo.\n'
            '# Una ruta listada NO bloquea; una nueva SÍ. Se paga al tocar el\n'
            '# archivo: al renombrarlo, quitar su línea — si no, el baseline\n'
            '# miente sobre deuda que ya no existe.\n'
            + ''.join(f'{r}\n' for r, _ in infractores))
        print(f'baseline escrito: {len(infractores)} nombre(s) congelado(s) '
              f'(alcance medido: {total} archivo(s))')
        return 0

    infractores, total = scan_idioma(raiz)

    if args.quiet:
        print(len(infractores))
    else:
        for relativa, hits in infractores:
            print(f'  {relativa}  ->  español: {", ".join(hits)}')
        print(f'{len(infractores)} nombre(s) de archivo en español '
              f'(alcance medido: {total} archivo(s) .py y .sh bajo '
              f'{"/".join(RAICES)}; {len(cargar_baseline())} congelado(s) '
              f'en baseline)')
        print('  Cota inferior: ciega a la palabra que existe en los dos '
              'idiomas (total, final, normal).')
    return 1 if (args.strict and infractores) else 0


if __name__ == '__main__':
    sys.exit(main())
