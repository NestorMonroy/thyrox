#!/usr/bin/env python3
"""Suite de `src/verify/tsc_reflect.py`: la memoria entre intentos del lazo
tsc cero (Reflexion, Shinn et al. 2023; lectura 11 de Berkeley LLM Agents).

Mide cuatro cosas:
  1. `revealed` saca del log del lote SÓLO los diagnósticos que el «antes»
     no tenía (y con su multiplicidad);
  2. `add` escribe la reflexión con su lección y lo que el paso destapó;
  3. `recall` devuelve las reflexiones que tocan los archivos pedidos y
     NINGUNA de otros archivos — el control de anulación del filtro;
  4. `recall` también devuelve las recetas: pasos aceptados cuyo asunto de
     commit sirve para repetir el arreglo en otro sitio (memoria de
     habilidades, al modo de Voyager).
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from verify import tsc_reflect as reflect

FAILURES: list[str] = []


def assert_equal(name: str, expected, obtained) -> None:
    if expected == obtained:
        print(f"  ok   {name}")
    else:
        FAILURES.append(name)
        print(f"  FAIL {name}\n       esperado: {expected!r}\n       obtenido: {obtained!r}")


BEFORE = [
    "src/a.ts(1,1): error TS2339: Property 'x' does not exist on type 'Y'.",
    "src/b.ts(2,2): error TS18046: 'v' is of type 'unknown'.",
]
BATCH = [
    "src/a.ts(1,1): error TS2339: Property 'x' does not exist on type 'Y'.",
    "src/a.ts(9,9): error TS18048: 'm.c' is possibly 'undefined'.",
    "src/a.ts(10,9): error TS18048: 'm.c' is possibly 'undefined'.",
    "  continuation line that is not a diagnostic",
]


def main() -> int:
    print("revealed")
    assert_equal("sólo lo nuevo, con multiplicidad",
                 ["src/a.ts: TS18048: 'm.c' is possibly 'undefined'."] * 2,
                 reflect.revealed(BEFORE, BATCH))
    assert_equal("sin nuevo, vacío", [], reflect.revealed(BEFORE, BEFORE))

    with tempfile.TemporaryDirectory() as tmp:
        run = Path(tmp)
        (run / "ledger.jsonl").write_text("\n".join(json.dumps(r) for r in [
            {"proposal_id": "agent:alias", "proposer": "agent", "outcome": "accepted-net"},
            {"proposal_id": "agent:progress", "proposer": "agent", "outcome": "partial"},
        ]) + "\n")
        step = run / "step-002"
        step.mkdir()
        (step / "commit.txt").write_text("Point the local aliases at the canonical type\n\nbody\n")
        (step / "report.json").write_text(json.dumps(
            {"accepted": ["agent:alias"], "files_kept": ["src/a.ts"]}))

        print("add")
        row = reflect.add(run, "agent:progress", ["src/a.ts"], "El tipo destapa guardas en a.ts.",
                          BEFORE, BATCH)
        assert_equal("lleva la lección", "El tipo destapa guardas en a.ts.", row["lesson"])
        assert_equal("lleva el veredicto del registro", "partial", row["outcome"])
        assert_equal("lleva lo destapado", 2, len(row["revealed"]))
        reflect.add(run, "agent:other", ["src/zzz.ts"], "Otra cosa.", BEFORE, BEFORE)
        assert_equal("persiste una fila por reflexión", 2,
                     len((run / "reflections.jsonl").read_text().splitlines()))
        try:
            reflect.add(run, "agent:progress", ["src/a.ts"], "  ", BEFORE, BATCH)
            assert_equal("rehúsa una lección vacía", True, False)
        except ValueError:
            assert_equal("rehúsa una lección vacía", True, True)

        print("recall")
        memory = reflect.recall(run, ["src/a.ts"])
        assert_equal("reflexiones de ese archivo",
                     ["agent:progress"], [r["proposal_id"] for r in memory["reflections"]])
        assert_equal("recetas de ese archivo",
                     ["Point the local aliases at the canonical type"],
                     [r["subject"] for r in memory["recipes"]])
        assert_equal("archivo ajeno, sin memoria", {"reflections": [], "recipes": []},
                     reflect.recall(run, ["src/nada.ts"]))

        # Paso 4 del plan: los patrones de `tsc_sweep` se indexan por SEÑAL.
        # La propuesta nombra dónde sigue viva una señal aprendida FUERA de
        # sus archivos, para aplicarla en bloque en vez de un paso por archivo.
        print("pending_outside")
        (run / "patterns.jsonl").write_text(json.dumps(
            {"name": "unknown-v", "signal": "TS18046", "fix": "f", "site": "", "replace": "",
             "include": "", "exclude": [], "applied": []}) + "\n" + json.dumps(
            {"name": "ghost", "signal": "TS9999", "fix": "f", "site": "", "replace": "",
             "include": "", "exclude": [], "applied": []}) + "\n")
        log = BEFORE + BATCH + ["src/c.ts(1,1): error TS18046: 'w' is of type 'unknown'.",
                                "src/c.ts(2,1): error TS18046: 'q' is of type 'unknown'."]
        assert_equal("señal viva fuera de la candidata, con multiplicidad; la ausente no aparece",
                     {"unknown-v": {"src/b.ts": 1, "src/c.ts": 2}},
                     reflect.pending_outside(run, log, ["src/a.ts"]))
        assert_equal("con todos sus archivos en la candidata, nada pendiente", {},
                     reflect.pending_outside(run, log, ["src/a.ts", "src/b.ts", "src/c.ts"]))
        assert_equal("sin memoria de patrones, nada pendiente", {},
                     reflect.pending_outside(run / "nada", log, ["src/a.ts"]))

    print(f"\n{'FALLAN ' + str(len(FAILURES)) if FAILURES else 'todas pasan'}")
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
