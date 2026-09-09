"""Gate: los githooks están activos en los cinco clones.

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

#: Los cinco clones hermanos. El superproyecto está ausente por decisión
#: (`gitlink-bump-gate.md`), así que el árbol son estos y no un padre.
ARBOL = pathlib.Path(os.environ.get('KAUPAMEX_ARBOL', '/home/user'))
CLONES = ('api', 'db', 'docs', 'server', 'ui')

#: Lo que `scripts/install-hooks.sh` fija en todos ellos.
ESPERADO = '.githooks'


def estado(clon):
    """(veredicto, detalle) para un clon. Nunca inventa un verde."""
    raiz = ARBOL / f'kaupamex-{clon}'
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
    args = ap.parse_args()

    filas = [(c, *estado(c)) for c in CLONES]
    malos = [f for f in filas if f[1] != 'OK']

    if args.quiet:
        print(len(malos))
    else:
        for clon, veredicto, detalle in filas:
            marca = 'OK  ' if veredicto == 'OK' else f'{veredicto:<9}'
            print(f'  {marca} kaupamex-{clon:<7} {detalle}')
        print(f'check-githooks-activos: {len(malos)} clon(es) con los hooks '
              f'inactivos (alcance medido: {len(filas)} de {len(CLONES)} '
              f'declarados)')
    return 1 if (args.strict and malos) else 0


if __name__ == '__main__':
    sys.exit(main())
