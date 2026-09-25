#!/usr/bin/env python3
"""Control de `src/verify/prefix_speculation.py`: medir N prefijos a la vez.

Medido el 2026-09-25 (`.claude/workbench/tsc-two-concurrent-*`): dos tsc a la
vez rinden 1.77x en 4 núcleos, pero la ruta acepta el 93 % de sus lotes, así
que medir dos unidades contra la MISMA base obligaría a medir después el
estado combinado. El worktree i mide el prefijo u1..ui: la diferencia entre
el log i-1 y el i es la contribución de ui, y el log del prefijo aceptado más
largo ya es la base medida de la ronda siguiente.

Qué haría fallar a este control:
- decidir ui contra la base y no contra el log del prefijo anterior;
- seguir decidiendo tras un rechazo: lo que viene después está medido encima
  de una unidad que no se conserva;
- armar un prefijo con dos unidades que tocan el mismo archivo;
- dejar un worktree con un prefijo sin revertir, o sin lo aceptado aplicado;
- publicar un veredicto sin GNU Parallel en vez de rehusar.
"""
from __future__ import annotations

import hashlib
import sys
import tempfile
from pathlib import Path

from verify import prefix_speculation as ps

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


FAKE_TSC = '''import pathlib, re, sys
lines = []
for path in sorted(pathlib.Path(".").glob("*.ts")):
    for number, text in enumerate(path.read_text().splitlines(), 1):
        for match in re.finditer(r"BAD(\\d+)", text):
            lines.append(f"{path.name}({number},1): error TS9001: bad {match.group(1)}.")
        if "WORSE" in text:
            lines.append(f"{path.name}({number},1): error TS9002: worse.")
print("\\n".join(lines))
sys.exit(2 if lines else 0)
'''

TEXTS = {"a.ts": "const a = BAD1\n", "b.ts": "const b = BAD2\n", "c.ts": "const c = BAD3\n"}


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def row(file: str, new: str, number: int) -> dict:
    text = TEXTS[file]
    old = f"BAD{number}"
    return {"proposal_id": f"fix:{file}", "proposer": "pool", "files": [file],
            "targets": [f"{file}: TS9001: bad {number}."],
            "edits": [{"file": file, "start": text.index(old), "length": len(old), "newText": new}],
            "bases": {file: sha(text)}}


def log(*bad: str, worse: str = "") -> list[str]:
    lines = [f"{file}(1,1): error TS9001: bad {n}." for file, n in
             (("a.ts", 1), ("b.ts", 2), ("c.ts", 3)) if file in bad]
    return lines + ([f"{worse}(1,1): error TS9002: worse."] if worse else [])


GOOD_A, GOOD_B, GOOD_C = row("a.ts", "1", 1), row("b.ts", "2", 2), row("c.ts", "3", 3)
BAD_B = row("b.ts", "WORSE", 2)
BASE = log("a.ts", "b.ts", "c.ts")

print("test_prefix_speculation:")

decision = ps.decide(BASE, [GOOD_A, GOOD_B], [log("b.ts", "c.ts"), log("c.ts")])
assert_equal("los dos del prefijo se conservan", ["fix:a.ts", "fix:b.ts"], decision.kept)
assert_equal("y la base siguiente es el log del prefijo largo", log("c.ts"), decision.final_lines)

decision = ps.decide(BASE, [GOOD_A, BAD_B, GOOD_C],
                     [log("b.ts", "c.ts"), log("c.ts", worse="b.ts"), log(worse="b.ts")])
assert_equal("u2 se decide contra el log de u1, no contra la base",
             (["fix:a.ts"], "rejected"), (decision.kept, decision.outcomes.get("fix:b.ts")))
assert_equal("lo medido encima de un rechazo vuelve a la cola sin decidir",
             ["fix:c.ts"], [r["proposal_id"] for r in decision.undecided])
assert_equal("la base siguiente es la del último conservado", log("b.ts", "c.ts"), decision.final_lines)

# u2 baja su objetivo pero destapa uno en otro archivo: frente a u1 el total
# no baja (se rechaza); frente a la base bajaría gracias a lo que arregló u1.
REVEALED = ["z.ts(1,1): error TS9004: revealed."]
decision = ps.decide(BASE, [GOOD_A, GOOD_B], [log("b.ts", "c.ts"), log("c.ts") + REVEALED])
assert_equal("la mejora de u1 no se le acredita a u2", (["fix:a.ts"], "accepted-net"),
             (decision.kept, decision.outcomes.get("fix:a.ts")))

decision = ps.decide(BASE, [BAD_B, GOOD_A], [log("a.ts", "c.ts", worse="b.ts"), log("c.ts", worse="b.ts")])
assert_equal("un primero rechazado no conserva nada y deja al resto sin decidir",
             ([], ["fix:a.ts"], BASE), (decision.kept, [r["proposal_id"] for r in decision.undecided],
                                          decision.final_lines))

same_file = row("a.ts", "11", 1) | {"proposal_id": "fix:a.ts#2"}
assert_equal("un prefijo no junta dos unidades del mismo archivo", ["fix:a.ts", "fix:b.ts"],
             [r["proposal_id"] for r in ps.disjoint_prefix([GOOD_A, same_file, GOOD_B], 3)])
assert_equal("ni pasa del número de worktrees", ["fix:a.ts"],
             [r["proposal_id"] for r in ps.disjoint_prefix([GOOD_A, GOOD_B], 1)])

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    worktrees = [base / "wt1", base / "wt2"]
    for wt in worktrees:
        wt.mkdir()
        for name, text in TEXTS.items():
            (wt / name).write_text(text)
        (wt / "fake_tsc.py").write_text(FAKE_TSC)
    tsc = [sys.executable, "fake_tsc.py"]
    logs = ps.measure(worktrees, [GOOD_A, BAD_B], tsc, base / "bench")
    assert_equal("el worktree i mide el prefijo u1..ui",
                 (sorted(log("b.ts", "c.ts")), sorted(log("c.ts", worse="b.ts"))),
                 (sorted(logs[0]), sorted(logs[1])))
    assert_equal("y cada worktree vuelve a su texto", [TEXTS] * 2,
                 [{n: (wt / n).read_text() for n in TEXTS} for wt in worktrees])

    try:
        ps.run_round(worktrees, [GOOD_A, BAD_B], tsc, base / "bench2", BASE)
    except RuntimeError as error:
        # Un worktree que no volvió a su texto hace que la base no coincida.
        print(f"  (la ronda rehusó: {error})")
    assert_equal("la ronda conserva lo aceptado en TODOS los worktrees", ["const a = 1\n"] * 2,
                 [(wt / "a.ts").read_text() for wt in worktrees])
    assert_equal("y no deja lo rechazado", [TEXTS["b.ts"]] * 2, [(wt / "b.ts").read_text() for wt in worktrees])

    try:
        ps.measure(worktrees, [GOOD_A], tsc, base / "bench3", parallel_bin="parallel-que-no-existe")
        refused = "midió"
    except Exception as error:  # el tipo es lo que se mide
        refused = type(error).__name__
    assert_equal("sin GNU Parallel rehúsa en vez de medir en serie a escondidas",
                 "ParallelUnavailable", refused)

print(f"test_prefix_speculation: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
