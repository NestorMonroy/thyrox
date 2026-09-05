#!/usr/bin/env bash
# Prueba del veredicto por journal (#653) — el desenlace del canal Workflow.
#
# Por que existe: `_final_role` lee el rol del ultimo mensaje, y el transcript
# de un agente de workflow termina en el `tool_result` de StructuredOutput —
# rol `user`, la misma firma que «murio a media frase». Sin consultar el
# journal, ese agente entra al store como nivel 4 («murio sin entregar») aunque
# haya entregado. Ver :ref:`h-docs-236`.
#
# CADA caso declara que lo haria fallar, por el sub-patron D de
# `metrica-decide-la-conclusion.md`: un control que no puede fallar no informa.
# El caso 4 es el CONTROL ANULADO — retira el lector de journal y comprueba que
# caen exactamente los casos que dependen de el, ni uno mas.
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUION="$AQUI/../agents/reconciliar_store.py"
fallos=0
casos=0

fallar() { echo "  FALLO: $*"; fallos=$((fallos + 1)); }
caso()   { casos=$((casos + 1)); }

# Arbol sintetico: un journal con un agente que entrego (`result`) y otro que
# solo arranco (`started`), mas un transcript con sidecar que NO esta en ningun
# journal — el canal `Agent`, que debe seguir decidiendose por la firma.
RAIZ="$(mktemp -d)"
trap 'rm -rf "$RAIZ"' EXIT
SESION="$RAIZ/proyecto/sesion-1/subagents"
mkdir -p "$SESION/workflows/wf_prueba"

# El transcript de un agente de workflow: termina en tool_result de rol `user`.
cola_de_workflow() {
  printf '%s\n' \
    '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"voy"}]}}' \
    '{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"Structured output provided successfully"}]}}'
}
cola_de_workflow > "$SESION/agent-aentrego111111.jsonl"
cola_de_workflow > "$SESION/agent-amurio22222222.jsonl"
# El canal Agent: transcript con sidecar y cierre normal en rol assistant.
printf '%s\n' \
  '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"listo"}]}}' \
  > "$SESION/agent-aconsidecar333.jsonl"
printf '{"subagent_type":"general-purpose"}\n' > "$SESION/agent-aconsidecar333.meta.json"

printf '%s\n' \
  '{"type":"started","key":"k1","agentId":"aentrego111111"}' \
  '{"type":"result","key":"k1","agentId":"aentrego111111","result":{"ok":true}}' \
  '{"type":"started","key":"k2","agentId":"amurio22222222"}' \
  > "$SESION/workflows/wf_prueba/journal.jsonl"

# Los transcripts tienen que parecer viejos: `_sigue_escribiendo` deja en
# `running` todo lo que creció hace poco, y eso enmascararia el veredicto.
find "$SESION" -name '*.jsonl' -exec touch -d '3 hours ago' {} +

