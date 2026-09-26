#!/usr/bin/env python3
"""Control de la gobernanza de la memoria de patrones (`tsc_sweep`).

Origen: self-evolving-agents-2026, lección 7 (BALTO): «el sistema de memoria
necesita mecanismos de confianza, alcance, versión, deduplicación y descarte,
y debe verificar lo que escribe mediante ejecución real». La memoria sólo
tenía alcance y cierre; medido en la corrida run-20260924T175031: 19 grupos
de señales repetidas con el mismo alcance y una sobrescritura por nombre que
perdía la versión anterior.

Qué haría fallar a este control:
- sobrescribir un patrón sin guardar el estado anterior, o `revert` que no
  lo restaure (L09: reversión);
- aceptar un segundo nombre para la misma señal y el mismo alcance;
- fundir dos señales iguales con alcances distintos (no son el mismo patrón);
- una confianza que no salga del ledger, o que cuente lo neutro como fracaso;
- descartar sin intentos suficientes, o sin razón escrita.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from verify import tsc_sweep as ts

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def pattern(name: str, signal: str, fix: str = "arreglo", include: str = "") -> dict:
    return {"name": name, "signal": signal, "fix": fix, "include": include}


# --- versión y reversión ------------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    ts.add_pattern(run, pattern("p", "TS1: a", "arreglo uno"))
    ts.mark_applied(run, "p", ["src/a.ts"])
    ts.add_pattern(run, pattern("p", "TS1: b", "arreglo dos"))
    row = ts.load_patterns(run)["p"]
    assert_equal("sobrescribir con otra señal sube la versión", 2, row.get("version"))
    assert_equal("y guarda el estado anterior en history", [("TS1: a", "arreglo uno", 1)],
                 [(h["signal"], h["fix"], h["version"]) for h in row.get("history", [])])
    assert_equal("el applied no se pierde al sobrescribir", ["src/a.ts"], row.get("applied"))
    ts.add_pattern(run, pattern("p", "TS1: b", "arreglo dos"))
    assert_equal("reescribir lo mismo no crea versión", 2, ts.load_patterns(run)["p"].get("version"))
    try:
        restored = ts.revert_pattern(run, "p")
    except ValueError as error:
        restored = {"signal": str(error), "fix": "", "version": 0, "history": None}
    assert_equal("revert restaura la versión anterior", ("TS1: a", "arreglo uno", 1, []),
                 (restored["signal"], restored["fix"], restored["version"], restored.get("history")))
    try:
        ts.revert_pattern(run, "p")
        refused = False
    except ValueError:
        refused = True
    assert_equal("sin versión anterior, revert rehúsa", True, refused)

# --- deduplicación ---------------------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    ts.add_pattern(run, pattern("first", "TS2: x"))
    row = ts.add_pattern(run, pattern("second", "TS2: x"))
    memory = ts.load_patterns(run)
    assert_equal("la misma señal y el mismo alcance no crean otro patrón", (["first"], "first"),
                 (sorted(memory), row["name"]))
    assert_equal("el nombre nuevo queda como alias del existente", ["second"], memory["first"].get("aliases"))
    ts.add_pattern(run, pattern("scoped", "TS2: x", include="^src/tests/"))
    assert_equal("la misma señal con otro alcance es otro patrón", ["first", "scoped"],
                 sorted(ts.load_patterns(run)))

# --- confianza desde el ledger y descarte ----------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    for name in ("good", "bad", "young"):
        ts.add_pattern(run, pattern(name, f"TS3: {name}"))
    outcomes = [("agent:pool:pattern:good", "accepted"), ("agent:pool:pattern:good", "accepted-partial"),
                ("pattern:good:src/a.ts", "rejected"),
                ("agent:pool:pattern:bad", "rejected"), ("agent:pool:pattern:bad", "rejected-review"),
                ("pattern:bad", "rejected"), ("agent:pool:pattern:bad", "partial"),
                ("agent:pool:pattern:young", "rejected"), ("pattern:young", "rejected"),
                ("agent:pool:pattern:goodish", "accepted"), ("agent:pool:src/a.ts", "rejected")]
    (run / "ledger.jsonl").write_text("".join(json.dumps({"proposal_id": p, "outcome": o}) + "\n"
                                              for p, o in outcomes))
    confidence = ts.pattern_confidence(run)
    assert_equal("la confianza cuenta éxitos y fracasos del ledger por patrón",
                 {"good": (2, 1), "bad": (0, 3), "young": (0, 2)},
                 {k: (v["accepted"], v["rejected"]) for k, v in confidence.items()})
    assert_equal("lo neutro (partial) no cuenta como fracaso, y se reporta", 1, confidence["bad"]["neutral"])
    assert_equal("media de Laplace", 0.6, round(confidence["good"]["mean"], 2))
    evicted = ts.evict(run, min_trials=3, max_mean=0.25, reason="paso de prueba")
    memory = ts.load_patterns(run)
    assert_equal("se descarta sólo lo que falló con intentos suficientes", ["bad"], evicted)
    assert_equal("el descartado queda cerrado con su razón y sus cifras", (True, True),
                 (memory["bad"].get("status") == "closed", "0 de 3" in memory["bad"].get("closed_reason", "")))
    # young: media 1/4 = 0.25, en el umbral; sólo lo salva tener 2 < 3 intentos.
    assert_equal("uno joven, bajo el mínimo de intentos, sigue abierto aunque su media esté en el umbral",
                 (0.25, None), (confidence["young"]["mean"], memory["young"].get("status")))
    try:
        ts.evict(run, min_trials=3, max_mean=0.25, reason=" ")
        refused = False
    except ValueError:
        refused = True
    assert_equal("descartar sin razón escrita se rehúsa", True, refused)

# --- procedencia (L09: «registrar el origen de la experiencia, las reglas de
# actualización, el conjunto de evaluación... y el alcance de vigencia») ------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    origin = {"step": "step-9", "rule": "agent-signal", "evidence": "step-9/base.log", "setup_id": "s-1",
              "file": "src/a.ts"}
    ts.add_pattern(run, {**pattern("p", "TS5: a"), "provenance": origin})
    assert_equal("el patrón guarda su procedencia", origin, ts.load_patterns(run)["p"].get("provenance"))
    newer = {**origin, "step": "step-12", "evidence": "step-12/base.log"}
    ts.add_pattern(run, {**pattern("p", "TS5: b"), "provenance": newer})
    row = ts.load_patterns(run)["p"]
    assert_equal("la versión nueva lleva la suya y la anterior queda en history con la de antes",
                 ("step-12", "step-9"), (row["provenance"]["step"], (row["history"][-1].get("provenance") or {}).get("step")))
    ts.add_pattern(run, {**pattern("p", "TS5: b"), "provenance": {**newer, "step": "step-13"}})
    assert_equal("reescribir lo mismo no crea versión ni pisa la procedencia", ("step-12", 2),
                 (ts.load_patterns(run)["p"]["provenance"]["step"], ts.load_patterns(run)["p"]["version"]))
    ts.add_pattern(run, {**pattern("alias-of-p", "TS5: b"), "provenance": {**newer, "step": "step-14"}})
    assert_equal("un alias fundido deja su procedencia bajo su nombre", "step-14",
                 ts.load_patterns(run)["p"].get("alias_provenance", {}).get("alias-of-p", {}).get("step"))

# --- fundir los duplicados que ya existían -------------------------------------
# La deduplicación al escribir no arregla la memoria heredada: medido, 19
# grupos con la misma señal y el mismo alcance. Se conserva el primero, se
# unen applied y alias, y los demás se CIERRAN con razón — no se borran (L09).
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    rows = [{**pattern("keep", "TS4: s"), "applied": ["src/a.ts"]},
            {**pattern("twin", "TS4: s"), "applied": ["src/b.ts"]},
            {**pattern("other-scope", "TS4: s", include="^tests/"), "applied": ["tests/x.ts"]},
            {**pattern("closed-twin", "TS4: s"), "applied": ["src/c.ts"], "status": "closed", "closed_reason": "x"}]
    (run / ts.PATTERNS).write_text("".join(json.dumps(r) + "\n" for r in rows))
    merged = ts.merge_duplicates(run, reason="memoria heredada")
    memory = ts.load_patterns(run)
    assert_equal("merge_duplicates cierra el gemelo, no el primero ni el de otro alcance", ["twin"], merged)
    assert_equal("el conservado une applied y alias", (["src/a.ts", "src/b.ts"], ["twin"]),
                 (memory["keep"]["applied"], memory["keep"].get("aliases")))
    assert_equal("el gemelo queda cerrado, nombrando al conservado", (True, True),
                 (memory["twin"].get("status") == "closed", "keep" in memory["twin"].get("closed_reason", "")))
    assert_equal("un cerrado no participa: su razón no se toca", "x", memory["closed-twin"]["closed_reason"])
    assert_equal("fundir dos veces no cierra nada más", [], ts.merge_duplicates(run, reason="otra vez"))

# --- ¿cambió la conducta futura? (L05: una reflexión que no cambia la estrategia
# de ejecución no es automejora; L07: evaluar si transfiere entre tareas) ------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    for name, applied in (("moved", ["src/a.ts", "src/b.ts", "src/c.ts"]), ("stuck", ["src/a.ts"]),
                          ("idle", ["src/a.ts"]),
                          ("legacy", ["src/x.ts", "src/y.ts"])):
        ts.add_pattern(run, {**pattern(name, f"TS6: {name}"),
                             **({"provenance": {"file": "src/a.ts", "step": "s"}} if name != "legacy" else {})})
        ts.mark_applied(run, name, applied)
    (run / "ledger.jsonl").write_text("".join(json.dumps({"proposal_id": p, "outcome": o}) + "\n" for p, o in (
        ("agent:pool:pattern:stuck", "rejected"), ("agent:pool:pattern:stuck", "rejected"))))
    report = ts.pattern_transfer(run)
    assert_equal("transfiere: aplicado con éxito fuera del archivo del que se aprendió",
                 ["src/b.ts", "src/c.ts"], report["moved"]["transferred_to"])
    assert_equal("no transfiere: dos intentos y ningún archivo nuevo", ([], 2),
                 (report["stuck"]["transferred_to"], report["stuck"]["attempts"]))
    assert_equal("sin procedencia no se adivina el origen: se declara", (None, "sin procedencia"),
                 (report["legacy"]["learned_from"], report["legacy"]["verdict"]))
    assert_equal("veredictos", ("transfiere", "no transfiere", "sin oportunidad"),
                 (report["moved"]["verdict"], report["stuck"]["verdict"], report["idle"]["verdict"]))

# --- definición completa de skill (L07: activación, entradas, acciones,
# recuperación ante fallos y criterio de terminación) --------------------------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    row = ts.add_pattern(run, pattern("s", "TS8: s"))
    assert_equal("por defecto se recupera excluyendo el archivo y termina sin instancias vivas",
                 ("exclude-file", "no-live-instances"), (row.get("on_failure"), row.get("done_when")))
    try:
        ts.add_pattern(run, {**pattern("bad", "TS8: b"), "on_failure": "retry-forever"})
        refused = False
    except ValueError:
        refused = True
    assert_equal("una recuperación que no existe se rechaza al escribir", True, refused)
    card = ts.skill_card(ts.add_pattern(run, {**pattern("strict", "TS8: t", include="^src/"),
                                              "on_failure": "close-pattern"}))
    assert_equal("la tarjeta tiene las cinco partes de un skill",
                 ["action", "activation", "done_when", "inputs", "on_failure"], sorted(card))
    assert_equal("y dice si la acción es mecánica o exige juicio", (False, "^src/", "TS8: t"),
                 (card["action"]["mechanical"], card["inputs"]["include"], card["activation"]))

print(f"test_pattern_memory: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
