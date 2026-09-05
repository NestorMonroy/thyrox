#!/usr/bin/env bash
# Pruebas de las columnas de uso/costo de agent_sessions (H-DOCS-168).
#
# El ejecutor señaló que el costo real de un subagente (visible sólo en el
# bloque <usage> efímero del harness, p. ej. 301 172 tokens de un agente de
# prueba de esta misma sesión) no quedaba en ningún lado consultable — sólo
# como prosa en el log crudo de save-agent-result.mjs. Estas pruebas cubren:
#
#   1. La migración ALTER TABLE contra una base con el esquema VIEJO (el
#      caso real: agent_store.sqlite3 de producción ya existía sin estas
#      columnas cuando se escribió este cambio).
#   2. El dedup por message.id (mismo defecto que H-DOCS-135/H-DOCS-136 ya
#      midieron para save-agent-result.mjs: sin dedup, un turno con varias
#      tool-calls infla el conteo).
#   3. El CLI (`actualizar-sesion`) escribiendo los valores extraídos.
#
# Control positivo real (no fabricado, per hallazgo-abierto-genera-sucesor.md):
# esta lógica se probó ANTES contra el transcript real de un subagente de
# esta sesión (agentId a705eddb0a5b1496c) y los números resultantes
# (equiv_cost=376472, turns=1, model=sonnet) coincidieron exactamente con
# el bloque <usage> real reportado por el harness. Documentado en
# hallazgo-H-DOCS-168-*.rst. Este archivo usa un fixture sintético más
# pequeño para que la suite no dependa de que ese transcript real siga
# existiendo en el filesystem del contenedor.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
HOOK=.claude/hooks/register_agent_session.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

# Igualdad y contención NO son el mismo contrato, y confundirlas produce un test
# que se rompe cada vez que el código gana una capacidad legítima.
#
# `metadata_json` es una RANURA COMPARTIDA: recoge lo que el sidecar traiga sin
# columna propia **y** el `perfil_ejecucion` que el hook calcula
# (`register_agent_session.py:642`). Una aserción de igualdad exacta sobre esa
# ranura afirma que nadie más puede escribir en ella — que es lo contrario de
# lo que la ranura es. Falló al añadirse el perfil (#598/#599), y el defecto no
# estaba en el código sino aquí. Ver H-DOCS-224.
afirmar_contiene() {  # afirmar_contiene <nombre> <json-esperado> <json-obtenido>
    if python3 -c '
import json, sys

def contiene(esperado, obtenido):
    """Contención RECURSIVA: un dict anidado también se compara por sus claves.

    Sin la recursión, afirmar `{"perfil_ejecucion": {"turnos_sinteticos": 1}}`
    exigiría que el perfil entero fuese ese único par — otra igualdad exacta,
    disfrazada un nivel más abajo.
    """
    if isinstance(esperado, dict) and isinstance(obtenido, dict):
        return all(k in obtenido and contiene(v, obtenido[k])
                   for k, v in esperado.items())
    return esperado == obtenido

sys.exit(0 if contiene(json.loads(sys.argv[1]), json.loads(sys.argv[2])) else 1)
' "$2" "$3" 2>/dev/null; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        no contiene=[%s] en=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

leer_campo() {  # leer_campo <db> <agent_id> <columna>
    python3 -c "
import sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
row = conn.execute('SELECT $3 FROM agent_sessions WHERE agent_id=?', (sys.argv[2],)).fetchone()
print('<NULO>' if (row is None or row[0] is None) else row[0])
" "$1" "$2"
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)
CLAUDE_DIR="$TMP/.claude/agent-results"
DB="$CLAUDE_DIR/agent_store.sqlite3"

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?
python3 -c "import ast; ast.parse(open('$HOOK').read())"; afirmar "register_agent_session.py parsea" 0 $?

echo "== 2. migración: base con esquema VIEJO (sin columnas de uso) gana las columnas al reconectar =="
mkdir -p "$CLAUDE_DIR"
python3 -c "
import sqlite3
c = sqlite3.connect('$DB')
c.execute('''CREATE TABLE agent_sessions (
    agent_id TEXT PRIMARY KEY, subagent_type TEXT NOT NULL, session_id TEXT NOT NULL,
    status TEXT NOT NULL, output_key TEXT, started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, timeout_at TEXT)''')
c.commit()
"
antes=$(python3 -c "
import sqlite3
c = sqlite3.connect('$DB')
print(len([r for r in c.execute('PRAGMA table_info(agent_sessions)')]))
")
afirmar "esquema viejo tiene 8 columnas" "8" "$antes"
python3 "$STORE" listar-sesiones --claude-dir "$CLAUDE_DIR" >/dev/null 2>&1
# La aserción NO fija un total. Un total es una propiedad de un artefacto vivo
# —cada columna legítima que se añada lo rompe— y el arreglo natural sería
# bumpear el número, que es tratar el síntoma y garantizar la reincidencia
# (calibration-verified-numbers.md, corolario de la cifra transcrita). Se
# compara contra la FUENTE DE VERDAD: las claves de _SESSION_USAGE_COLUMNS.
# Así, añadir una columna no rompe nada y RETIRAR una sí falla, que es el
# fenómeno que esta prueba existe para vigilar.
faltantes=$(python3 -c "
import importlib.util, sqlite3, sys
spec = importlib.util.spec_from_file_location('_store', '$STORE')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
c = sqlite3.connect('$DB')
reales = {r[1] for r in c.execute('PRAGMA table_info(agent_sessions)')}
print(' '.join(sorted(set(m._SESSION_USAGE_COLUMNS) - reales)) or 'ninguna')
")
afirmar "tras reconectar están TODAS las columnas declaradas por el migrado" \
        "ninguna" "$faltantes"

echo "== 3. dedup por message.id: 2 líneas con el MISMO id cuentan como 1 turno =="
TRANSCRIPT="$TMP/agent-AGD.jsonl"
cat > "$TRANSCRIPT" <<'EOF'
{"type":"assistant","message":{"id":"msg_1","role":"assistant","content":[{"type":"tool_use"}],"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":0,"output_tokens":5}}}
{"type":"assistant","message":{"id":"msg_1","role":"assistant","content":[{"type":"text","text":"resultado final"}],"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":0,"output_tokens":5}}}
EOF
# esperado: turns=1 (no 2), input=10, cache_creation=100, output=5,
# equiv = 10 + 1.25*100 + 0.1*0 + 5*5 = 10 + 125 + 0 + 25 = 160
salida=$(python3 - "$HOOK" "$TRANSCRIPT" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("ras", sys.argv[1])
ras = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ras)
u = ras._extract_usage(sys.argv[2])
print(u['turns'], u['input_tokens'], u['cache_creation_tokens'], u['output_tokens'], u['equiv_cost'])
PY
)
afirmar "dedup por message.id: 1 turno, no 2, equiv_cost=160" "1 10 100 5 160" "$salida"

