#!/usr/bin/env python3
"""Pruebas de ``verify.citation_resolution`` — TASK-THYROX-0100.

Es la mitad ROJA escrita ANTES del gate (TDD): mientras
``src/verify/citation_resolution.py`` no exista, la primera asercion falla.

Que mide el sujeto, y por que hace falta uno nuevo
---------------------------------------------------
El septimo detector (``src/hooks/detect_ephemeral_citation.py``) avisa cuando
un texto cita ``board #N`` SIN una forma durable que la acompane. Mide la
FORMA. El defecto que este gate cierra esta en el REFERENTE: una cita con
forma durable perfecta —``TASK-THYROX-0445``— que no resuelve a ninguna tarea,
porque es el ordinal del board rellenado a cuatro digitos. Ante esa cadena el
detector ve forma durable y calla, asi que su verde no distingue «la cita
resuelve» de «no mire el referente»: el sub-patron D con el gate como sujeto.

Los tres controles que lo hacen real
-------------------------------------
1. **El control positivo NO se fabrica.** Es el cuerpo REAL del commit
   ``4acece94`` de este repo, leido con ``git show``, que cita
   ``TASK-THYROX-0445`` cuando la cita de ese sujeto es ``TASK-THYROX-0095``.
   Un incumplidor escrito por quien escribe el patron hereda su encuadre.
2. **El gemelo** — el mismo mensaje con la cita CORRECTA pasa. Sin el, un gate
   que marcara toda cita tambien pasaria el caso 1.
3. **La refusal** — sin store no se emite conteo. Un 0 ahi no distingue «todas
   resuelven» de «no pude medir», y el hook lee ese 0 como permiso.

El store del test es SINTETICO. El real tiene 1739 filas, esta versionado y el
gancho de reconciliacion lo reescribe al commitear: medir contra el acoplaria
la suite al estado del arbol.
"""
from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
GATE = ROOT / "src" / "verify" / "citation_resolution.py"

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLA {label}\n        esperado={expected!r} obtenido={obtained!r}")


def run(*args: str) -> subprocess.CompletedProcess:
    """Invoca el gate como lo hace el hook: por ruta, con PYTHONPATH al src."""
    environment = dict(os.environ)
    environment["PYTHONPATH"] = str(ROOT / "src")
    return subprocess.run(
        [sys.executable, str(GATE), *args],
        capture_output=True, text=True, env=environment, cwd=str(ROOT))


def build_store(path: Path, rows: list[tuple[str, str]]) -> None:
    """Un store minimo con las cinco columnas que ``mapping_from_store`` lee."""
    connection = sqlite3.connect(path)
    connection.execute(
        "CREATE TABLE tasks (session_id TEXT, task_id TEXT, citation_id TEXT,"
        " submodule TEXT, subject TEXT)")
    connection.executemany(
        "INSERT INTO tasks VALUES (?, ?, ?, ?, ?)",
        [("s1", str(index), citation, "thyrox", subject)
         for index, (citation, subject) in enumerate(rows)])
    connection.commit()
    connection.close()


# El fixture se retira AUNQUE la suite aborte: sin `finally`, un rojo a mitad
# deja el directorio plantado y esta misma suite se vuelve infractora del
# medidor de fuga de fixture.
WORK = Path(tempfile.mkdtemp())
try:
    STORE = WORK / "store.sqlite3"
    build_store(STORE, [
        ("TASK-THYROX-0095", "Dos suites verdes en serie salen rojas bajo --width 4"),
        ("TASK-THYROX-0100", "Gate de resolucion para la cita durable"),
    ])

    def write_message(name: str, text: str) -> Path:
        path = WORK / name
        path.write_text(text, encoding="utf-8")
        return path

    print("== 1. una cita que resuelve pasa, y publica el sujeto ==")
    message = write_message("bueno.txt", "Asunto\n\nCuerpo.\n\nRefs: TASK-THYROX-0095\n")
    result = run("--store", str(STORE), str(message))
    check("exit 0", 0, result.returncode)
    check("nombra el sujeto de la cita que resuelve", True,
          "Dos suites verdes" in (result.stdout + result.stderr))

    print("== 2. un mensaje SIN citas pasa, y no inventa conteo ==")
    message = write_message("sin-citas.txt", "Asunto\n\nCuerpo sin ninguna cita.\n")
    result = run("--store", str(STORE), str(message))
    check("exit 0", 0, result.returncode)

    print("== 3. CONTROL POSITIVO REAL — el cuerpo del commit 4acece94 ==")
    real = subprocess.run(
        ["git", "show", "-s", "--format=%B", "4acece94"],
        capture_output=True, text=True, cwd=str(ROOT))
    check("el commit existe en el repo (no es fabricado)", 0, real.returncode)
    check("y cita la forma que no resuelve", True, "TASK-THYROX-0445" in real.stdout)
    message = write_message("real.txt", real.stdout)
    result = run("--store", str(STORE), str(message))
    check("exit 1 ante la cita que no resuelve", 1, result.returncode)
    check("nombra la cita rota", True, "TASK-THYROX-0445" in result.stderr)

    print("== 4. EL GEMELO — el mismo mensaje con la cita correcta pasa ==")
    message = write_message("gemelo.txt",
                            real.stdout.replace("TASK-THYROX-0445", "TASK-THYROX-0095"))
    result = run("--store", str(STORE), str(message))
    check("exit 0: el gate discrimina el REFERENTE, no la mera forma", 0,
          result.returncode)

    print("== 5. las lineas de comentario de git no cuentan ==")
    # `git commit -v` mete el diff en lineas `#`, y git las descarta antes de
    # escribir el objeto: medirlas reportaria un defecto que el commit no tiene.
    message = write_message("comentado.txt",
                            "Asunto\n\nCuerpo.\n# Refs: TASK-THYROX-0445\n")
    result = run("--store", str(STORE), str(message))
    check("exit 0: la cita rota vive en un comentario", 0, result.returncode)

    print("== 6. REFUSAL — sin store no se emite conteo ==")
    result = run("--store", str(WORK / "no-existe.sqlite3"), str(message))
    check("exit 2 al rehusar", 2, result.returncode)
    check("NO emite veredicto de citas", 0,
          (result.stdout + result.stderr).count("cita(s) sin resolver"))
    check("nombra el store ausente", True, "no-existe.sqlite3" in result.stderr)

    print("== 7. REFUSAL — sin archivo de mensaje tampoco ==")
    result = run("--store", str(STORE), str(WORK / "no-hay-mensaje.txt"))
    check("exit 2 al rehusar", 2, result.returncode)

    print("== 8. --history mide el corpus, que es OTRA superficie ==")
    result = run("--store", str(STORE), "--history", "5")
    check("exit 0: medir no es juzgar", 0, result.returncode)
    check("publica su denominador", True, "alcance medido" in result.stdout)
finally:
    subprocess.run(["rm", "-rf", str(WORK)], check=False)

print(f"\nresultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
