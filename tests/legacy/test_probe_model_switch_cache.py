#!/usr/bin/env python3
"""Prueba de ``probe_model_switch_cache`` — la sonda del cambio de modelo.

Escrita ANTES del guion (TDD, directiva del ejecutor 2026-09-02). Lo que fija:

1. **La sonda nunca hereda la sesión.** Un ``claude -p`` hijo en este
   contenedor toma ``CLAUDE_CODE_SESSION_ID`` del entorno y escribe con el
   id de la sesión madre (medido: el transcript del hijo apareció bajo
   ``-home-user-probe-empty/168b0fdf….jsonl``). Cada comando lleva
   ``--session-id`` propio.
2. **La configuración va por ``--settings``**, no por ``.claude/settings.json``
   del repo: en el harness ese archivo no es fuente de settings
   (:ref:`h-docs-1010`), y el advisor (``advisorModel``) es una clave de
   settings igual que los hooks. La sonda se lo entrega al cliente como
   ``flagSettings``, que sí carga.
3. **Los modelos son identificadores completos**, nunca alias.
4. **El criterio de caché es medible**: la entrada original sobrevivió si el
   ``cache_read`` del turno de vuelta cubre ≥ 95 % del contexto previo al
   cambio — el mismo umbral con que la referencia declara un corte
   (``promptCacheBreakDetection.ts``: caída > 5 % y ≥ 2000 tokens).
5. **El desenlace del advisor se lee de literales del ejecutable**, no se
   supone: «does not support the advisor tool», «cannot be used as an
   advisor», «cannot advise», consentimiento, o iteraciones
   ``advisor_message`` en el ``usage``.

Uso:  python3 .claude/scripts/tests/test_probe_model_switch_cache.py
"""

from __future__ import annotations

import importlib.util
import json
import pathlib
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location(
    "probe_model_switch_cache", HERE / "session" / "probe_model_switch_cache.py"
)
probe = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(probe)

PASS = 0
FAIL = 0


def check(label: str, got, want) -> None:
    global PASS, FAIL
    if got == want:
        PASS += 1
        print(f"OK   {label}")
    else:
        FAIL += 1
        print(f"FALLA {label} — esperado {want!r}, obtenido {got!r}")


# 1. El comando ----------------------------------------------------------------
sid = "11111111-2222-4333-8444-555555555555"
cmd = probe.build_command(
    model="claude-fable-5-1", prompt="Di ok", session_id=sid, settings_path="/x/s.json", cwd="/x/empty"
)
check("build_command: lleva --session-id propio", "--session-id" in cmd and cmd[cmd.index("--session-id") + 1] == sid, True)
check("build_command: modo -p con salida json", "-p" in cmd and cmd[cmd.index("--output-format") + 1] == "json", True)
check("build_command: --settings con la ruta dada", cmd[cmd.index("--settings") + 1], "/x/s.json")
check("build_command: --model con el identificador", cmd[cmd.index("--model") + 1], "claude-fable-5-1")
check("build_command: sin --resume ni --advisor si no se piden", ("--resume" in cmd, "--advisor" in cmd), (False, False))
cmd2 = probe.build_command(
    model="claude-opus-5", prompt="otra vez", session_id=sid, settings_path="/x/s.json", cwd="/x/empty",
    resume=sid, advisor="claude-fable-5-1",
)
check("build_command: --resume y --advisor cuando se piden",
      (cmd2[cmd2.index("--resume") + 1], cmd2[cmd2.index("--advisor") + 1]), (sid, "claude-fable-5-1"))
# Medido en la primera corrida en vivo: «--session-id can only be used with
# --continue or --resume if --fork-session is also specified». La reanudación
# continúa la sesión que nombra; el id propio sólo va en la sesión nueva.
check("build_command: al reanudar NO lleva --session-id (el cliente exigiría --fork-session)", "--session-id" in cmd2, False)
check("child_env: el hijo no hereda CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_SESSION_ID" in probe.child_env({"CLAUDE_CODE_SESSION_ID": "madre", "PATH": "/x"}), False)
try:
    probe.build_command(model="sonnet", prompt="x", session_id=sid, settings_path="/x/s.json", cwd="/x")
    check("build_command: rehúsa un alias", "no lanzó", "ValueError")
except ValueError:
    check("build_command: rehúsa un alias", "ValueError", "ValueError")
try:
    probe.build_command(model="claude-opus-5", prompt="x", session_id="no-es-uuid", settings_path="/x/s.json", cwd="/x")
    check("build_command: rehúsa un session-id que no es UUID", "no lanzó", "ValueError")
except ValueError:
    check("build_command: rehúsa un session-id que no es UUID", "ValueError", "ValueError")
check("new_session_id: es un UUID distinto del de la sesión madre",
      probe.new_session_id() != "168b0fdf-bfe4-590b-b6c0-b6be124c124a" and len(probe.new_session_id()) == 36, True)

