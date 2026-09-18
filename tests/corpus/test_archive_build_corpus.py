#!/usr/bin/env python3
"""El corpus de builds crece sin techo y el disco no.

Mitad ROJA. `_references/claude-code-bin/` acumula una build por extraccion y
ninguna se retira nunca. Medido al abrir TASK-THYROX-0160: 737 MB sobre un
disco con 2.2 GB libres (95 % ocupado), que es la misma condicion que ya mato
un `git gc` (TASK-THYROX-0044).

El eje que decide el formato NO es el contenedor sino si el archivado es
SOLIDO. Medido sobre el `bunfs-root` de 2.1.274, 1800 archivos:

    tar.xz -9e solido     11 434 984 B   3.59x   20 s
    7z -t7z -mx9 solido   11 404 233 B   3.60x   10 s
    7z por archivo        14 992 823 B   2.74x    6 s

Por archivo pierde 31 %: cada contenedor arranca su diccionario de cero, asi
que la redundancia entre los chunks del mismo minificador no se aprovecha.
`.7z` solido empata a `tar.xz` en tamano con la mitad del tiempo, y de ahi la
eleccion — no de una preferencia por el formato.

*Metrica:* el reparto que `select_for_archive` devuelve para un arbol de sonda,
y la verificacion de integridad que `archive_build` exige antes de declarar
exito.
*Ciega a:* el cociente real de compresion (lo fija el contenido, no este
control); a si `7z` esta instalado en la maquina donde corra el guion — eso lo
declara el propio guion al rehusar; y a lo que pase con el crudo tras archivar,
que es responsabilidad del llamador y se mide en su propio caso.

CONTROL DE ANULACION, medido — no declarado de antemano. La primera version
de esta nota decia «cae el caso 4 —y solo ese—», y es FALSO: al anular
`verify_archive` (siempre True, conservando firma y campo `verified`) cae
**una** asercion de cuatro, la del archivo corrompido. Las otras tres del caso
4 sobreviven, y tienen que sobrevivir: comprueban que el archivo existe, que
la columna `verified` se publica y que el sha256 tiene 64 caracteres — ninguna
de las tres depende de que la verificacion sea real.

Esa asercion es la unica que discrimina «comprobo» de «devolvio True», y por
eso es la que sostiene el caso. Escribir la anulacion antes de correrla es el
sub-patron D aplicado al propio control: se declaro lo que se esperaba en vez
de lo que pasa.
"""
from __future__ import annotations

import importlib.util
import pathlib
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE / "src"))

spec = importlib.util.spec_from_file_location(
    "archive_build_corpus", HERE / "src" / "corpus" / "archive_build_corpus.py")
module = importlib.util.module_from_spec(spec)
sys.modules["archive_build_corpus"] = module
spec.loader.exec_module(module)

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def build_probe_root(base: pathlib.Path, names) -> pathlib.Path:
    """Un corpus de sonda: un directorio por build, con contenido repetido.

    El contenido se repite A PROPOSITO entre archivos: es lo que hace medible
    la diferencia entre solido y por archivo, y sin el la sonda no se parece
    al sujeto real (1800 chunks del mismo minificador).
    """
    root = base / "claude-code-bin"
    root.mkdir(parents=True, exist_ok=True)
    for name in names:
        directory = root / name
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "MANIFEST.tsv").write_text("ruta\tbytes\n", encoding="utf-8")
        for index in range(3):
            (directory / f"chunk-{index}.js").write_text(
                "export const value = 1;\n" * 200, encoding="utf-8")
    return root


with tempfile.TemporaryDirectory() as tmp:
    probe = build_probe_root(pathlib.Path(tmp), [
        "2.1.241", "2.1.246", "2.1.246-nombrado", "2.1.250",
        "2.1.263", "2.1.266", "2.1.274",
    ])

    print("== 1. quedarse con las ultimas N versiones base ==")
    plan = module.select_for_archive(probe, keep=3)
    check("las tres ultimas se conservan en crudo",
          ["2.1.263", "2.1.266", "2.1.274"], [e.name for e in plan.kept])
    check("el resto se archiva",
          ["2.1.241", "2.1.246", "2.1.246-nombrado", "2.1.250"],
          [e.name for e in plan.to_archive])

    print("== 2. una variante sigue la suerte de su version base ==")
    # `2.1.246-nombrado` es una VISTA DERIVADA de 2.1.246, no un build aparte:
    # el mismo criterio que `list_corpus_builds` ya declara. Asi que no cuenta
    # como una de las N, y se archiva bajo su nombre literal.
    check("la variante no consume un hueco de los N", True,
          "2.1.246-nombrado" not in [e.name for e in plan.kept])
    check("y se archiva con su nombre literal, no con el de su base", True,
          "2.1.246-nombrado" in [e.name for e in plan.to_archive])

    print("== 3. idempotente: con keep >= builds no hay nada que archivar ==")
    holgado = module.select_for_archive(probe, keep=99)
    check("nada que archivar", [], [e.name for e in holgado.to_archive])
    check("y todo se conserva", 7, len(holgado.kept))

    print("== 4. no se declara archivado sin verificar la integridad ==")
    if shutil.which("7z") is None:
        print("  OMITIDO  7z ausente — el guion rehusa, no publica un cero")
    else:
        destino = pathlib.Path(tmp) / "_archived"
        resultado = module.archive_build(probe / "2.1.241", destino)
        check("el archivo existe", True, resultado.archive_path.exists())
        check("la integridad se verifico", True, resultado.verified)
        check("y publica el sha256 de lo que escribio", 64,
              len(resultado.sha256))
        # El control positivo del rehuse: se corrompe el archivo y la misma
        # verificacion tiene que FALLAR. Sin esto, `verified=True` no
        # distingue «comprobo» de «devolvio True».
        with open(resultado.archive_path, "r+b") as handle:
            handle.seek(max(0, resultado.archive_bytes // 2))
            handle.write(b"\x00" * 64)
        check("un archivo corrupto NO pasa la verificacion", False,
              module.verify_archive(resultado.archive_path))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
