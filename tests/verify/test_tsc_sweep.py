#!/usr/bin/env python3
"""Suite de `src/verify/tsc_sweep.py`: la aplicación proactiva de un patrón
aprendido (plan v2, paso 4) sobre todo el código, sin esperar a que el
verificador señale cada sitio.

Mide:
  1. `sites` encuentra los archivos donde la regla de sustitución cambia algo,
     SIN los ya aplicados, SIN los excluidos y SÓLO bajo `include` — cada
     filtro con su control de anulación;
  2. `propose` en grupo da UNA propuesta con todos los sitios y objetivos
     globales (los diagnósticos que casan la señal), con ediciones que
     reproducen la sustitución sobre la base;
  3. `propose --split` da una propuesta por archivo;
  4. sin sitios o sin objetivos, rehúsa (un barrido sin señal no aporta:
     lección del paso 13);
  5. `applied` registra los archivos y el siguiente barrido ya no los toca.
"""
from __future__ import annotations

import hashlib
import subprocess
import sys
import tempfile
from pathlib import Path

from verify import tsc_sweep as sweep

FAILURES: list[str] = []


def assert_equal(name: str, expected, obtained) -> None:
    if expected == obtained:
        print(f"  ok   {name}")
    else:
        FAILURES.append(name)
        print(f"  FAIL {name}\n       esperado: {expected!r}\n       obtenido: {obtained!r}")


def apply(text: str, edits: list[dict]) -> str:
    for e in sorted(edits, key=lambda e: -e["start"]):
        text = text[: e["start"]] + e["newText"] + text[e["start"] + e["length"]:]
    return text


ALIAS = "type AppState = unknown\nexport const x = 1\n"
FIXED = "type AppState = import('@c/state.js').AppState\nexport const x = 1\n"
BEFORE = [
    "pkg/a/src/one.ts(3,1): error TS18046: 'prev' is of type 'unknown'.",
    "pkg/b/src/use.ts(8,2): error TS18046: 'prev' is of type 'unknown'.",
    "pkg/b/src/use.ts(9,2): error TS2339: Property 'q' does not exist on type 'R'.",
]
PATTERN = {
    "name": "local-appstate",
    "signal": r"TS18046: 'prev' is of type 'unknown'",
    "site": r"^type AppState = (unknown|any)$",
    "replace": "type AppState = import('@c/state.js').AppState",
    "fix": "El alias local de AppState apunta al canónico.",
    "include": r"^pkg/",
    "exclude": [],
}


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        for rel, text in {
            "pkg/a/src/one.ts": ALIAS,
            "pkg/a/src/two.ts": ALIAS.replace("unknown", "any"),
            "pkg/a/src/done.ts": ALIAS,
            "pkg/a/src/skip.ts": ALIAS,
            "pkg/a/src/clean.ts": FIXED,
            "other/three.ts": ALIAS,
        }.items():
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(text)
        subprocess.run(["git", "add", "."], cwd=root, check=True)
        run = root / "run"
        run.mkdir()
        sweep.add_pattern(run, {**PATTERN, "exclude": ["pkg/a/src/skip.ts"]})
        sweep.mark_applied(run, "local-appstate", ["pkg/a/src/done.ts"])
        pattern = sweep.load_patterns(run)["local-appstate"]

        print("sites")
        found = [f for f, _ in sweep.sites(root, pattern)]
        assert_equal("sólo los sitios pendientes bajo include",
                     ["pkg/a/src/one.ts", "pkg/a/src/two.ts"], found)

        print("propose (grupo)")
        rows = sweep.propose(root, pattern, BEFORE, split=False)
        assert_equal("una sola propuesta", 1, len(rows))
        row = rows[0]
        assert_equal("id y proponente del patrón", ("pattern:local-appstate", "pattern:local-appstate"),
                     (row["proposal_id"], row["proposer"]))
        assert_equal("archivos del grupo", ["pkg/a/src/one.ts", "pkg/a/src/two.ts"], row["files"])
        assert_equal("objetivos globales de la señal",
                     ["pkg/a/src/one.ts: TS18046: 'prev' is of type 'unknown'.",
                      "pkg/b/src/use.ts: TS18046: 'prev' is of type 'unknown'."], row["targets"])
        edits = [e for e in row["edits"] if e["file"] == "pkg/a/src/two.ts"]
        assert_equal("la edición reproduce la sustitución", FIXED,
                     apply((root / "pkg/a/src/two.ts").read_text(), edits))
        assert_equal("la base es el texto actual",
                     hashlib.sha256(ALIAS.encode()).hexdigest(), row["bases"]["pkg/a/src/one.ts"])
        assert_equal("no escribe en el árbol", ALIAS, (root / "pkg/a/src/one.ts").read_text())

        print("propose --split")
        split = sweep.propose(root, pattern, BEFORE, split=True)
        assert_equal("una propuesta por archivo",
                     ["pattern:local-appstate:pkg/a/src/one.ts", "pattern:local-appstate:pkg/a/src/two.ts"],
                     [r["proposal_id"] for r in split])

        print("rehúsa")
        try:
            sweep.propose(root, pattern, [BEFORE[2]], split=False)
            assert_equal("sin objetivos rehúsa", "ValueError", "nada")
        except ValueError:
            assert_equal("sin objetivos rehúsa", "ValueError", "ValueError")

        print("applied")
        sweep.mark_applied(run, "local-appstate", ["pkg/a/src/one.ts", "pkg/a/src/two.ts"])
        pattern = sweep.load_patterns(run)["local-appstate"]
        assert_equal("los aplicados salen del barrido", [], sweep.sites(root, pattern))
        try:
            sweep.propose(root, pattern, BEFORE, split=False)
            assert_equal("sin sitios rehúsa", "ValueError", "nada")
        except ValueError:
            assert_equal("sin sitios rehúsa", "ValueError", "ValueError")

        # Un patrón cuyo arreglo exige juicio (no una sustitución por línea)
        # también es memoria: se guarda sin `site`/`replace`, y `propose` lo
        # rehúsa nombrándolo en vez de fallar por una clave ausente.
        print("patrón no mecánico")
        judged = sweep.add_pattern(run, {"name": "union-member", "signal": "TS2367",
                                         "fix": "Declarar el miembro en la unión de origen."})
        assert_equal("se guarda sin site ni replace", ("", ""), (judged["site"], judged["replace"]))
        try:
            sweep.propose(root, judged, BEFORE, split=False)
            assert_equal("propose rehúsa lo no mecánico", "ValueError", "nada")
        except ValueError as error:
            assert_equal("propose rehúsa lo no mecánico", True, "no es mecánico" in str(error))
        try:
            sweep.add_pattern(run, {"name": "half", "signal": "x", "site": "y", "fix": "z"})
            assert_equal("site sin replace rehúsa", "ValueError", "nada")
        except ValueError:
            assert_equal("site sin replace rehúsa", "ValueError", "ValueError")

    print(f"\n{'FALLAN ' + str(len(FAILURES)) if FAILURES else 'todas pasan'}")
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