# 2. Los settings de la sonda -----------------------------------------------------
with tempfile.TemporaryDirectory() as td:
    marker_dir = pathlib.Path(td)
    s = probe.hook_settings(marker_dir, advisor_model="claude-fable-5-1")
    check("hook_settings: advisorModel declarado", s.get("advisorModel"), "claude-fable-5-1")
    events = sorted(s["hooks"].keys())
    # `Stop` es el control: dispara en TODO turno de -p. Sin su marcador no se
    # puede distinguir «no hubo evento de cambio» de «--settings no carga hooks».
    check("hook_settings: Pre/PostModelSwitch y el control Stop cableados", events, ["PostModelSwitch", "PreModelSwitch", "Stop"])
    cmd_post = s["hooks"]["PostModelSwitch"][0]["hooks"][0]["command"]
    check("hook_settings: el hook vuelca su stdin a un marcador con el nombre del evento",
          str(marker_dir / "PostModelSwitch.json") in cmd_post and "cat" in cmd_post, True)
    s2 = probe.hook_settings(marker_dir)
    check("hook_settings: sin advisor no declara advisorModel", "advisorModel" in s2, False)
    path = probe.write_settings(marker_dir, s)
    check("write_settings: escribe JSON válido en el directorio", json.loads(pathlib.Path(path).read_text())["advisorModel"], "claude-fable-5-1")

# 3. El parseo de la salida -------------------------------------------------------
sample = json.dumps({
    "session_id": sid, "stop_reason": "end_turn", "total_cost_usd": 0.0429336, "result": "ok",
    "usage": {"input_tokens": 2, "cache_creation_input_tokens": 8826, "cache_read_input_tokens": 33133,
              "output_tokens": 4, "cache_creation": {"ephemeral_1h_input_tokens": 8826, "ephemeral_5m_input_tokens": 0},
              "iterations": [{"type": "message"}]},
    "modelUsage": {"claude-sonnet-5": {"costUSD": 0.0419746, "costBasis": "list"},
                   "claude-haiku-4-5-20251001": {"costUSD": 0.000959, "costBasis": "list"}},
})
r = probe.parse_result(sample)
check("parse_result: contexto = entrada + escritura + lectura", r["context_tokens"], 2 + 8826 + 33133)
check("parse_result: TTL real de la escritura", (r["w5m"], r["w1h"]), (0, 8826))
check("parse_result: modelos que el cliente valoró", sorted(r["models"]), ["claude-haiku-4-5-20251001", "claude-sonnet-5"])
check("parse_result: coste del cliente", r["client_cost_usd"], 0.0429336)
check("parse_result: sin iteración de advisor", r["advisor_iterations"], 0)
try:
    probe.parse_result("{no json")
    check("parse_result: rehúsa salida no JSON", "no lanzó", "ValueError")
except ValueError:
    check("parse_result: rehúsa salida no JSON", "ValueError", "ValueError")

# 4. El criterio de caché ---------------------------------------------------------
check("cache_reused: 95 % del contexto previo → sí", probe.cache_reused(prior_context=41961, cache_read=41961 * 0.95), True)
check("cache_reused: por debajo → no", probe.cache_reused(prior_context=41961, cache_read=33133), False)
check("cache_reused: sin contexto previo no decide", probe.cache_reused(prior_context=0, cache_read=100), None)

# 5. El desenlace del advisor ------------------------------------------------------
check("advisor_outcome: iteraciones advisor_message → used",
      probe.advisor_outcome(stdout='{"usage":{"iterations":[{"type":"advisor_message","model":"claude-fable-5-1"}]}}', stderr=""), "used")
check("advisor_outcome: literal de no soporte → unsupported",
      probe.advisor_outcome(stdout="", stderr='Error: The model "claude-opus-5" does not support the advisor tool.'), "unsupported")
check("advisor_outcome: no puede asesorar → cannot_advise",
      probe.advisor_outcome(stdout="", stderr='[AdvisorTool] The model "x" cannot be used as an advisor.'), "cannot_advise")
check("advisor_outcome: consentimiento → consent_required",
      probe.advisor_outcome(stdout="", stderr="Run /model fable in an interactive session to review and enable."), "consent_required")
check("advisor_outcome: sin señal → unknown", probe.advisor_outcome(stdout='{"usage":{"iterations":[{"type":"message"}]}}', stderr=""), "unknown")

