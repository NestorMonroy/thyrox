#!/usr/bin/env python3
"""Un número = un hallazgo = un ``.rst``: la suite de ``check_finding_id_unique``.

El gate mide las DOS caras del mismo invariante, y cada una tiene su anulación:

**A — el store es índice, no segunda fuente.** Una fila de ``findings_history``
cuyo ``finding_id`` no tiene ``.rst`` en el árbol del consumidor es deuda: el
hallazgo se registró y nunca se escribió donde gobierna. Medido al abrirlo:
``H-THYROX-24``, ``-25`` y ``-26`` vivían sólo como fila, y el resto del corpus
daba **cero** huérfanos en los otros cinco prefijos — o sea que el árbol ya era
la fuente de facto y nadie lo había declarado.

**B — el relleno no crea un número nuevo.** ``H-THYROX-1`` y ``H-THYROX-01`` son
archivos distintos con hallazgos distintos, y el acuñador colapsa los dos a
``int(1)``: ve un número donde hay dos hallazgos. Es su ceguera por
construcción, no un olvido — ``_ID_RE`` normaliza a entero a propósito, porque
el árbol escribe las dos formas.

Precondición verificada por conducta, no por docstring: el gate no escribe en el
árbol. Se comprueba con la huella antes y después (caso 8).
"""
from __future__ import annotations

import hashlib
import os
import pathlib
import sqlite3
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = next((p for p in HERE.parents if (p / "src" / "paths" / "reach.py").is_file()), None)
if ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {HERE}")

GATE = ROOT / "src/verify/check_finding_id_unique.py"
PREFIX = "TESTUNI"

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}" + (f" — {extra}" if extra else ""))


def make_store(path: pathlib.Path, finding_ids: list[str]) -> None:
    """Un store mínimo con la tabla que el gate lee y nada más."""
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute("""CREATE TABLE findings_history (
        finding_id TEXT NOT NULL UNIQUE, submodule TEXT, initiative TEXT,
        summary TEXT, content TEXT)""")
    conn.executemany(
        "INSERT INTO findings_history VALUES (?,'thyrox','x','s','c')",
        [(f,) for f in finding_ids])
    conn.commit()
    conn.close()


def make_finding(tree: pathlib.Path, finding_id: str, slug: str,
                 submodule: str = "thyrox") -> pathlib.Path:
    """Un hallazgo en la forma real del corpus: ruta, nombre y etiqueta."""
    home = (tree / "source/gestion/pm" / submodule
            / "iniciativas/una-iniciativa/hallazgos")
    home.mkdir(parents=True, exist_ok=True)
    target = home / f"hallazgo-{finding_id}-{slug}.rst"
    target.write_text(
        f".. meta::\n   :submodulo: {submodule}\n\n"
        f".. _{finding_id.lower()}:\n\n{finding_id} — {slug}\n",
        encoding="utf-8")
    return target


def run_gate(tree: pathlib.Path, store: pathlib.Path, *flags: str,
             baseline: pathlib.Path | None = None) -> subprocess.CompletedProcess:
    """Invoca el gate con el cwd en el consumidor, como lo hace su hermano."""
    env = dict(os.environ)
    env["FINDING_ID_UNIQUE_BASELINE"] = str(
        baseline if baseline is not None else tree / "baseline-vacio.txt")
    env["THYROX_AGENT_STORE"] = str(store)
    if baseline is None:
        (tree / "baseline-vacio.txt").write_text("", encoding="utf-8")
    return subprocess.run([sys.executable, str(GATE), *flags],
                          capture_output=True, text=True, cwd=str(tree), env=env)