echo "== 4. hook completo (funciones + CLI): extrae uso + meta.json y actualiza agent_sessions =="
cat > "$TMP/agent-AGD.meta.json" <<'EOF'
{"agentType":"general-purpose","description":"prueba sintetica","model":"sonnet"}
EOF
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" \
    --agent-id AGD --subagent-type general-purpose --session-id S1 --status running >/dev/null
python3 - "$HOOK" "$STORE" "$CLAUDE_DIR" "$TRANSCRIPT" <<'PY'
import importlib.util, sys, subprocess
hook_path, store_path, claude_dir, transcript = sys.argv[1:5]
spec = importlib.util.spec_from_file_location("ras", hook_path)
ras = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ras)
uso = ras._extract_usage(transcript)
meta = ras._extract_meta(transcript)
cmd = [sys.executable, store_path, "actualizar-sesion", "--claude-dir", claude_dir,
       "--agent-id", "AGD", "--status", "completed"]
for flag, key in (("--turns", "turns"), ("--input-tokens", "input_tokens"),
                   ("--cache-creation-tokens", "cache_creation_tokens"),
                   ("--cache-read-tokens", "cache_read_tokens"),
                   ("--output-tokens", "output_tokens"), ("--equiv-cost", "equiv_cost")):
    if key in uso:
        cmd += [flag, str(uso[key])]
# El caso reproduce el cableado REAL del hook (register_agent_session.py:619),
# no uno propio. La version anterior pasaba `meta["model"]` crudo a `--model` y
# afirmaba `model == "sonnet"` — el contrato ANTERIOR a #598, que #600 declaro
# invalido: un alias no fija version y por tanto no es ponderable (:ref:`h-docs-220`).
# El caso seguia verde porque su propia tuberia saltaba las dos funciones que
# el hook usa. Ver :ref:`h-docs-241`.
modelo = uso.get("derived_model") or ras.normalize_model(meta.get("model"))
if modelo:
    cmd += ["--model", modelo]
alias = ras.normalize_model_alias(meta.get("model"))
if alias:
    cmd += ["--model-alias", alias]
if meta.get("description"):
    cmd += ["--description", meta["description"]]
