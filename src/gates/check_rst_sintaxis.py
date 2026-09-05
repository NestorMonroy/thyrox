#!/usr/bin/env python3
"""Gate #13 — sintaxis RST verificada con el motor REAL de Sphinx.

Origen: corrección del ejecutor 2026-08-13 — *"¿por qué sale
``Unknown interpreted text role "ref"`` y no lo corriges? se supone que no lo
debes de dejar pasar"*.

El defecto que corrige
----------------------

Al validar tres archivos de un PR se usó ``docutils`` pelado y salieron 68
mensajes. Se declararon **ruido de Sphinx** y se filtraron con una lista de
cadenas escrita a mano (``Unknown interpreted text role "ref"``,
``Unknown directive type "toctree"``, …), publicando **"0 errores reales"**.

Eso es un instrumento que confirma su propio encuadre: un archivo con un rol
mal escrito, una directiva inventada y un subrayado corto pasa el filtro
igual, porque sus mensajes empiezan por las mismas cadenas. Medido con un
control negativo de cuatro defectos sembrados: el filtro dijo **OK**.

Es la forma que ``hallazgo-abierto-genera-sucesor.md`` ya tiene catalogada —
*"implementar un subconjunto de las formas que la regla enumera"* y
*"un conteo sin denominador no es un resultado"* — aplicada al validador de
sintaxis en vez de al de sucesores.

Cómo mide (las tres piezas que hacían falta)
--------------------------------------------

Se leyeron los binarios de Sphinx 8.2.3 instalados en ``.venv``. Parsear con
Sphinx de verdad exige tres cosas que el parse pelado no tiene:

1. ``docutils_namespace()`` + una app ``Sphinx`` real — registra los roles y
   directivas de Sphinx **y de las extensiones de conf.py** (sphinx-design,
   sphinx-tabs, plantuml). Sin esto ``:ref:`` es un rol desconocido.
   (``sphinx/util/docutils.py:73``)
2. ``env.find_files()`` + ``sphinx_domains(env)`` — puebla ``found_docs`` y
   enruta los dominios. Sin esto ``toctree`` revienta con ``KeyError`` sobre
   su propio docname. (``sphinx/util/docutils.py:285``)
3. ``LoggingReporter`` en el documento — es lo que hace el lector real en
   ``sphinx/io.py:85``. Sin esto los ``system_message`` de docutils **no
   llegan** al canal de avisos de Sphinx, y el gate ve sólo los avisos que
   emiten las directivas por logger. Medido: con las piezas 1-2 pero sin la
   3, el control negativo pasaba de 4 defectos a 1 detectado.

Métrica: mensajes WARNING/ERROR/SEVERE que Sphinx emite al parsear cada
archivo, sin filtro de contenido de ninguna clase.

Ciega a: lo que sólo aparece en la fase de **resolución** del build — un
``:ref:`` cuya etiqueta no existe (eso es ``check_rst_referencias.py``), y
un ``:doc:`` roto (tarea #166). Este gate valida que el archivo **parsee**,
no que sus referencias resuelvan. Los tres gates son complementarios.

Uso
---

    python3 .claude/scripts/gates/check_rst_sintaxis.py            # reporte
    python3 .claude/scripts/gates/check_rst_sintaxis.py --quiet    # sólo el conteo
    python3 .claude/scripts/gates/check_rst_sintaxis.py --nuevos   # sólo lo tocado
    python3 .claude/scripts/gates/check_rst_sintaxis.py --strict   # exit 1 si falla
    python3 .claude/scripts/gates/check_rst_sintaxis.py a.rst b.rst   # archivos sueltos
"""

from __future__ import annotations

import io
import os
import pathlib
import re
import subprocess
import sys
import tempfile

RAIZ = pathlib.Path(__file__).resolve().parents[3]
FUENTE = RAIZ / 'source'
ANSI = re.compile(r'\x1b\[[0-9;]*m')


def archivos_nuevos() -> list[pathlib.Path]:
    """Los .rst que el árbol de trabajo toca frente a develop."""
    salida: set[pathlib.Path] = set()
    for cmd in (
        ['git', 'status', '--porcelain', '--untracked-files=all'],
        ['git', 'diff', '--name-only', 'origin/develop...HEAD'],
    ):
        try:
            crudo = subprocess.run(
                cmd, cwd=RAIZ, capture_output=True, text=True, check=False
            ).stdout
        except OSError:
            continue
        for linea in crudo.splitlines():
            ruta = linea[3:] if cmd[1] == 'status' else linea
            ruta = ruta.strip()
            if ruta.endswith('.rst') and ruta.startswith('source/'):
                p = RAIZ / ruta
                if p.is_file():
                    salida.add(p)
    return sorted(salida)