def tree_fingerprint(root: pathlib.Path) -> dict[str, str]:
    """Ruta -> sha256 del árbol, para medir escritura por conducta."""
    skip = {".git", "node_modules", "__pycache__", ".venv"}
    out: dict[str, str] = {}
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip]
        for name in files:
            path = pathlib.Path(base) / name
            try:
                out[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
            except OSError:
                pass
    return out


# --- A. el store es índice, no segunda fuente --------------------------------

def test_a_row_without_its_rst_is_reported(tree: pathlib.Path) -> None:
    """El caso central de la mitad A: la fila existe y el ``.rst`` no."""
    store = tree / "store.sqlite3"
    make_store(store, [f"H-{PREFIX}-40"])
    result = run_gate(tree, store)
    check("la fila sin .rst se reporta", f"H-{PREFIX}-40" in result.stdout,
          result.stdout[-200:])
    check("y --strict sale 1", run_gate(tree, store, "--strict").returncode == 1)


def test_a_row_with_its_rst_is_silent(tree: pathlib.Path) -> None:
    """El control que impide que la mitad A marque todo: con .rst, calla."""
    store = tree / "store.sqlite3"
    make_store(store, [f"H-{PREFIX}-41"])
    make_finding(tree, f"H-{PREFIX}-41", "tiene-su-archivo")
    result = run_gate(tree, store)
    check("la fila CON .rst no se reporta", f"H-{PREFIX}-41" not in result.stdout,
          result.stdout[-200:])


# --- B. el relleno no crea un número nuevo -----------------------------------

def test_b_padding_pair_is_reported(tree: pathlib.Path) -> None:
    """Dos hallazgos distintos bajo el mismo entero: la ceguera del acuñador."""
    store = tree / "store.sqlite3"
    make_store(store, [])
    make_finding(tree, f"H-{PREFIX}-5", "el-primero")
    make_finding(tree, f"H-{PREFIX}-05", "el-segundo-con-relleno")
    result = run_gate(tree, store)
    check("el par 5/05 se reporta como colisión",
          "el-segundo-con-relleno" in result.stdout, result.stdout[-260:])


def test_b_distinct_numbers_are_silent(tree: pathlib.Path) -> None:
    """El control de la mitad B: números distintos no son colisión."""
    store = tree / "store.sqlite3"
    make_store(store, [])
    make_finding(tree, f"H-{PREFIX}-6", "uno")
    make_finding(tree, f"H-{PREFIX}-7", "otro")
    # El conteo, no la palabra: la linea `OK: ... 0 colision(es)` contiene el
    # literal, asi que buscarlo no discrimina «no hay» de «hay». Sub-patron D
    # cometido en este mismo control y corregido al medirlo.
    result = run_gate(tree, store, "--quiet")
    check("6 y 7 no son colisión", result.stdout.strip() == "0",
          f"--quiet dio {result.stdout.strip()!r}")


# --- el baseline congela la deuda heredada -----------------------------------

def test_baseline_freezes_inherited_debt(tree: pathlib.Path) -> None:
    """Una entrada congelada no bloquea; el denominador sigue publicándose."""
    store = tree / "store.sqlite3"
    make_store(store, [f"H-{PREFIX}-42"])
    baseline = tree / "congelado.txt"
    baseline.write_text(f"H-{PREFIX}-42\n", encoding="utf-8")
    result = run_gate(tree, store, "--strict", baseline=baseline)
    check("la entrada congelada no bloquea", result.returncode == 0,
          f"exit={result.returncode} {result.stdout[-200:]}")
    check("y el denominador se publica igual",
          "alcance medido" in result.stdout, result.stdout[-200:])


def test_the_gate_refuses_without_a_baseline(tree: pathlib.Path) -> None:
    """Sin baseline el gate REHÚSA, no publica un cero.

    Un cero sin baseline no distingue «no hay deuda» de «no encontré el
    parámetro» — el sub-patrón D, que su gate hermano ya midió (h-docs-1107).
    """
    store = tree / "store.sqlite3"
    make_store(store, [])
    env = dict(os.environ)
    env["FINDING_ID_UNIQUE_BASELINE"] = str(tree / "no-existe.txt")
    env["THYROX_AGENT_STORE"] = str(store)
    result = subprocess.run([sys.executable, str(GATE)],
                            capture_output=True, text=True, cwd=str(tree), env=env)
    check("rehúsa con exit 2", result.returncode == 2,
          f"exit={result.returncode}")
    check("y no emite ningún conteo", "alcance medido" not in result.stdout,
          result.stdout[-160:])


# --- control positivo REAL del repo ------------------------------------------

def test_the_real_padding_collisions_are_seen() -> None:
    """El positivo conocido del corpus, no uno fabricado.

    ``hallazgo-abierto-genera-sucesor.md`` lo exige tras ocho ceros falsos: un
    gate probado sólo contra un incumplidor que escribió su propio autor hereda
    su encuadre. Los tres pares de THYROX existen en kaupamex-docs y el gate
    tiene que verlos.
    """
    sys.path.insert(0, str(ROOT / "src"))
    from paths import reach
    consumer = reach.root("docs")
    with tempfile.TemporaryDirectory() as tmp:
        # Baseline VACIO y temporal: el caso mide el corpus real en modo
        # reporte, no escribe el baseline versionado del consumidor. Un test
        # que muta el arbol que mide deja de ser una lectura.
        empty = pathlib.Path(tmp) / "vacio.txt"
        empty.write_text("", encoding="utf-8")
        env = dict(os.environ)
        env["FINDING_ID_UNIQUE_BASELINE"] = str(empty)
        result = subprocess.run([sys.executable, str(GATE)],
                                capture_output=True, text=True,
                                cwd=str(consumer), env=env)
    # Linea exacta, no subcadena: `H-THYROX-2` esta DENTRO de `H-THYROX-24`, y
    # con `in` el caso pasaba viendo una sola. Medido al anular la mitad B.
    reported = {line.strip() for line in result.stdout.splitlines()}
    seen = [n for n in ("H-THYROX-1", "H-THYROX-2", "H-THYROX-3") if n in reported]
    check("el gate ve los 3 pares de relleno reales del corpus",
          len(seen) == 3, f"vistos={seen} :: {result.stdout[-300:]}")


def test_the_gate_does_not_write_to_the_tree() -> None:
    """ERR-066: invocar un módulo para probarlo no es leerlo."""
    before = tree_fingerprint(ROOT)
    with tempfile.TemporaryDirectory() as tmp:
        tree = pathlib.Path(tmp)
        store = tree / "store.sqlite3"
        make_store(store, [f"H-{PREFIX}-99"])
        run_gate(tree, store)
    after = tree_fingerprint(ROOT)
    added = sorted(set(after) - set(before))
    changed = sorted(k for k in set(before) & set(after) if before[k] != after[k])
    check("no aparecen archivos nuevos en el árbol", not added, str(added[:3]))
    check("no cambia ningún archivo del árbol", not changed, str(changed[:3]))


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)
        for name in ("a", "b", "c", "d", "e", "f"):
            (base / name).mkdir()
        test_a_row_without_its_rst_is_reported(base / "a")
        test_a_row_with_its_rst_is_silent(base / "b")
        test_b_padding_pair_is_reported(base / "c")
        test_b_distinct_numbers_are_silent(base / "d")
        test_baseline_freezes_inherited_debt(base / "e")
        test_the_gate_refuses_without_a_baseline(base / "f")
    test_the_real_padding_collisions_are_seen()
    test_the_gate_does_not_write_to_the_tree()
    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: check_finding_id_unique, sus dos mitades)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
