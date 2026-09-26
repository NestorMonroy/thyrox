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

import contextlib
import io
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

# --- ensayo balanceado (L07): lo nuevo no pisa lo que ya funciona ------------
# Antes de guardar un patrón se ensaya su señal contra las instancias del log
# que ya reclaman los patrones con utilidad demostrada (Laplace > 0.5 y al
# menos una aceptada). Reclamar las mismas con otro arreglo es un conflicto.
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    ts.add_pattern(run, pattern("proven", r"TS2305: .*'foo'", "reexporta foo"))
    ts.add_pattern(run, pattern("unproven", r"TS2322: ", "anota el tipo"))
    (run / "ledger.jsonl").write_text("".join(json.dumps({"proposal_id": p, "outcome": o}) + "\n" for p, o in (
        ("pattern:proven", "accepted"), ("pattern:proven", "accepted"), ("pattern:unproven", "rejected"))))
    log = ["src/a.ts(1,2): error TS2305: Module 'x' has no exported member 'foo'.",
           "src/b.ts(3,4): error TS2322: Type 'a' is not assignable to type 'b'.",
           "src/c.ts(5,6): error TS2305: Module 'y' has no exported member 'bar'."]
    broad = pattern("broad", r"TS2305: ", "declara el miembro")
    conflicts = ts.rehearse(run, broad, log)
    assert_equal("ensayo: la señal ancha pisa las instancias del patrón probado", [("proven", 1)],
                 [(c["pattern"], len(c["shared"])) for c in conflicts])
    assert_equal("ensayo: un patrón sin utilidad demostrada no se protege", [],
                 ts.rehearse(run, pattern("other", r"TS2322: ", "otro arreglo"), log))
    assert_equal("ensayo: el mismo arreglo no es conflicto (es un duplicado)", [],
                 ts.rehearse(run, pattern("again", r"TS2305: ", "reexporta foo"), log))
    assert_equal("ensayo: una señal disjunta no choca", [],
                 ts.rehearse(run, pattern("bar", r"'bar'", "declara bar"), log))
    (run / "tsc.log").write_text("\n".join(log) + "\n")
    base = ["add-pattern", "--run", str(run), "--name", "broad", "--signal", "TS2305: ",
            "--fix", "declara el miembro", "--log", str(run / "tsc.log")]
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as err:
        refused = ts.main(base)
    assert_equal("add-pattern con conflicto rehúsa, nombra al pisado y no guarda", (1, True, False),
                 (refused, "proven" in err.getvalue(), "broad" in ts.load_patterns(run)))
    with contextlib.redirect_stdout(io.StringIO()):
        accepted = ts.main([*base, "--overlap-reason", "proven se queda con foo; éste cubre el resto"])
    row = ts.load_patterns(run).get("broad", {})
    assert_equal("con razón declarada se guarda, y la razón queda en el patrón", (0, ["proven"]),
                 (accepted, (row.get("overlap_accepted") or {}).get("with")))

# --- congelar una entrada (L06): lo validado no lo cambia un proceso automático
def raises(call) -> bool:
    try:
        call()
    except ValueError:
        return True
    return False