def _reexec_en_venv() -> None:
    """Re-lanzarse con el intérprete de .venv si Sphinx no es importable aquí.

    El audit invoca los gates con ``python3`` del sistema, donde Sphinx NO
    está instalado. Sin esto el gate reventaba con ``ModuleNotFoundError``,
    no imprimía nada, y ``${RSTS:-0}`` lo leía como **0 → PASS**: un verde
    falso, que es el defecto que este mismo gate existe para no repetir
    (H-DOCS-134). Si tampoco hay venv, el fallo es ruidoso y no silencioso.
    """
    try:
        import sphinx  # noqa: F401
        return
    except ModuleNotFoundError:
        pass

    venv = RAIZ / '.venv' / 'bin' / 'python'
    ya_reintentado = os.environ.get('_CHECK_RST_REEXEC') == '1'
    if venv.is_file() and not ya_reintentado:
        os.environ['_CHECK_RST_REEXEC'] = '1'
        os.execv(str(venv), [str(venv), str(pathlib.Path(__file__).resolve()), *sys.argv[1:]])

    print(
        'check-rst-sintaxis: ERROR — Sphinx no es importable y no hay '
        f'.venv utilizable en {RAIZ / ".venv"}. Corre `make sync`. '
        'NO se emite un conteo: un 0 aquí sería un verde falso.',
        file=sys.stderr,
    )
    sys.exit(2)


def revisar(rutas: list[pathlib.Path]) -> list[tuple[pathlib.Path, list[str]]]:
    """Parsea cada archivo con el motor real y devuelve sus mensajes."""
    from docutils.frontend import get_default_settings
    from docutils.parsers.rst import Parser
    from sphinx.application import Sphinx
    from sphinx.util.docutils import (
        LoggingReporter,
        docutils_namespace,
        new_document,
        sphinx_domains,
    )

    avisos = io.StringIO()
    fallos: list[tuple[pathlib.Path, list[str]]] = []

    with docutils_namespace(), tempfile.TemporaryDirectory() as td:
        app = Sphinx(
            srcdir=str(FUENTE),
            confdir=str(FUENTE),
            outdir=os.path.join(td, 'out'),
            doctreedir=os.path.join(td, 'dt'),
            buildername='dummy',
            status=None,
            warning=avisos,
            freshenv=True,
            # El estado de la caché de diagramas NO es un error de sintaxis.
            # Se suprime por el mecanismo de Sphinx —`is_suppressed_warning`
            # compara `type`/`subtype` (`sphinx/util/logging.py:415-426`)—
            # y NO por el texto del mensaje, que es exactamente el defecto
            # que este gate existe para no repetir. Requiere que
            # `plantuml_cached` etiquete su aviso; se le añadió en el mismo
            # pase (H-DOCS-134).
            confoverrides={'suppress_warnings': ['plantuml_cached.miss']},
        )
        app.env.find_files(app.config, app.builder)
        parser = Parser()

        with sphinx_domains(app.env):
            for ruta in rutas:
                docname = app.env.path2doc(str(ruta.resolve())) or str(ruta)
                antes = avisos.tell()

                ajustes = get_default_settings(Parser)
                ajustes.report_level = 2      # WARNING y peor
                ajustes.halt_level = 5        # nunca abortar: queremos el parte completo
                ajustes.env = app.env
                doc = new_document(str(ruta), ajustes)
                doc.reporter = LoggingReporter(str(ruta), report_level=2, halt_level=5)
                app.env.current_document.docname = docname

                try:
                    parser.parse(ruta.read_text(encoding='utf-8'), doc)
                except Exception as exc:  # noqa: BLE001 — un crash del parser ES el hallazgo
                    fallos.append((ruta, [f'EXCEPCION {type(exc).__name__}: {exc}']))
                    continue

                avisos.seek(antes)
                nuevos = ANSI.sub('', avisos.read())
                avisos.seek(0, io.SEEK_END)
                msgs = [ln for ln in nuevos.splitlines() if ln.strip()]
                if msgs:
                    fallos.append((ruta, msgs))

    return fallos


def main() -> int:
    _reexec_en_venv()
    args = [a for a in sys.argv[1:]]
    quiet = '--quiet' in args
    strict = '--strict' in args
    nuevos = '--nuevos' in args
    sueltos = [a for a in args if not a.startswith('--')]

    if sueltos:
        rutas = [pathlib.Path(a).resolve() for a in sueltos]
        alcance = 'archivos indicados'
    elif nuevos:
        rutas = archivos_nuevos()
        alcance = 'modificados frente a develop'
    else:
        rutas = sorted(FUENTE.rglob('*.rst'))
        alcance = 'todo source/'

    total_rst = sum(1 for _ in FUENTE.rglob('*.rst'))

    if not rutas:
        if not quiet:
            print('check-rst-sintaxis: 0 archivo(s) con errores de sintaxis')
            print(f'  (alcance medido: 0 de {total_rst} — {alcance}, nada que revisar)')
        else:
            print(0)
        return 0

    fallos = revisar(rutas)
    den = f'(alcance medido: {len(rutas)} de {total_rst} — {alcance})'

    if quiet:
        print(len(fallos))
        return 1 if (strict and fallos) else 0

    print(f'check-rst-sintaxis: {len(fallos)} archivo(s) con errores de sintaxis')
    print(f'  {den}')

    for ruta, msgs in fallos[:20]:
        try:
            rel = ruta.relative_to(RAIZ)
        except ValueError:
            rel = ruta
        print(f'\n{rel}')
        for m in msgs[:8]:
            print(f'  {m}')
        if len(msgs) > 8:
            print(f'  … y {len(msgs) - 8} mensaje(s) más')
    if len(fallos) > 20:
        print(f'\n… y {len(fallos) - 20} archivo(s) más')

    return 1 if (strict and fallos) else 0


if __name__ == '__main__':
    sys.exit(main())