subprocess.run(cmd, check=True)
PY
afirmar "status queda completed" "completed" "$(leer_campo "$DB" AGD status)"
# El sidecar declara un ALIAS. Falla si normalize_model deja de filtrarlo —
# que es exactamente lo que ninguna aserción medía antes.
afirmar "un alias del sidecar NO entra en model" "<NULO>" "$(leer_campo "$DB" AGD model)"
afirmar "el alias del sidecar entra en model_alias" "sonnet" "$(leer_campo "$DB" AGD model_alias)"
afirmar "description se pobló desde meta.json" "prueba sintetica" "$(leer_campo "$DB" AGD description)"
afirmar "equiv_cost quedó en la fila" "160" "$(leer_campo "$DB" AGD equiv_cost)"
afirmar "turns quedó en la fila (1, no 2)" "1" "$(leer_campo "$DB" AGD turns)"

echo "== 5. sin transcript_path, actualizar-sesion no rompe (columnas quedan NULL) =="
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" \
    --agent-id AGE --subagent-type general-purpose --session-id S2 --status running >/dev/null
python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE_DIR" \
    --agent-id AGE --status completed >/dev/null
afirmar "sin datos de uso, status igual cierra" "completed" "$(leer_campo "$DB" AGE status)"
afirmar "sin datos de uso, equiv_cost queda NULO" "<NULO>" "$(leer_campo "$DB" AGE equiv_cost)"

echo "== 6. procedencia: source, tool_use_id y metadata_json (H-DOCS-178) =="
# Adaptado de tdam: MemoryCore/src/metadata/store/sqlite-adapter.ts:219
# (meta_participation_logs registra la participación como FILA, con
# `source ... DEFAULT 'unknown'` y un `metadata_json` de extensión).
# Estas tres aserciones existen porque el ejecutor corrigió el encuadre: la
# procedencia se registra en el store, no se espera de un directorio efímero.
META="$TMP/agent-AGP.meta.json"
cat > "$META" <<'EOF'
{"agentType":"general-purpose","description":"sonda","toolUseId":"toolu_XYZ",
 "spawnDepth":1,"model":"sonnet","claveNueva":"que-el-harness-agregue"}
EOF
cp "$TMP/agent-AGD.jsonl" "$TMP/agent-AGP.jsonl" 2>/dev/null || echo '{"type":"assistant","message":{"id":"m","role":"assistant","content":[{"type":"text","text":"fin"}],"usage":{"input_tokens":1,"output_tokens":1}}}' > "$TMP/agent-AGP.jsonl"

python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" --agent-id AGP \
    --subagent-type desconocido --session-id S1 --status running >/dev/null
# AGENT_STORE_CLAUDE_DIR desvía el hook al store temporal. Sin ese override el
# hook escribe en el store REAL de docs (lleva `--repo docs` fijo), así que esta
# sección o contaminaría el artefacto que audita o mediría la base equivocada.
printf '{"agent_id":"AGP","transcript_path":"%s"}' "$TMP/agent-AGP.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" >/dev/null 2>&1

afirmar "source registra la vía de captura (hook)" "hook" \
        "$(leer_campo "$DB" AGP source)"
afirmar "tool_use_id sale del toolUseId del sidecar" "toolu_XYZ" \
        "$(leer_campo "$DB" AGP tool_use_id)"
afirmar_contiene "una clave desconocida del sidecar NO se pierde: va a metadata_json" \
        '{"claveNueva": "que-el-harness-agregue"}' \
        "$(leer_campo "$DB" AGP metadata_json)"
# La otra mitad de la ranura, y por eso el contrato es contención: el hook
# escribe su propio perfil junto a lo que vino del sidecar.
afirmar_contiene "el perfil de ejecución comparte ranura sin pisar al sidecar" \
        '{"perfil_ejecucion": {"turnos_sinteticos": 1}}' \
        "$(leer_campo "$DB" AGP metadata_json)"
afirmar "el sidecar rellena subagent_type cuando el alta dijo 'desconocido'" \
        "general-purpose" "$(leer_campo "$DB" AGP subagent_type)"

# NULLIF: un tipo YA correcto no se pisa con uno posterior.
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" --agent-id AGQ \
    --subagent-type Explore --session-id S1 --status running >/dev/null
python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE_DIR" --agent-id AGQ \
    --status completed --subagent-type general-purpose >/dev/null
afirmar "NULLIF protege un subagent_type ya correcto" "Explore" \
        "$(leer_campo "$DB" AGQ subagent_type)"