with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    ts.add_pattern(run, pattern("kept", "TS4: a", "arreglo validado"))
    ts.add_pattern(run, pattern("loose", "TS4: b", "arreglo suelto"))
    assert_equal("congelar exige una razón", True, raises(lambda: ts.freeze(run, "kept", " ")))
    ts.freeze(run, "kept", "validado en 12 aplicaciones")
    assert_equal("reescribir el contenido de una entrada congelada rehúsa", True,
                 raises(lambda: ts.add_pattern(run, pattern("kept", "TS4: a", "otro arreglo"))))
    assert_equal("reescribir lo mismo no la toca", 1, ts.add_pattern(run, pattern("kept", "TS4: a", "arreglo validado"))["version"])
    assert_equal("un alias no es cambio de contenido: se admite", ["alias"],
                 ts.add_pattern(run, pattern("alias", "TS4: a", "otro"))["aliases"])
    assert_equal("cerrarla a mano rehúsa: hay que descongelar", True,
                 raises(lambda: ts.close_pattern(run, "kept", "ya no")))
    (run / "ledger.jsonl").write_text("".join(json.dumps({"proposal_id": p, "outcome": "rejected"}) + "\n"
                                              for p in ["pattern:kept"] * 4 + ["pattern:loose"] * 4))
    assert_equal("el descarte automático la salta y descarta la suelta", ["loose"],
                 ts.evict(run, min_trials=3, max_mean=0.25, reason="poca confianza"))
    ts.add_pattern(run, pattern("twin", "TS4: c", "x"))
    ts.add_pattern(run, pattern("frozen-twin", "TS4: d", "y"))
    patterns = ts.load_patterns(run)
    patterns["frozen-twin"]["signal"] = "TS4: c"
    ts._save(run, patterns)
    ts.freeze(run, "frozen-twin", "la buena")
    ts.merge_duplicates(run, reason="barrido")
    rows = ts.load_patterns(run)
    assert_equal("al fundir duplicados se conserva la congelada", ("closed", None),
                 (rows["twin"].get("status"), rows["frozen-twin"].get("status")))
    ts.unfreeze(run, "kept", "se revisa")
    ts.close_pattern(run, "kept", "ya no")
    rows = ts.load_patterns(run)
    assert_equal("descongelada se cierra, y las dos decisiones quedan registradas", ("closed", ["freeze", "unfreeze"]),
                 (rows["kept"]["status"], [e["action"] for e in rows["kept"]["freeze_log"]]))

with tempfile.TemporaryDirectory() as tmp:
    # Aislado: aquí nada la cierra antes, así que sólo la congelación la salva.
    run = Path(tmp)
    ts.add_pattern(run, pattern("guarded", "TS5: a", "validado"))
    ts.freeze(run, "guarded", "validado")
    (run / "ledger.jsonl").write_text("".join(json.dumps({"proposal_id": "pattern:guarded", "outcome": "rejected"})
                                              + "\n" for _ in range(4)))
    assert_equal("el descarte automático no toca una entrada congelada", [],
                 ts.evict(run, min_trials=3, max_mean=0.25, reason="poca confianza"))
    with contextlib.redirect_stdout(io.StringIO()):
        code = ts.main(["unfreeze", "--run", str(run), "--name", "guarded", "--reason", "por CLI"])
    assert_equal("la CLI descongela con su razón", (0, None), (code, ts.load_patterns(run)["guarded"]["frozen"]))

# --- reproducción sin conexión (L09): ensayar contra los logs guardados ------
with tempfile.TemporaryDirectory() as tmp:
    run = Path(tmp)
    line = "src/{f}.ts(1,1): error TS2305: Module 'x' has no exported member '{m}'.\n"
    (run / "step-7").mkdir()
    (run / "step-7/before.log").write_text(line.format(f="a", m="foo") + line.format(f="b", m="foo")
                                           + line.format(f="c", m="bar"))
    (run / "step-7/after.log").write_text(line.format(f="b", m="foo") + line.format(f="c", m="bar"))
    (run / "step-8").mkdir()
    (run / "step-8/before.log").write_text(line.format(f="b", m="foo"))
    (run / "step-9").mkdir()
    (run / "step-9/before.log").write_text(line.format(f="c", m="bar"))
    rows = ts.replay(run, pattern("foo", "'foo'", "reexporta foo"))
    assert_equal("reproducción: por paso, lo que reclamaría y lo que desapareció en ese paso",
                 [{"step": "step-7", "targets": 2, "resolved": 1}, {"step": "step-8", "targets": 1, "resolved": None}],
                 rows)
    ts.add_pattern(run, pattern("foo", "'foo'", "reexporta foo"))
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = ts.main(["replay", "--run", str(run), "--name", "foo"])
    assert_equal("la CLI reproduce un patrón de la memoria, una línea por paso", (0, 2),
                 (code, len(out.getvalue().splitlines())))
    assert_equal("sin logs guardados, la reproducción rehúsa en vez de publicar un cero", True,
                 raises(lambda: ts.replay(run / "vacio", pattern("foo", "x", "y"))))

print(f"test_pattern_memory: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
