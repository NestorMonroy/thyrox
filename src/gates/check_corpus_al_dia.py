#!/usr/bin/env python3
"""Avisa cuando el corpus extraido se queda atras del ejecutable instalado.

El corpus de ``_references/claude-code-bin/`` se organiza **por version** desde
:ref:`h-docs-434`: un directorio por build, y una version ya extraida nunca se
pisa. Esa disciplina resuelve el parcheo, y deja abierta la otra mitad: nada
avisa cuando el ejecutable instalado avanza y el corpus se queda donde estaba.

El estado que este gate detecta ya ocurrio y esta medido: el 2026-08-26 el
arbol tenia ``2.1.241`` extraido mientras el binario servia ``2.1.246`` —
**cinco versiones de diferencia**—, y no lo delato ningun instrumento sino una
lectura a proposito. Un corpus atrasado no rompe nada: sigue respondiendo a
cada consulta, con las respuestas del build anterior. Es la forma mas cara de
estar equivocado, porque no se nota.

*Metrica:* la cadena ``// Version: X.Y.Z`` que el payload del ejecutable
declara, contra los directorios con forma de version bajo la raiz del corpus.
*Ciega a:* que el contenido del directorio corresponda de verdad a esa
version — mide que el directorio EXISTA, no que sea fiel. Un directorio con el
nombre correcto y el contenido de otro build pasa. La fidelidad la garantiza
el guard de re-extraccion, que es otro instrumento.
"""
import argparse
import pathlib
import re
import shutil
import subprocess
import sys

EXIT_OK = 0
EXIT_ATRASADO = 1
EXIT_GUARD = 2

RAIZ_DEFECTO = pathlib.Path(__file__).resolve().parents[2] / '_references' / 'claude-code-bin'
RE_VERSION = re.compile(r'// Version: (\d+\.\d+\.\d+)')
RE_DIR_VERSION = re.compile(r'^(\d+\.\d+\.\d+)')


def ejecutable(ruta_declarada: str | None) -> pathlib.Path | None:
    """El binario a medir: el declarado, o el que resuelve ``claude`` en PATH."""
    if ruta_declarada:
        p = pathlib.Path(ruta_declarada)
        return p.resolve() if p.exists() else None
    hallado = shutil.which('claude')
    return pathlib.Path(hallado).resolve() if hallado else None


def version_viva(binario: pathlib.Path) -> str | None:
    """La version que el payload declara.

    Se lee con ``grep -ao`` sobre el binario y no cargandolo en memoria: el
    ejecutable pesa cientos de MB y aqui solo hace falta una cadena.
    """
    try:
        salida = subprocess.run(
            ['grep', '-ao', r'// Version: [0-9]\+\.[0-9]\+\.[0-9]\+', str(binario)],
            capture_output=True, text=True, check=False,
        ).stdout
    except OSError:
        return None
    versiones = {m.group(1) for m in RE_VERSION.finditer(salida)}
    if len(versiones) != 1:
        # Cero o varias: no se elige una. Un corpus comparado contra una
        # version adivinada es peor que uno sin comparar.
        return None
    return versiones.pop()


def versiones_extraidas(raiz: pathlib.Path) -> set[str]:
    """Las versiones presentes en el corpus.

    ``2.1.246-nombrado`` cuenta como ``2.1.246``: es una vista derivada del
    mismo build, no un build aparte.
    """
    if not raiz.is_dir():
        return set()
    hallazgos = set()
    for hijo in raiz.iterdir():
        if not hijo.is_dir():
            continue
        m = RE_DIR_VERSION.match(hijo.name)
        if m:
            hallazgos.add(m.group(1))
    return hallazgos


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--raiz', default=str(RAIZ_DEFECTO),
                        help='raiz del corpus (default: _references/claude-code-bin)')
    parser.add_argument('--binario', default=None,
                        help='ejecutable a medir (default: el `claude` del PATH)')
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si el corpus esta atrasado')
    args = parser.parse_args(argv)

    binario = ejecutable(args.binario)
    if binario is None or not binario.is_file():
        print('ERROR — no se encontro el ejecutable a medir. NO se emite un '
              'veredicto: un «al dia» sin binario contra el que comparar seria '
              'un verde que no discrimina.', file=sys.stderr)
        return EXIT_GUARD

    viva = version_viva(binario)
    if viva is None:
        print(f'ERROR — {binario} no declara una unica `// Version: X.Y.Z`. '
              'NO se emite veredicto.', file=sys.stderr)
        return EXIT_GUARD

    raiz = pathlib.Path(args.raiz)
    extraidas = versiones_extraidas(raiz)

    if viva in extraidas:
        print(f'corpus al dia — el ejecutable sirve {viva} y el corpus lo tiene '
              f'(versiones extraidas: {", ".join(sorted(extraidas)) or "ninguna"})')
        return EXIT_OK

    print(f'CORPUS ATRASADO — el ejecutable sirve **{viva}** y el corpus NO la tiene.')
    print(f'  raiz            : {raiz}')
    print(f'  versiones en el corpus: {", ".join(sorted(extraidas)) or "ninguna"}')
    print(f'  binario medido  : {binario}')
    print('  Para ponerlo al dia, sin pisar lo extraido:')
    print('    python3 .claude/eventos/extraer-binario-*/sondas/'
          'extraer_modulos_del_binario.py')
    return EXIT_ATRASADO if args.strict else EXIT_OK


if __name__ == '__main__':
    sys.exit(main())
