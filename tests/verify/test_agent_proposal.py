#!/usr/bin/env python3
"""Control de `src/verify/agent_proposal.py`: el cambio del agente como candidato.

El agente edita el árbol; esta pieza convierte esa edición en un candidato del
lazo tsc cero y devuelve el archivo a su base, para que sea el paso quien lo
aplique y `tsc` quien lo juzgue.

Qué haría fallar a este control:
- que la edición no reprodujera el texto del agente al aplicarse sobre la base;
- que la base no fuera la de `HEAD` (el paso la rechazaría como `infrastructure`);
- que el archivo quedara editado (el paso lo vería con una base distinta);
- que los objetivos incluyeran diagnósticos que el patrón no nombra.
"""
from __future__ import annotations

import contextlib
import hashlib
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from verify import agent_proposal

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def git(root: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)


def apply(text: str, edits: list[dict]) -> str:
    for edit in sorted(edits, key=lambda e: -e["start"]):
        text = text[: edit["start"]] + edit["newText"] + text[edit["start"] + edit["length"]:]
    return text


print("test_agent_proposal:")
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    git(root, "init", "-q")
    base = "type A = { f: (prev: unknown) => unknown }\nconst x = 1\n"
    (root / "src").mkdir()
    (root / "src" / "a.ts").write_text(base)
    (root / "src" / "b.ts").write_text("const b = 2\n")
    git(root, "add", ".")
    git(root, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base")
    edited = "type A = { f: (prev: AppState) => AppState }\nconst x = 1\n"
    (root / "src" / "a.ts").write_text(edited)
    before = [
        "src/c.ts(3,5): error TS18046: 'prev' is of type 'unknown'.",
        "src/d.ts(9,1): error TS18046: 'prev' is of type 'unknown'.",
        "src/d.ts(9,1): error TS2339: Property 'x' does not exist on type 'Y'.",
        # Continuación de un mensaje encadenado, como las trae `tsc` real.
        "  Type 'unknown' is not assignable to type 'string'.",
    ]
    row = agent_proposal.build(root, ["src/a.ts"], before, r"TS18046: 'prev' is of type 'unknown'",
                               "prev-contract")

    assert_equal("aplicada sobre la base reproduce la edición del agente", edited,
                 apply(base, row["edits"]))
    assert_equal("la base es la de HEAD", hashlib.sha256(base.encode()).hexdigest(),
                 row["bases"]["src/a.ts"])
    assert_equal("el archivo vuelve a su base", base, (root / "src" / "a.ts").read_text())
    assert_equal("los objetivos son sólo los que nombra el patrón",
                 ["src/c.ts: TS18046: 'prev' is of type 'unknown'.",
                  "src/d.ts: TS18046: 'prev' is of type 'unknown'."], row["targets"])
    assert_equal("el proponente se llama agent y el id se prefija", ("agent", "agent:prev-contract"),
                 (row["proposer"], row["proposal_id"]))
    assert_equal("una sola edición mínima por archivo", 1, len(row["edits"]))

    try:
        agent_proposal.build(root, ["src/b.ts"], before, r"TS18046", "sin-cambio")
        assert_equal("un archivo sin cambios rehúsa", "ValueError", "nada")
    except ValueError:
        assert_equal("un archivo sin cambios rehúsa", "ValueError", "ValueError")

    (root / "src" / "a.ts").write_text(edited)
    try:
        agent_proposal.build(root, ["src/a.ts"], before, r"TS9999", "sin-objetivos")
        assert_equal("un patrón sin objetivos rehúsa", "ValueError", "nada")
    except ValueError:
        assert_equal("un patrón sin objetivos rehúsa", "ValueError", "ValueError")
    assert_equal("y al rehusar deja la edición del agente en su sitio", edited,
                 (root / "src" / "a.ts").read_text())

    code = agent_proposal.main(["--root", str(root), "--before-log", str(root / "no-log"),
                                "--pattern", "(", "--id", "x", "src/a.ts"])
    assert_equal("un log ausente rehúsa con 2, sin traza", 2, code)
    (root / "before.log").write_text("\n".join(before) + "\n")
    code = agent_proposal.main(["--root", str(root), "--before-log", str(root / "before.log"),
                                "--pattern", "(", "--id", "x", "src/a.ts"])
    assert_equal("un patrón mal formado rehúsa con 2, sin traza", 2, code)

    # Reflexion: con --run, la propuesta LEE la memoria de sus archivos antes
    # de salir, sin cambiar la candidata.
    run = root / "run"
    run.mkdir()
    (run / "reflections.jsonl").write_text(json.dumps(
        {"proposal_id": "agent:old", "outcome": "partial", "files": ["src/a.ts"],
         "lesson": "leccion-de-a", "revealed": []}) + "\n" + json.dumps(
        {"proposal_id": "agent:far", "outcome": "rejected", "files": ["src/z.ts"],
         "lesson": "leccion-ajena", "revealed": []}) + "\n")
    (root / "src" / "a.ts").write_text(edited)
    err = io.StringIO()
    with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
        code = agent_proposal.main(["--root", str(root), "--before-log", str(root / "before.log"),
                                    "--pattern", "TS18046", "--id", "mem", "--run", str(run),
                                    "src/a.ts"])
    assert_equal("con --run la propuesta sigue saliendo", 0, code)
    assert_equal("recuerda la lección de su archivo", True, "leccion-de-a" in err.getvalue())
    assert_equal("no recuerda la de otro archivo", False, "leccion-ajena" in err.getvalue())

    # Paso 4 del plan: un patrón conocido cuya señal sigue viva FUERA de la
    # candidata se nombra antes de que tsc juzgue, para aplicarlo en bloque.
    (run / "patterns.jsonl").write_text(json.dumps(
        {"name": "unknown-param", "signal": "TS18046", "fix": "f", "site": "", "replace": "",
         "include": "", "exclude": [], "applied": []}) + "\n")
    (root / "before.log").write_text("\n".join(before + [
        "src/b.ts(4,4): error TS18046: 'w' is of type 'unknown'.",
        "src/b.ts(8,4): error TS18046: 'q' is of type 'unknown'.",
    ]) + "\n")
    (root / "src" / "a.ts").write_text(edited)
    err = io.StringIO()
    with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
        code = agent_proposal.main(["--root", str(root), "--before-log", str(root / "before.log"),
                                    "--pattern", "src/c.ts: TS18046", "--id", "mem2", "--run", str(run),
                                    "src/a.ts"])
    pending = [line for line in err.getvalue().splitlines() if line.startswith("pendiente")]
    # c.ts es objetivo declarado de la candidata: no queda pendiente.
    assert_equal("nombra cada archivo donde el patrón sigue vivo fuera, el mayor primero",
                 ["pendiente unknown-param: 2 en src/b.ts", "pendiente unknown-param: 1 en src/d.ts"],
                 pending)
    # Gate 4: con un patrón vivo fuera, la propuesta NO sale.
    assert_equal("gate 4: lo pendiente bloquea con 4", 4, code)
    assert_equal("gate 4: dice por qué", True, "GATE 4 BLOQUEADO" in err.getvalue())

    (run / "patterns.jsonl").write_text(json.dumps(
        {"name": "unknown-param", "signal": "TS18046", "fix": "f", "site": "", "replace": "",
         "include": "", "exclude": [], "applied": [], "status": "closed",
         "closed_reason": "agotado"}) + "\n")
    (root / "src" / "a.ts").write_text(edited)
    out = io.StringIO()
    with contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(out):
        code = agent_proposal.main(["--root", str(root), "--before-log", str(root / "before.log"),
                                    "--pattern", "src/c.ts: TS18046", "--id", "mem3", "--run", str(run),
                                    "src/a.ts"])
    assert_equal("gate 4: con el patrón cerrado la propuesta sale", (0, True),
                 (code, '"proposal_id": "agent:mem3"' in out.getvalue()))

print(f"test_agent_proposal: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
