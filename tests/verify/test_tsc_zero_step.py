#!/usr/bin/env python3
"""Control de `src/verify/tsc_zero_step.py`: un paso del lazo tsc cero.

El paso aplica un lote de candidatos, corre UNA vez el verificador, reparte el
veredicto por propuesta, lo añade al registro y revierte lo no aceptado. Aquí
el verificador es un `tsc` falso y determinista: una línea con `BAD<n>` da un
TS9001 y una con `WORSE` da un TS9002, en el formato de `tsc --pretty false`.

Qué haría fallar a este control:
- no revertir lo rechazado: el árbol quedaría con el diagnóstico nuevo;
- revertir lo aceptado, o no aplicarlo;
- aplicar una propuesta cuya base cambió: escribiría en el sitio equivocado;
- tomar un `tsc` que no produjo nada como «cero errores»: sin su código de
  salida 0, un log vacío no es el final del lazo sino una medición rota;
- no confirmar con otra pasada tras revertir: lo aceptado se juzgó junto a lo
  que se revirtió, y sólo otra pasada mide lo que queda.
"""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from pathlib import Path

from verify import tsc_zero_step as step

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
provides = any("PROVIDES" in p.read_text() for p in pathlib.Path(".").glob("*.ts"))
for path in sorted(pathlib.Path(".").glob("*.ts")):
    for number, text in enumerate(path.read_text().splitlines(), 1):
        for match in re.finditer(r"BAD(\\d+)", text):
            lines.append(f"{path.name}({number},1): error TS9001: bad {match.group(1)}.")
        if "WORSE" in text:
            lines.append(f"{path.name}({number},1): error TS9002: worse.")
        if "NEEDS" in text and not provides:
            lines.append(f"{path.name}({number},1): error TS9003: needs a provider.")
        if "REVEAL" in text:
            # Un contrato que el arreglo destapa en OTRO archivo: no se
            # atribuye a la propuesta, y aun así el lote no está limpio.
            lines.append(f"z.ts(1,1): error TS9004: revealed contract.")