veredicto() {   # $1 = agent_id ; imprime "status|procedencia"
  AGENT_STORE_PROJECTS_DIR="$RAIZ" python3 - "$GUION" "$SESION/agent-$1.jsonl" <<'PY'
import importlib.util, os, pathlib, sys
spec = importlib.util.spec_from_file_location("rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
mod._JOURNAL_CACHE = None
estado, fuente = mod._veredicto(pathlib.Path(sys.argv[2]))
print(f"{estado}|{fuente}")
PY
}

echo "== caso 1: el journal declara result -> completed/journal =="
# Falla si: el lector de journal no existe, no indexa por agentId, o el
# `result` no gana sobre el `started` de la misma corrida.
caso
got="$(veredicto aentrego111111)"
[[ "$got" == "completed|journal" ]] || fallar "esperaba completed|journal, obtuve '$got'"

echo "== caso 2: el journal declara solo started -> failed/journal =="
# Falla si: `started` sin `result` se lee como entrega, o cae a `running` —
# que es lo que hacia antes de #653 y producia el nivel 4 sin causa.
caso
got="$(veredicto amurio22222222)"
[[ "$got" == "failed|journal" ]] || fallar "esperaba failed|journal, obtuve '$got'"

echo "== caso 3: con sidecar manda la firma del transcript, no el journal =="
# Falla si: el journal se consulta para el canal `Agent`. La separacion de
# canales es la premisa de H-DOCS-181 y no debe borrarse al añadir el journal.
caso
got="$(veredicto aconsidecar333)"
[[ "$got" == "completed|transcript" ]] || fallar "esperaba completed|transcript, obtuve '$got'"

echo "== caso 4: CONTROL ANULADO — sin lector de journal caen 1 y 2, no el 3 =="
# El unico caso que prueba que la suite mide lo que dice medir: se sustituye
# `_journal_index` por un mapa vacio (la conducta anterior a #653) y se exige
# que caigan EXACTAMENTE los dos casos que dependen de el.
caso
anulado="$(AGENT_STORE_PROJECTS_DIR="$RAIZ" python3 - "$GUION" "$SESION" <<'PY'
import importlib.util, os, pathlib, sys
spec = importlib.util.spec_from_file_location("rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
mod._journal_index = lambda: {}          # <- la guarda retirada
base = pathlib.Path(sys.argv[2])
for aid in ("aentrego111111", "amurio22222222", "aconsidecar333"):
    estado, fuente = mod._veredicto(base / f"agent-{aid}.jsonl")
    print(f"{aid}={estado}|{fuente}")
PY
)"
esperado_anulado="aentrego111111=running|None
amurio22222222=running|None
aconsidecar333=completed|transcript"
if [[ "$anulado" != "$esperado_anulado" ]]; then
  fallar "el control anulado no cae como se predijo:"
  echo "--- obtenido ---"; echo "$anulado"
  echo "--- esperado ---"; echo "$esperado_anulado"
fi

echo "== caso 5: el arbol REAL — ninguna fila ALCANZABLE queda sin procedencia =="
# Control positivo del repo, no fabricado: toda fila con veredicto
# (`completed`/`failed`) CUYO TRANSCRIPT SIGUE EN DISCO debe declarar de que
# instrumento salio. Falla si el barrido escribe un estado sin su
# `outcome_source`, que es lo que hace inauditable el nivel de retencion.
#
# El universo se acota a lo alcanzable a proposito. Una fila cuyo transcript ya
# no existe no la puede reparar ningun barrido: exigirle procedencia produce un
# rojo que no distingue «el barrido fallo» de «el archivo se fue con el
# contenedor» — el sub-patron D de `metrica-decide-la-conclusion.md`, cometido
# en el propio control. Esa deuda va declarada en el hallazgo, no aqui.
caso
STORE="$AQUI/../../agent-results/agent_store.sqlite3"
if [[ -f "$STORE" ]]; then
  huerfanas="$(python3 - "$STORE" <<'PY'
import pathlib, sqlite3, sys
c = sqlite3.connect(sys.argv[1])
cols = {r[1] for r in c.execute("PRAGMA table_info(agent_sessions)")}
if "outcome_source" not in cols:
    print("SIN_COLUMNA"); raise SystemExit
en_disco = {p.name[len("agent-"):-len(".jsonl")]
            for p in (pathlib.Path.home() / ".claude" / "projects")
            .rglob("subagents/agent-*.jsonl")}
sin = [r[0] for r in c.execute(
    "SELECT agent_id FROM agent_sessions "
    "WHERE status IN ('completed','failed') AND outcome_source IS NULL")]
print(len([a for a in sin if a in en_disco]))
PY
)"
  if [[ "$huerfanas" == "SIN_COLUMNA" ]]; then
    fallar "el store no tiene la columna outcome_source — la migracion aditiva no corrio"
  elif [[ "$huerfanas" != "0" ]]; then
    fallar "$huerfanas fila(s) alcanzables con veredicto y sin procedencia; el nivel no es auditable"
  fi
else
  echo "  (store ausente en este arbol — caso omitido, no da verde falso)"
  casos=$((casos - 1))
fi

echo
if [[ $fallos -eq 0 ]]; then
  echo "OK: $casos de $casos casos en verde"
  exit 0
fi
echo "FALLO: $fallos de $casos casos"
exit 1
