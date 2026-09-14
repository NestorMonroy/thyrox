#!/usr/bin/env python3
"""El idioma de las CLAVES DE MANIFIESTO — el tercer eje de la misma regla.

``identificadores-en-ingles.md`` enumera «claves de manifiesto —una clave es un
atributo—», y esa superficie no la alcanzaba nadie: el eje de identificadores
recorre AST de Python (:ref:`h-docs-1253`) y un ``manifest.json`` no pasa por
ahi. La regla nombraba una forma que ningun instrumento podia ver.

**Por que un eje aparte y NO dentro de ``checkWorkbench``.** El docstring de
``src/workbench/manifest.py`` prohibe un segundo verificador de *«que hace
conforme a un run»*, y esa prohibicion sigue intacta: el gate de conformidad
vive una sola vez, en TypeScript. El idioma de una clave es una pregunta
**ortogonal** a la conformidad — un manifiesto con las cinco claves
obligatorias y un ``tarea`` anidado es conforme y esta en espanol. Portar un
lexico de un millon de formas a TypeScript, o invocar Python desde el gate de
conformidad, crearia justamente la segunda fuente de verdad que la prohibicion
existe para impedir. El gate de nombres ya modela la forma correcta —N ejes,
un lexico— y este es su tercer hermano.

**El lexico no se copia: se carga.** Que palabra es espanola lo decide
``check_identifier_language``, el mismo criterio de los otros dos ejes. Sin el
este guion **rehusa con 2 y sin conteo**: un 0 aqui no distinguiria «no hay
claves en espanol» de «no pude medir», que es el sub-patron D de
``metrica-decide-la-conclusion.md``.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from check_identifier_language import (  # noqa: E402
    corpus_available,
    refuse_without_corpus,
    spanish_words_in,
)
from check_script_naming import _consumer_baseline  # noqa: E402
from session.job_runs import jobs_dir  # noqa: E402
from workbench.manifest import MANIFEST_FILE_NAME  # noqa: E402
from workbench.paths import workbench_dir  # noqa: E402

#: El parametro del consumidor, igual que los baselines de sus dos hermanos:
#: el PROVEEDOR entrega el mecanismo, el consumidor congela SU deuda (DEC-04).
BASELINE_VAR = "MANIFEST_LANGUAGE_BASELINE"
BASELINE_FILE = "manifest_language_baseline.txt"


def manifest_homes(root: pathlib.Path) -> list[pathlib.Path]:
    """Los hogares de manifiesto de una raiz medida: el banco y el ledger.

    Son **dos**, no uno, y el segundo se descubrio midiendo: de los 78
    manifiestos del arbol, 6 viven bajo el hogar de trabajos
    (``THYROX_JOBS_*``) y no bajo el del banco. Un universo compuesto solo con
    ``workbench_dir`` los dejaria fuera **sin emitir señal**.

    Los dos se resuelven contra la raiz que se recibe — nunca contra el cwd, que
    es el defecto que :ref:`h-docs-1251` cerro en el gate hermano.
    """
    homes: list[pathlib.Path] = []
    for resolver in (workbench_dir, jobs_dir):
        try:
            home = resolver(root)
        except Exception:
            continue
        if home.is_dir() and home not in homes:
            homes.append(home)
    return homes


def manifest_keys(data, path: tuple[str, ...] = ()):
    """Cada clave que puede ser un NOMBRE, con su ruta punteada.

    Recorre objetos y arreglos: una clave espanola anidada bajo una inglesa es
    el caso real y frecuente —``corrected_premise.afirmado_antes``—, y un
    recorrido de un solo nivel devuelve 0 sobre ese archivo.

    Solo entra la clave que ``str.isidentifier`` acepta. Un nombre de archivo
    (``anulacion-a.txt``) o una frase con parentesis son **datos**, no atributos;
    medirlos haria que el veredicto hablara de otra poblacion.
    """
    if isinstance(data, dict):
        for key, value in data.items():
            ruta = path + (key,)
            if isinstance(key, str) and key.isidentifier():
                yield key, ".".join(ruta)
            yield from manifest_keys(value, ruta)
    elif isinstance(data, list):
        for index, value in enumerate(data):
            yield from manifest_keys(value, path + (f"[{index}]",))


def baseline(measured_root=None) -> set[str]:
    """La deuda congelada del consumidor. Vacia si el archivo no existe."""
    path = _consumer_baseline(BASELINE_VAR, BASELINE_FILE, measured_root)
    if not path.is_file():
        return set()
    return {line.strip() for line in path.read_text().splitlines()
            if line.strip() and not line.startswith('#')}


def scan(root: pathlib.Path,
         frozen: set[str] | None = None) -> tuple[list[tuple[str, str]], int]:
    """(incumplidores, manifiestos medidos) de una raiz.

    Un incumplidor es ``(<ruta relativa a la raiz>, <ruta punteada de la
    clave>)``: la clave anidada queda direccionable, que es lo que permite
    congelarla una a una en vez de por archivo.

    ``frozen`` deja medir el universo CRUDO, sin el baseline del consumidor. No
    es comodidad de prueba: un control que use el baseline cambia de veredicto
    cuando el consumidor congela su deuda, o sea mide el PARAMETRO en vez del
    mecanismo. Medido al escribirlo — el control positivo paso a rojo en cuanto
    se congelaron las 100 claves de docs, sin que el mecanismo cambiara.
    """
    if frozen is None:
        frozen = baseline(root)
    offenders: list[tuple[str, str]] = []
    measured = 0
    for home in manifest_homes(root):
        for path in sorted(home.rglob(MANIFEST_FILE_NAME)):
            measured += 1
            try:
                data = json.loads(path.read_text())
            except (OSError, json.JSONDecodeError):
                # Un manifiesto ilegible es trabajo de `checkWorkbench`, que es
                # el juez de conformidad. Este eje mide idioma: no duplica ese
                # veredicto ni lo silencia — lo deja donde vive.
                continue
            try:
                rel = path.relative_to(home)
            except ValueError:                      # pragma: no cover
                rel = path
            for key, dotted in manifest_keys(data):
                if not spanish_words_in(key):
                    continue
                entry = f"{rel}::{dotted}"
                if entry not in frozen:
                    offenders.append((str(rel), dotted))
    return offenders, measured


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('root', nargs='?', default='.',
                        help='raiz medida (default: el directorio actual)')
    parser.add_argument('--quiet', action='store_true',
                        help='solo el conteo de incumplidores')
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si hay incumplidores fuera del baseline')
    parser.add_argument('--write-baseline', action='store_true',
                        help='congela lo que hay hoy; NO barre nada')
    args = parser.parse_args(argv)

    # `refuse_without_corpus` DEVUELVE 2, no sale: ignorar su retorno publica
    # un cero a ciegas. Medido al escribir este modulo — el caso 7 del control
    # lo atrapo, que es para lo que existe.
    refused = refuse_without_corpus()
    if refused is not None:
        return refused

    root = pathlib.Path(args.root).resolve()
    homes = manifest_homes(root)
    offenders, measured = scan(root)

    if args.write_baseline:
        path = _consumer_baseline(BASELINE_VAR, BASELINE_FILE, root)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('')
        lines = sorted(f'{rel}::{dotted}' for rel, dotted in offenders)
        path.write_text(
            '# Deuda heredada de claves de manifiesto en español.\n'
            '# Una entrada listada NO bloquea; una nueva SÍ. Se paga al tocar\n'
            '# el manifiesto — salvo la que sea DATO y no atributo, que se\n'
            '# queda con su razón declarada.\n'
            + ''.join(f'{line}\n' for line in lines))
        print(f'baseline escrita: {len(lines)} entrada(s) en {path}')
        return 0

    if args.quiet:
        print(len(offenders))
    else:
        for rel, dotted in offenders:
            print(f'  {rel}::{dotted}')
        print(f'check-manifest-language: {len(offenders)} clave(s) en español '
              f'(alcance medido: {measured} manifiesto(s) en {len(homes)} hogar(es) '
              f'de {root})')
    return 1 if (args.strict and offenders) else 0


if __name__ == '__main__':
    raise SystemExit(main())