print("\\n".join(lines))
sys.exit(2 if lines else 0)
'''


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def proposal(pid: str, proposer: str, file: str, text: str, old: str, new: str, targets: list[str]) -> dict:
    start = text.index(old)
    return {"proposal_id": pid, "proposer": proposer, "targets": targets, "files": [file],
            "edits": [{"file": file, "start": start, "length": len(old), "newText": new}],
            "bases": {file: sha(text)}}


def fixture(base: Path) -> tuple[list[dict], list[str]]:
    texts = {"a.ts": "const a = BAD1\n", "b.ts": "const b = BAD2\n", "c.ts": "const c = BAD3\n",
             "d.ts": "const d = BAD4\n"}
    for name, text in texts.items():
        (base / name).write_text(text)
    (base / "fake_tsc.py").write_text(FAKE_TSC)
    candidates = [
        proposal("fix:a.ts", "good", "a.ts", texts["a.ts"], "BAD1", "1", ["a.ts: TS9001: bad 1."]),
        proposal("fix:b.ts", "bad", "b.ts", texts["b.ts"], "BAD2", "WORSE", ["b.ts: TS9001: bad 2."]),
        # Base vieja: el archivo cambió después de proponerse.
        {**proposal("fix:c.ts", "good", "c.ts", texts["c.ts"], "BAD3", "3", ["c.ts: TS9001: bad 3."]),
         "bases": {"c.ts": sha("otro texto\n")}},
    ]
    return candidates, [sys.executable, "fake_tsc.py"]


print("test_tsc_zero_step:")

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    candidates, tsc = fixture(base)
    ledger = base / "ledger.jsonl"
    report = step.run_step(base, candidates, tsc, ledger, base / "bench", seed=7, epsilon=0.5,
                           alpha0=0.5, max_batch=None)
    rows = [json.loads(line) for line in ledger.read_text().splitlines()] if ledger.exists() else []
    outcomes = {row["proposal_id"]: row["outcome"] for row in rows}
    assert_equal("la aceptada queda aplicada", "const a = 1\n", (base / "a.ts").read_text())
    assert_equal("la rechazada se revierte", "const b = BAD2\n", (base / "b.ts").read_text())
    assert_equal("la de base vieja no se aplica", "const c = BAD3\n", (base / "c.ts").read_text())
    assert_equal("el registro lleva los tres veredictos",
                 {"fix:a.ts": "accepted", "fix:b.ts": "rejected", "fix:c.ts": "infrastructure"},
                 outcomes)
    assert_equal("el total confirmado baja de 4 a 3", (4, 3), (report.total_before, report.total_final))
    assert_equal("revertir exige una pasada de confirmación", 3, report.tsc_runs)
    assert_equal("el paso con alguna aceptada progresa", "progress", report.status)
    assert_equal("el log final queda en el banco para el paso siguiente", True,
                 (base / "bench" / "final.log").exists())

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    candidates, tsc = fixture(base)
    only_good = [candidates[0]]
    report = step.run_step(base, only_good, tsc, base / "ledger.jsonl", base / "bench", seed=7,
                           epsilon=0.5, alpha0=0.5, max_batch=None)
    assert_equal("sin nada que revertir no hay pasada de confirmación", 2, report.tsc_runs)

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    candidates, tsc = fixture(base)
    report = step.run_step(base, [candidates[1]], tsc, base / "ledger.jsonl", base / "bench",
                           seed=7, epsilon=0.5, alpha0=0.5, max_batch=None)
    assert_equal("sin ninguna aceptada el lazo se detiene", "stalled", report.status)
    assert_equal("y el árbol queda como estaba", "const b = BAD2\n", (base / "b.ts").read_text())

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / "a.ts").write_text("const a = 1\n")
    (base / "fake_tsc.py").write_text(FAKE_TSC)
    report = step.run_step(base, [], [sys.executable, "fake_tsc.py"], base / "ledger.jsonl",
                           base / "bench", seed=7, epsilon=0.5, alpha0=0.5, max_batch=None)
    assert_equal("tsc sale 0 sin diagnósticos: tsc cero", "done", report.status)

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / "a.ts").write_text("const a = BAD1\n")
    (base / "broken_tsc.py").write_text("import sys\nsys.exit(1)\n")
    try:
        step.run_step(base, [], [sys.executable, "broken_tsc.py"], base / "ledger.jsonl",
                      base / "bench", seed=7, epsilon=0.5, alpha0=0.5, max_batch=None)
        assert_equal("un tsc que falla sin diagnósticos rehúsa", "RuntimeError", "sin error")
    except RuntimeError:
        assert_equal("un tsc que falla sin diagnósticos rehúsa", "RuntimeError", "RuntimeError")

with tempfile.TemporaryDirectory() as directory:
    # Lo aceptado dependía de lo revertido: `a.ts` cierra su objetivo sólo
    # mientras `b.ts` provee, y `b.ts` se rechaza por su propio diagnóstico.
    base = Path(directory)
    candidates, tsc = fixture(base)
    a, b = (base / "a.ts").read_text(), (base / "b.ts").read_text()
    coupled = [
        proposal("fix:a.ts", "good", "a.ts", a, "BAD1", "NEEDS", ["a.ts: TS9001: bad 1."]),
        proposal("fix:b.ts", "bad", "b.ts", b, "BAD2", "PROVIDES WORSE", ["b.ts: TS9001: bad 2."]),
    ]
    report = step.run_step(base, coupled, tsc, base / "ledger.jsonl", base / "bench", seed=7,
                           epsilon=0.5, alpha0=0.5, max_batch=None)
    assert_equal("la confirmación trae un diagnóstico nuevo: se revierte todo",
                 ("stalled", "const a = BAD1\n"), (report.status, (base / "a.ts").read_text()))
    assert_equal("y el total final es el de antes", (4, 4), (report.total_before, report.total_final))

with tempfile.TemporaryDirectory() as directory:
    # Dos inserciones en el mismo punto, en el orden de `inferFromUsage`.
    base = Path(directory)
    (base / "e.ts").write_text("b => BAD5\n")
    (base / "fake_tsc.py").write_text(FAKE_TSC)
    text = (base / "e.ts").read_text()
    row = {"proposal_id": "fix:e.ts", "proposer": "good", "targets": ["e.ts: TS9001: bad 5."],
           "files": ["e.ts"], "bases": {"e.ts": sha(text)},
           "edits": [{"file": "e.ts", "start": 0, "length": 0, "newText": "("},
                     {"file": "e.ts", "start": 1, "length": 0, "newText": ": T"},
                     {"file": "e.ts", "start": 1, "length": 0, "newText": ")"},
                     {"file": "e.ts", "start": 5, "length": 4, "newText": "5"}]}
    step.run_step(base, [row], [sys.executable, "fake_tsc.py"], base / "ledger.jsonl", base / "bench",
                  seed=7, epsilon=0.5, alpha0=0.5, max_batch=None)
    assert_equal("dos inserciones en un punto conservan su orden", "(b: T) => 5\n",
                 (base / "e.ts").read_text())

with tempfile.TemporaryDirectory() as directory:
    # Todo se acepta por atribución y nada se revierte, pero `a.ts` destapa un
    # contrato en otro archivo. Se biseca: `a.ts` queda `revealed`, a la cola
    # residual; `b.ts` se conserva.
    base = Path(directory)
    candidates, tsc = fixture(base)
    a, b = (base / "a.ts").read_text(), (base / "b.ts").read_text()
    rows = [
        proposal("fix:a.ts", "facade", "a.ts", a, "BAD1", "REVEAL", ["a.ts: TS9001: bad 1."]),
        proposal("fix:b.ts", "good", "b.ts", b, "BAD2", "2", ["b.ts: TS9001: bad 2."]),
    ]
    ledger = base / "ledger.jsonl"
    report = step.run_step(base, rows, tsc, ledger, base / "bench", seed=7, epsilon=0.5,
                           alpha0=0.5, max_batch=None)
    outcomes = {r["proposal_id"]: r["outcome"] for r in map(json.loads, ledger.read_text().splitlines())}
    assert_equal("sin revertir nada, un contrato destapado no se conserva en automático",
                 "const a = BAD1\n", (base / "a.ts").read_text())
    assert_equal("la bisección conserva lo que no revela", "const b = 2\n", (base / "b.ts").read_text())
    assert_equal("el registro dice revealed, no accepted",
                 {"fix:a.ts": "revealed", "fix:b.ts": "accepted"}, outcomes)
    residual = base / "residual.jsonl"
    queued = [json.loads(line) for line in residual.read_text().splitlines()] if residual.exists() else []
    assert_equal("la revelada va a la cola residual con sus contratos",
                 [("fix:a.ts", ["z.ts: TS9004: revealed contract."])],
                 [(q["proposal_id"], q["new_diagnostics"]) for q in queued])
    assert_equal("y el paso progresa por lo conservado", ("progress", 4, 3),
                 (report.status, report.total_before, report.total_final))

    # La vuelta siguiente no vuelve a aplicar lo que ya está en la cola.
    rows_again = [proposal("fix:a.ts", "facade", "a.ts", a, "BAD1", "REVEAL", ["a.ts: TS9001: bad 1."])]
    again = step.run_step(base, rows_again, tsc, ledger, base / "bench2", seed=8, epsilon=0.5,
                          alpha0=0.5, max_batch=None)
    assert_equal("lo que está en la cola residual no se vuelve a aplicar",
                 ("stalled", "const a = BAD1\n"), (again.status, (base / "a.ts").read_text()))
    # Sin la exclusión el árbol acabaría igual —se revelaría y revertiría otra
    # vez—, pero pagando el lote: lo que discrimina es que no hay pasada.
    assert_equal("ni paga otra pasada de tsc por ella", 1, again.tsc_runs)

print(f"test_tsc_zero_step: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