# 6. El veredicto de la secuencia --------------------------------------------------
steps = [
    {"step": "fable-1", "model": "claude-fable-5-1", "context_tokens": 41961, "cache_read": 33133, "cache_creation": 8826},
    {"step": "opus-2", "model": "claude-opus-5", "context_tokens": 42010, "cache_read": 33133, "cache_creation": 8877},
    {"step": "fable-3", "model": "claude-fable-5-1", "context_tokens": 42100, "cache_read": 41961, "cache_creation": 139},
]
v = probe.verdict(steps)
check("verdict: la entrada original sobrevivió al cambio (vuelta relee ≥ 95 % del contexto de ida)", v["original_entry_survived"], True)
check("verdict: el destino reescribió el contexto de la conversación", v["target_rewrote_context"], True)
check("verdict: cita los tres pasos", v["steps"], 3)
# Un paso que falló antes de producir usage (exit 1) no tiene cache_read: el
# veredicto lo declara indecidible, no revienta ni inventa un False.
v2 = probe.verdict([steps[0], {"step": "opus-2", "model": "claude-opus-5", "exit": 1, "parse_error": "no JSON"}])
check("verdict: un paso sin usage deja el veredicto en None", (v2["original_entry_survived"], v2["target_rewrote_context"]), (None, None))
# El control: reanudar con el MISMO modelo. Si también pierde, la pérdida es de
# la reanudación y no del cambio; el veredicto compara la vuelta contra él.
ctrl = {"step": "same-4", "model": "claude-fable-5-1", "context_tokens": 42150, "cache_read": 28000, "cache_creation": 14100}
v3 = probe.verdict(steps + [ctrl])
check("verdict: publica la fracción releída de la vuelta y del control", (round(v3["return_read_fraction"], 3), round(v3["control_read_fraction"], 3)), (round(41961 / 41961, 3), round(28000 / 42100, 3)))
check("verdict: si el control pierde lo mismo, la pérdida no se atribuye al cambio", v3["loss_attributable_to_switch"], False)
v4 = probe.verdict(steps + [{**ctrl, "cache_read": 41000}])
check("verdict: si el control relee y la vuelta no, la pérdida sí es del cambio", v4["loss_attributable_to_switch"], v4["return_read_fraction"] < v4["control_read_fraction"] - 0.05)

# 7bis. La matriz por familia -------------------------------------------------------
# Pregunta del ejecutor 2026-09-02: si la caché no la puede leer OTRO modelo,
# ¿la lee un hermano de la misma familia — Fable 5 y Fable 5.1, Opus 4.8 y
# Opus 5? La sonda mide un par por sesión: ida con A, vuelta con B; el par
# A→A es el control que fija el techo de lo que la reanudación sola relee.
check("pares: la lista incluye el control de cada origen y no se repite",
      probe.matrix_pairs(["claude-fable-5-1", "claude-fable-5"]),
      [("claude-fable-5-1", "claude-fable-5-1"), ("claude-fable-5-1", "claude-fable-5"),
       ("claude-fable-5", "claude-fable-5"), ("claude-fable-5", "claude-fable-5-1")])
check("pares: un solo modelo da sólo su control", probe.matrix_pairs(["claude-opus-5"]),
      [("claude-opus-5", "claude-opus-5")])

filas = [
    {"pair": ("claude-fable-5-1", "claude-fable-5-1"), "prior_context": 40000, "cache_read": 38000},
    {"pair": ("claude-fable-5-1", "claude-fable-5"), "prior_context": 40000, "cache_read": 0},
    {"pair": ("claude-opus-5", "claude-opus-4-8"), "prior_context": 40000, "cache_read": 39000},
]
m = probe.matrix_verdict(filas)
check("matriz: el control publica su fracción releída", round(m["claude-fable-5-1→claude-fable-5-1"]["read_fraction"], 2), 0.95)
check("matriz: leer 0 con un hermano es clave NO compartida", m["claude-fable-5-1→claude-fable-5"]["shared"], False)
check("matriz: leer casi todo con otro id sería clave compartida", m["claude-opus-5→claude-opus-4-8"]["shared"], True)
check("matriz: el control se marca como tal, no como hallazgo", m["claude-fable-5-1→claude-fable-5-1"]["is_control"], True)
# El 0.72 que un par cruzado relee NO es conversación compartida: es el
# preámbulo del propio CLI, ya cacheado bajo el modelo de destino por una
# llamada anterior de la misma corrida. El discriminador es el control.
check("matriz: un par cruzado por debajo de su control no comparte conversación",
      probe.matrix_verdict(filas + [{"pair": ("claude-fable-5-1", "claude-opus-5"),
                                     "prior_context": 40000, "cache_read": 28000}]
                           )["claude-fable-5-1→claude-opus-5"]["vs_control"], False)
check("matriz: el control se compara consigo mismo y da True",
      m["claude-fable-5-1→claude-fable-5-1"]["vs_control"], True)
check("matriz: sin control del mismo origen, vs_control no decide",
      probe.matrix_verdict([{"pair": ("x", "y"), "prior_context": 100, "cache_read": 90}])["x→y"]["vs_control"], None)
check("matriz: sin contexto previo el par no decide", probe.matrix_verdict(
      [{"pair": ("a", "b"), "prior_context": 0, "cache_read": 0}])["a→b"]["shared"], None)

# 7. Las precondiciones ------------------------------------------------------------
check("preconditions: sin binario → mensaje y código 2",
      probe.preconditions(claude_bin="/no/existe")[0], 2)

print(f"\ntest_probe_model_switch_cache: {PASS} ok, {FAIL} fallos (alcance medido: {PASS + FAIL} aserciones)")
sys.exit(1 if FAIL else 0)
