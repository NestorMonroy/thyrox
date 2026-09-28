"""Gate: los githooks están activos en el proveedor y en cada clon del roster.

Cierra la tarea #21, y con ella la causa de raíz de :ref:`h-api-858`.

El problema, medido en :ref:`h-docs-447`
========================================

``core.hooksPath`` vive en ``.git/config``, que **no se versiona**. Un clon
nuevo trae los hooks escritos en ``.githooks/`` y git no los mira: el
``pre-commit`` y el ``commit-msg`` de ese repo no corren.

Y no corren **en silencio**. No hay rojo, no hay mensaje, y no hay un
``--no-verify`` en el historial que lo delate — desde el árbol es
indistinguible de una sesión donde todos los gates pasaron. Cuatro de los cinco
clones commitearon una sesión entera así; lo que se coló lo mide
``remedicion-gates-githook.rst``.

Es el sub-patrón D de ``metrica-decide-la-conclusion.md`` en su forma más pura:
el control pasa porque **no existe**, y su ausencia se lee igual que su verde.

Qué mide, y qué NO
==================

Mide que ``core.hooksPath`` esté fijado **y** que apunte a un directorio que
existe con al menos un hook ejecutable dentro. Las tres condiciones hacen
falta: un valor fijado a un directorio vacío deja los hooks igual de mudos que
no fijarlo.

*Métrica:* ``git config core.hooksPath`` en cada clon, más la existencia y el
bit de ejecución de los archivos de ese directorio.
*Ciega a:* si el hook **hace** lo que dice —eso lo miden sus propios tests—; a
un hook que exista y siempre salga 0; y a ``--no-verify``, que sigue siendo
invisible en el árbol.

Qué clones, y por qué dos cifras
================================

El roster es el de ``paths.reach`` —declarado en ``THYROX_REACH_ROOTS`` o
derivado de los hermanos— más el proveedor; ningún nombre de clon se escribe
en el código. Sin roster rehúsa con exit 2 y sin cifra.

Un clon AUSENTE no tiene los hooks inactivos, no está: se cuenta aparte y no
bloquea ``--strict``. Sumarlo a los inactivos inflaría el conteo.

Uso::

    python3 check_githooks_activos.py            # reporte
    python3 check_githooks_activos.py --quiet    # sólo el conteo de faltantes
    python3 check_githooks_activos.py --strict   # exit 1 si falta alguno
"""
import argparse
import os
import pathlib
import subprocess
import sys

from paths import reach  # noqa: E402

#: Lo que `scripts/install-hooks.sh` fija en todos ellos.
ESPERADO = '.githooks'


def roster(provider):
    """(nombre, raíz) del proveedor y de cada clon del roster.

    Lanza ``reach.ReachRootError`` si no hay roster: quien llama rehúsa."""
    clones = [(reach.clone_name(r), reach.root(r)) for r in reach.reach_roots()]
    return [(pathlib.Path(provider).name, pathlib.Path(provider))] + clones


def estado(raiz):
    """(veredicto, detalle) para un clon. Nunca inventa un verde."""
    raiz = pathlib.Path(raiz)
    if not (raiz / '.git').exists():
        return 'AUSENTE', 'no es un clon de git en este árbol'

    r = subprocess.run(['git', '-C', str(raiz), 'config', 'core.hooksPath'],
                       capture_output=True, text=True)
    valor = r.stdout.strip()
    if not valor:
        return 'SIN-FIJAR', ('core.hooksPath sin fijar — sus hooks no corren; '
                             'arreglo: bash scripts/install-hooks.sh')

    d = raiz / valor if not os.path.isabs(valor) else pathlib.Path(valor)
    if not d.is_dir():
        return 'ROTO', f'core.hooksPath={valor} y ese directorio no existe'

    vivos = [h.name for h in sorted(d.iterdir())
             if h.is_file() and os.access(h, os.X_OK)]
    if not vivos:
        return 'VACIO', f'core.hooksPath={valor} sin ningún hook ejecutable'
    return 'OK', f'{valor} — {", ".join(vivos)}'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--quiet', action='store_true', help='sólo el conteo')
    ap.add_argument('--strict', action='store_true', help='exit 1 si falta')
    ap.add_argument('--provider', default=None,
                    help='raíz del proveedor (por defecto, la de paths.reach)')
    args = ap.parse_args()

    try:
        clones = roster(args.provider or reach.thyrox_root())
    except reach.ReachRootError as error:
        print(f'check-githooks-activos: REHÚSA — {error} NO se emite un conteo.',
              file=sys.stderr)
        return 2
    filas = [(nombre, *estado(raiz)) for nombre, raiz in clones]
    ausentes = [f for f in filas if f[1] == 'AUSENTE']
    inactivos = [f for f in filas if f[1] not in ('OK', 'AUSENTE')]

    if args.quiet:
        print(len(inactivos))
    else:
        for nombre, veredicto, detalle in filas:
            marca = 'OK  ' if veredicto == 'OK' else f'{veredicto:<9}'
            print(f'  {marca} {nombre:<18} {detalle}')
        print(f'check-githooks-activos: {len(inactivos)} clon(es) con los hooks '
              f'inactivos, {len(ausentes)} ausente(s) (alcance medido: '
              f'{len(filas) - len(ausentes)} presente(s) de {len(filas)}, el '
              f'proveedor incluido)')
    return 1 if (args.strict and inactivos) else 0


if __name__ == '__main__':
    sys.exit(main())
