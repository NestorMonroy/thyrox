#!/usr/bin/env bash
# Único comando sancionado para citar el costo de un subagente (H-DOCS-170).
#
# Por qué existe: el titular que el harness reporta (subagent_tokens) excluye
# el cache_read por completo — medido en H-DOCS-169: 4.24x de diferencia con
# el costo real ponderado. Este script no requiere que el subagente haya sido
# registrado en agent_store (H-DOCS-167: los hooks de ciclo de vida no
# disparan solos en esta sesión) — busca el transcript directo por agent_id
# y reusa la misma extracción de register_agent_session.py (H-DOCS-168),
# sin duplicar la fórmula.
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Uso: $0 <agent_id>" >&2
    exit 2
fi

AGENT_ID="$1"
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
HOOK="$(dirname "${BASH_SOURCE[0]}")/../../hooks/register_agent_session.py"

TRANSCRIPT=$(find "$CLAUDE_HOME/projects" -name "agent-${AGENT_ID}.jsonl" 2>/dev/null | head -1)
if [[ -z "$TRANSCRIPT" ]]; then
    echo "No se encontró transcript para agent_id=$AGENT_ID bajo $CLAUDE_HOME/projects" >&2
    exit 1
fi

python3 - "$HOOK" "$TRANSCRIPT" "$AGENT_ID" <<'PY'
import importlib.util, sys
hook_path, transcript, agent_id = sys.argv[1:4]
spec = importlib.util.spec_from_file_location("ras", hook_path)
ras = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ras)
u = ras._extract_usage(transcript)
resets = ras._extract_cache_resets(transcript)
titular = u["input_tokens"] + u["cache_creation_tokens"] + u["output_tokens"]
factor = u["equiv_cost"] / titular if titular else 0
print(f"agent_id:        {agent_id}")
print(f"transcript:       {transcript}")
print(f"turnos:           {u['turns']}")
print(f"input:            {u['input_tokens']:,}")
print(f"cache_creation:   {u['cache_creation_tokens']:,}")
print(f"cache_read:       {u['cache_read_tokens']:,}")
print(f"output:           {u['output_tokens']:,}")
print(f"titular_harness:  {titular:,}  (input+cache_creation+output — lo que reporta el harness)")
print(f"equiv_cost:       {u['equiv_cost']:,}  (H-DOCS-135/136: in 1x, cc 1.25x, cr 0.1x, out 5x — cocientes del tier 3/15, H-DOCS-1008)")
print(f"factor:           {factor:.2f}x")
# El USD sale del catálogo del paquete (una sola fuente de precios), con el
# modelo que el transcript declara — no el alias con que se despachó.
import pathlib
sys.path.insert(0, str(pathlib.Path(hook_path).resolve().parents[1] / "scripts" / "agents"))
import model_catalog as mc
catalogo = mc.require_catalog()
modelo = mc.model_of_transcript(pathlib.Path(transcript))
if modelo is None:
    print("modelo:           DESCONOCIDO (el transcript no declara message.model) — sin USD")
else:
    consumo = {k: u[k] for k in ("input_tokens", "cache_creation_tokens", "cache_read_tokens", "output_tokens")}
    try:
        print(f"modelo:           {modelo}  (tier {mc.models_by_id(catalogo)[modelo].get('pricing_tier')})")
        print(f"usd_5m:           {mc.usage_cost_usd(catalogo, modelo, consumo, '5m'):.4f}")
        print(f"usd_1h:           {mc.usage_cost_usd(catalogo, modelo, consumo, '1h'):.4f}  (catálogo {catalogo.get('fuente', '?')})")
    except KeyError as exc:
        print(f"modelo:           {modelo} — sin tier en el catálogo ({exc}); sin USD")
# El ALCANCE de la suma (:ref:`h-docs-427`, tarea #899). Sin el, un transcript
# truncado publica la misma cifra que uno completo: el conteo no dice sobre
# cuantos mensajes se computo. Misma forma que los gates del repo.
vistos = u.get("assistant_messages", 0)
sumados = u.get("usage_messages", 0)
sin_uso = u.get("messages_without_usage", 0)
repetidos = vistos - sin_uso - sumados
detalle = []
if sin_uso:
    detalle.append(f"{sin_uso} sin bloque usage")
if repetidos > 0:
    detalle.append(f"{repetidos} id repetido(s) que el dedup absorbio")
cola = f" — {', '.join(detalle)}" if detalle else ""
print(f"(alcance medido: {sumados} de {vistos} mensajes de assistant{cola})")
if resets:
    print(f"resets_de_cache:  {len(resets)}  (turno(s) {', '.join(str(r) for r in resets)}) — ver H-DOCS-171:")
    print("                  el titular que reportó el harness en el momento de un evento")
    print("                  (éxito o fallo) puede ser ANTERIOR a un reset de caché que")
    print("                  siguió acumulando costo real después de ese momento.")
else:
    print("resets_de_cache:  0")
print()
print("Citar SIEMPRE equiv_cost, nunca titular_harness — ver H-DOCS-169.")
PY