echo "== 7. CONTROL — el modelo lo manda el transcript, no el sidecar (H-DOCS-219/220) =="
# Ninguna aserción medía este eje: `normalize_model` y `normalize_model_alias`
# corrían bajo cuatro suites y ninguna distinguía sus ramas (:ref:`h-docs-241`).
# Aquí el sidecar dice `sonnet` (alias) y el transcript declara el identificador
# que SIRVIÓ el turno. Falla si el hook vuelve a preferir el sidecar, o si
# `normalize_model` deja de filtrar el alias.
cat > "$TMP/agent-AGM.meta.json" <<'EOF'
{"agentType":"general-purpose","description":"sonda de modelo","model":"sonnet"}
EOF
cat > "$TMP/agent-AGM.jsonl" <<'EOF'
{"type":"assistant","message":{"id":"m1","role":"assistant","model":"claude-opus-5","content":[{"type":"text","text":"fin"}],"usage":{"input_tokens":1,"output_tokens":1}}}
EOF
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" --agent-id AGM \
    --subagent-type general-purpose --session-id S1 --status running >/dev/null
printf '{"agent_id":"AGM","transcript_path":"%s"}' "$TMP/agent-AGM.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" >/dev/null 2>&1
afirmar "model sale del transcript, verbatim" "claude-opus-5" \
        "$(leer_campo "$DB" AGM model)"
afirmar "el alias del sidecar no pisa al identificador" "sonnet" \
        "$(leer_campo "$DB" AGM model_alias)"

echo "== 8. CONTROL — la causa de muerte declarada por el transcript (#600) =="
# `api_error` tampoco tenía una sola aserción: colapsarla a None dejaba las tres
# columnas en NULL y las cuatro suites seguían verdes (:ref:`h-docs-241`).
# El cliente escribe el fallo como evento propio; esto no es heurística.
cat > "$TMP/agent-AGE2.jsonl" <<'EOF'
{"type":"assistant","message":{"id":"m1","role":"assistant","model":"claude-opus-5","content":[{"type":"text","text":"trabajando"}],"usage":{"input_tokens":1,"output_tokens":1}}}
{"quotaLimits":{"status":"rejected","rateLimitType":"five_hour","resetsAt":"2026-08-21T04:00:00Z"}}
{"isApiErrorMessage":true,"error":"rate_limit","apiErrorStatus":429,"message":{"model":"<synthetic>","content":[{"type":"text","text":"5-hour limit reached"}]}}
EOF
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" --agent-id AGE2 \
    --subagent-type general-purpose --session-id S1 --status running >/dev/null
printf '{"agent_id":"AGE2","transcript_path":"%s"}' "$TMP/agent-AGE2.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" >/dev/null 2>&1
afirmar "api_error_status sale del apiErrorStatus declarado" "429" \
        "$(leer_campo "$DB" AGE2 api_error_status)"
afirmar "rate_limit_type sale del quotaLimits rechazado" "five_hour" \
        "$(leer_campo "$DB" AGE2 rate_limit_type)"
# El <synthetic> del mensaje fabricado por el cliente NO es un modelo, y por eso
# el turno del error no debe contaminar la columna: la sirvió el turno real.
afirmar "el <synthetic> del error no entra en model" "claude-opus-5" \
        "$(leer_campo "$DB" AGE2 model)"

echo "== 9. CONTROL POSITIVO REAL — transcript versionado, no fabricado (#657) =="
# Los fixtures de las secciones 1-8 los escribí yo desde mi modelo del formato,
# así que confirman ese modelo, no el formato. Éste es un transcript REAL
# anonimizado con `anonymize_transcript.py` y versionado en el repo — el canal
# que #657 abrió para que la cobertura no dependa del contenedor.
#
# Y NO CONFIRMÓ EL SINTÉTICO: en el caso 8 asumí que `quotaLimits` acompaña al
# error de límite. El real trae `error: rate_limit` y `apiErrorStatus: 429` SIN
# `quotaLimits`, así que `rate_limit_type` queda en NULL. Las tres señales son
# independientes; el fixture fabricado no podía enseñarlo.
FREAL=.claude/scripts/tests/fixtures/claude-home/projects/-real/subagents
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" --agent-id AGR \
    --subagent-type general-purpose --session-id S1 --status running >/dev/null
printf '{"agent_id":"AGR","transcript_path":"%s"}' \
    "$FREAL/agent-a163953c6da4980e2.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" >/dev/null 2>&1
afirmar "el 429 real llega a api_error_status" "429" \
        "$(leer_campo "$DB" AGR api_error_status)"
