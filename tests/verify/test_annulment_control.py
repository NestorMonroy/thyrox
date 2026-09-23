#!/usr/bin/env python3
"""Suite de ``src/verify/annulment_control.py``.

El defecto que cierra (2026-09-23): cada control de anulación se hacía a mano
—``cp archivo cache/x.orig``, editar, correr la suite, ``cp`` de vuelta— y
tres cosas salían mal por construcción: la copia vivía fuera del banco y se
borró; el parche de la anulación no quedaba escrito en ninguna parte; y «el
archivo volvió igual» se afirmó sin medirlo.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from verify.annulment_control import run_annulment, run_substitution  # noqa: E402

OK = FAILED = 0


def check(name, expected, actual):
    global OK, FAILED
    if expected == actual:
        OK += 1
        print(f"  ok    {name}")
    else:
        FAILED += 1
        print(f"  FALLO {name}\n        esperado={expected!r} obtenido={actual!r}")


def read(path: Path):
    """El contenido, o ``None`` si falta: un control que ABORTA no dice qué
    aserciones dependían de la pieza anulada, así que falta un archivo se
    registra como aserción fallida y no como excepción."""
    return path.read_text() if path.exists() else None


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True,
                          capture_output=True, text=True).stdout


def make_repo(root: Path) -> Path:
    repo = root / "repo"
    repo.mkdir()
    git(repo, "init", "-q")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    (repo / "subject.py").write_text("def guard(x):\n    return x > 0\n")
    # La suite: exit 0 si la guarda rechaza el negativo.
    (repo / "suite.py").write_text(
        "from subject import guard\nimport sys\n"
        "print('rechaza-negativo', 'ok' if not guard(-1) else 'FALLA')\n"
        "sys.exit(0 if not guard(-1) else 1)\n")
    git(repo, "add", ".")
    git(repo, "commit", "-q", "-m", "seed")
    return repo


def write_patch(repo: Path, root: Path) -> Path:
    """El parche de la anulación: la guarda deja pasar todo."""
    subject = repo / "subject.py"
    original = subject.read_text()
    subject.write_text("def guard(x):\n    return True\n")
    patch = subprocess.run(["git", "-C", str(repo), "diff", "--", "subject.py"],
                           check=True, capture_output=True, text=True).stdout
    subject.write_text(original)
    path = root / "guard.patch"
    path.write_text(patch)
    return path


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    repo = make_repo(root)
    patch = write_patch(repo, root)
    bench = root / "bench"
    suite = [sys.executable, "suite.py"]

    print("== 1. sujeto commiteado: anula, mide, restaura, y lo prueba ==")
    report = run_annulment(repo, bench, "guard", repo / "subject.py", patch, suite)
    check("la suite anulada sale distinto de cero", True, report["annulled_exit"] != 0)
    check("la suite restaurada sale cero", 0, report["restored_exit"])
    check("el blob restaurado es el de partida", report["blob_before"], report["blob_after"])
    # Sin contar lo no seguido: la suite sintética es Python y deja su
    # `__pycache__/`, que no es cambio del sujeto.
    check("el árbol seguido queda sin cambios", "",
          git(repo, "status", "--porcelain", "--untracked-files=no"))
    check("el parche queda en el banco", patch.read_text(),
          read(bench / "annulled-guard.patch"))
    check("la salida anulada queda en el banco", True,
          "FALLA" in (read(bench / "annulled-guard.txt") or ""))
    check("la salida restaurada queda en el banco", True,
          "ok" in (read(bench / "restored-guard.txt") or ""))
    manifest = [json.loads(l) for l in (read(bench / "annulment.jsonl") or "").splitlines()]
    check("el manifiesto nombra el commit de partida",
          git(repo, "rev-parse", "HEAD").strip(), manifest[-1]["base_commit"] if manifest else None)
    check("sujeto commiteado: no se copia su estado de partida", False,
          (bench / "subject-before-guard.py").exists())

    print("== 2. sujeto SIN commitear: su estado de partida va al banco ==")
    (repo / "subject.py").write_text("def guard(x):\n    return x > 0  # sin commitear\n")
    patch2 = root / "guard2.patch"
    (repo / "subject.py").write_text("def guard(x):\n    return True  # sin commitear\n")
    patch2.write_text(subprocess.run(["git", "-C", str(repo), "diff", "--", "subject.py"],
                                     check=True, capture_output=True, text=True).stdout)
    # El diff contra HEAD incluye el cambio sin commitear; se reescribe contra
    # el estado de partida real para que el parche sea sólo la anulación.
    (repo / "subject.py").write_text("def guard(x):\n    return x > 0  # sin commitear\n")
    patch2.write_text(
        "--- a/subject.py\n+++ b/subject.py\n@@ -1,2 +1,2 @@\n def guard(x):\n"
        "-    return x > 0  # sin commitear\n+    return True  # sin commitear\n")
    report2 = run_annulment(repo, bench, "guard2", repo / "subject.py", patch2, suite)
    check("el estado de partida sin commitear queda en el banco",
          "def guard(x):\n    return x > 0  # sin commitear\n",
          read(bench / "subject-before-guard2.py"))
    check("y el archivo vuelve a él", "def guard(x):\n    return x > 0  # sin commitear\n",
          (repo / "subject.py").read_text())
    check("blob antes == blob después", report2["blob_before"], report2["blob_after"])

    print("== 3. un parche que no aplica rehúsa sin tocar nada ==")
    bad = root / "bad.patch"
    bad.write_text("--- a/subject.py\n+++ b/subject.py\n@@ -1,1 +1,1 @@\n-no existe\n+x\n")
    before = (repo / "subject.py").read_text()
    try:
        run_annulment(repo, bench, "bad", repo / "subject.py", bad, suite)
        outcome = "sin rehusar"
    except Exception as error:  # la CLASE es la aserción, no el hecho de fallar
        outcome = type(error).__name__
    check("rehúsa con ValueError", "ValueError", outcome)
    check("el sujeto no cambió", before, (repo / "subject.py").read_text())
    check("no deja salida de una medición que no ocurrió", False,
          (bench / "annulled-bad.txt").exists())

    print("== 4. anulación por sustitución declarada ==")
    # El episodio: el parche se generaba FUERA con un paso cuyo fallo nadie
    # comprobaba; una sustitución que no casó produjo un parche que borraba el
    # módulo entero, y la suite «cayó» por eso. La sustitución vive ahora
    # dentro de la herramienta, que rehúsa si no casa exactamente una vez.
    before = (repo / "subject.py").read_text()
    try:
        run_substitution(repo, bench, "missing", repo / "subject.py",
                         "texto que no existe", "x", suite)
        outcome = "sin rehusar"
    except Exception as error:
        outcome = type(error).__name__
    check("una sustitución que no casa rehúsa con ValueError", "ValueError", outcome)
    check("y no deja parche de una anulación que no existe", False,
          (bench / "annulled-missing.patch").exists())
    check("ni toca el sujeto", before, (repo / "subject.py").read_text())

    (repo / "subject.py").write_text("x = 1\nx = 1\n")
    try:
        run_substitution(repo, bench, "twice", repo / "subject.py", "x = 1", "x = 2", suite)
        outcome = "sin rehusar"
    except Exception as error:
        outcome = type(error).__name__
    check("una sustitución ambigua (dos casos) rehúsa", "ValueError", outcome)
    (repo / "subject.py").write_text(before)

    report5 = run_substitution(repo, bench, "subst", repo / "subject.py",
                               "return x > 0  # sin commitear", "return True", suite)
    check("la sustitución que casa anula: la suite cae", True, report5["annulled_exit"] != 0)
    check("y restaura al blob de partida", report5["blob_before"], report5["blob_after"])
    patch_text = read(bench / "annulled-subst.patch") or ""
    check("el parche compuesto sólo cambia la línea sustituida", True,
          "-    return x > 0  # sin commitear" in patch_text and "+    return True" in patch_text
          and patch_text.count("\n-") == 1)
    manifest5 = [json.loads(l) for l in (read(bench / "annulment.jsonl") or "").splitlines()]
    check("el manifiesto guarda la sustitución declarada",
          ["return x > 0  # sin commitear", "return True"],
          manifest5[-1].get("replace") if manifest5 else None)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