afirmar "rate_limit_type queda NULO: el real no trae quotaLimits" "<NULO>" \
        "$(leer_campo "$DB" AGR rate_limit_type)"
afirmar "client_version sale del nivel superior de la línea" "2.1.224" \
        "$(leer_campo "$DB" AGR client_version)"

# Y el fixture de contabilidad, con los valores calculados aparte (ver el
# encabezado de test-costo-agente.sh: el dedup conserva la ULTIMA aparición de
# cada message.id, que es la contabilidad completa del turno).
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE_DIR" --agent-id AGC \
    --subagent-type general-purpose --session-id S1 --status running >/dev/null
printf '{"agent_id":"AGC","transcript_path":"%s"}' \
    "$FREAL/agent-ab5a332fb0711f638.jsonl" \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" >/dev/null 2>&1
afirmar "equiv_cost del transcript real" "595654" "$(leer_campo "$DB" AGC equiv_cost)"
afirmar "turnos del transcript real"     "10"     "$(leer_campo "$DB" AGC turns)"

echo "== 10. denominador: la suma declara sobre cuántos mensajes se computó (#899) =="
# H-DOCS-427: una cifra de telemetría sin su universo no es un resultado. Un
# transcript truncado publica el mismo `equiv_cost` que uno completo — el
# conteo no dice sobre cuántos mensajes se computó. `_extract_usage` devuelve
# ahora el ALCANCE junto a la suma, y `costo-agente.sh` lo imprime.
#
# El hueco entre `assistant_messages` y `usage_messages` tiene DOS causas y van
# por separado: un mensaje sin bloque `usage`, y un `message.id` repetido que el
# dedup absorbe. La segunda es el mecanismo funcionando (H-DOCS-135/136); la
# primera sería un defecto del transcript. Colapsarlas escondería cuál ocurrió.
#
# La primera causa NO tiene positivo real: medido sobre los 277 transcripts en
# disco, **0** traen un mensaje de assistant sin `usage`. Por eso este fixture es
# sintético — y se declara, en vez de dejar creer que reproduce algo observado.
cat > "$TMP/agent-AGN.jsonl" <<'EOF'
{"type":"assistant","message":{"id":"msg_1","role":"assistant","content":[{"type":"tool_use"}],"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":0,"output_tokens":5}}}
{"type":"assistant","message":{"id":"msg_1","role":"assistant","content":[{"type":"text","text":"mismo turno"}],"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":0,"output_tokens":5}}}
{"type":"assistant","message":{"id":"msg_2","role":"assistant","content":[{"type":"text","text":"sin bloque usage"}]}}
{"type":"user","message":{"role":"user","content":"no cuenta: no es de assistant"}}
EOF
salida=$(python3 - "$HOOK" "$TMP/agent-AGN.jsonl" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("ras", sys.argv[1])
ras = importlib.util.module_from_spec(spec); spec.loader.exec_module(ras)
u = ras._extract_usage(sys.argv[2])
print(u['usage_messages'], u['assistant_messages'], u['messages_without_usage'])
PY
)
# 3 de assistant (el `user` no cuenta) · 1 sumado · 1 sin usage · 1 absorbido
afirmar "el alcance separa las dos causas del hueco" "1 3 1" "$salida"

# CONTROL POSITIVO REAL de la causa que SÍ ocurre en el corpus: el mismo
# transcript versionado del caso 9. 16 mensajes de assistant, 10 ids únicos —
# los 6 restantes son dedup, no huecos.
real=$(python3 - "$HOOK" "$FREAL/agent-ab5a332fb0711f638.jsonl" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("ras", sys.argv[1])
ras = importlib.util.module_from_spec(spec); spec.loader.exec_module(ras)
u = ras._extract_usage(sys.argv[2])
print(u['usage_messages'], u['assistant_messages'], u['messages_without_usage'])
PY
)
afirmar "transcript real: 10 de 16, todo el hueco es dedup" "10 16 0" "$real"

# Que el consumidor lo PUBLIQUE lo mide la suite de su propio guion
# (`test-costo-agente.sh`, seccion 8): ahi vive el helper que corre
# `costo-agente.sh` contra los fixtures reales. Aqui se mide el productor.

# El resumen y el exit van AL FINAL, siempre. Estuvieron a media hoja y las
# cinco aserciones de la sección 6 quedaron tras el `exit`: nunca corrieron, y
# el conteo publicado ("12 ok, 0 fallos") era correcto sobre lo que midió y
# falso sobre lo que el archivo declaraba probar.
echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
