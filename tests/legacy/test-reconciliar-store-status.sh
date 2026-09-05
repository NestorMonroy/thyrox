#!/usr/bin/env bash
# Pruebas de `reconciliar_store.py::_status` — el desenlace que la
# reconciliación afirma sobre un transcript (H-DOCS-181).
#
# Qué protege, y por qué el defecto era invisible
# ----------------------------------------------
# `_status` derivaba el desenlace del ROL DEL ÚLTIMO MENSAJE: `assistant` →
# completed, `user` → failed. Esa heurística está calibrada sobre la forma de
# la herramienta `Agent`, donde el texto final del asistente ES el canal de
# retorno: si falta, el agente no entregó.
#
# En el canal `Workflow` la premisa es falsa. El valor de retorno viaja por el
# journal de la corrida, no por el texto final, así que terminar sin texto es
# su forma NORMAL. Medido en H-DOCS-181 sobre los 190 transcripts reales:
#
#   - sin sidecar (canal Workflow): 102, de los cuales 91 terminan en `user`
#     — y 70 de esos 91 pertenecen a workflows con status completed y result
#     no vacío. NO fallaron.
#   - con sidecar (herramienta Agent): 88, de los cuales 1 termina en `user`.
#
# El 89 % de "fallo" era la forma del canal. La cifra tenía su Observation y
# pasaba el react-gate; lo que fallaba era qué medía.
#
# El discriminador es la PRESENCIA DEL SIDECAR: de 102 sin sidecar, 96 están
# citados en el journal de algún workflow; de 88 con sidecar, 0 lo están.
#
# El par que discrimina
# ---------------------
# Los casos 3 y 4 son el par: MISMO transcript (termina en rol `user`), y el
# veredicto cambia sólo por el sidecar. Un test que sólo probara uno de los dos
# pasaría con la versión vieja del código — que es exactamente lo que hacía
# falta atrapar.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

SCRIPT=.claude/scripts/agents/reconciliar_store.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)

# `_status` se ejercita por import directo: cargar el módulo entero arrastraría
# su hook y su ruta de store reales, y este test no debe tocar ninguno.
estado() {  # estado <ruta-transcript>
    python3 - "$SCRIPT" "$1" <<'PY'
import importlib.util, sys, pathlib
spec = importlib.util.spec_from_file_location("_rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print(mod._status(pathlib.Path(sys.argv[2])))
PY
}

# Un transcript recién escrito está VIVO para `_sigue_escribiendo`, que corta
# antes de leer sidecar ni rol y devuelve `running`. Sin envejecerlo, este test
# mide la frescura del archivo y concluye sobre el canal — la ceguera exacta de
# `metrica-decide-la-conclusion.md`, aquí dentro de su propia suite.
#
# Medido al detectarlo (2026-08-20): con el archivo fresco los cuatro casos dan
# `running`. Dos fallaban y **dos pasaban por la razón equivocada** — los que
# esperan `running` de todos modos. Ésos son los peores: un verde accidental no
# se investiga, así que la lógica de sidecar podía romperse sin que nadie lo
# viera. Ver H-DOCS-224.
#
# El envejecimiento vive en los helpers, no en cada caso, para que un caso nuevo
# lo herede sin acordarse.
envejecer() {  # envejecer <ruta> — más allá de SILENCIO_MAXIMO_S (900 s)
    touch -d '2 hours ago' "$1"
}

# Las dos formas reales, verbatim del esquema que `_final_role` lee (`type`).
cortado() {  # cortado <ruta> — termina en rol user, como los 91 medidos
    cat > "$1" <<'EOF'
{"type":"user","message":{"role":"user","content":"arranca"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"voy"}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"x"}]}}
EOF
    envejecer "$1"
}
cerrado() {  # cerrado <ruta> — termina en rol assistant
    cat > "$1" <<'EOF'
{"type":"user","message":{"role":"user","content":"arranca"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"listo"}]}}
EOF
    envejecer "$1"
}

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$SCRIPT').read())"; afirmar "reconciliar_store.py parsea" 0 $?

echo "== 2. CON sidecar + cierre normal → completed =="
T2="$TMP/agent-aaa.jsonl"; cerrado "$T2"; echo '{"agentType":"x"}' > "$TMP/agent-aaa.meta.json"
afirmar "la forma de la herramienta Agent que entregó" "completed" "$(estado "$T2")"

echo "== 3. CON sidecar + cortado → failed (la heurística SÍ aplica aquí) =="
T3="$TMP/agent-bbb.jsonl"; cortado "$T3"; echo '{"agentType":"x"}' > "$TMP/agent-bbb.meta.json"
afirmar "un agente de la herramienta Agent cortado sigue siendo failed" \
        "failed" "$(estado "$T3")"

echo "== 4. SIN sidecar + cortado → running, NO failed (H-DOCS-181) =="
# El caso que reproduce los 91. Con la versión vieja de `_status` esto daba
# `failed` y era el 89 %: 70 de esos 91 venían de workflows que completaron
# con result. Mismo transcript que el caso 3 — sólo cambia el sidecar.
T4="$TMP/agent-ccc.jsonl"; cortado "$T4"
afirmar "el canal Workflow cortado NO se declara failed" "running" "$(estado "$T4")"

echo "== 5. SIN sidecar + cierre normal → running tampoco se declara completed =="
# El error simétrico: 15 de los 91 SÍ venían de workflows caídos, así que
# inventar `completed` sería tan falso como inventar `failed`. Sin sidecar el
# transcript no dice el desenlace, y punto.
T5="$TMP/agent-ddd.jsonl"; cerrado "$T5"
afirmar "sin sidecar no se afirma desenlace en ninguna dirección" \
        "running" "$(estado "$T5")"

echo "== 6. transcript ilegible → running (contrato previo, sin regresión) =="
T6="$TMP/agent-eee.jsonl"; printf 'esto no es json\n' > "$T6"; envejecer "$T6"
echo '{"agentType":"x"}' > "$TMP/agent-eee.meta.json"
afirmar "un transcript que no parsea sigue sin afirmar desenlace" \
        "running" "$(estado "$T6")"

echo "== 6-bis. el guard de frescura gana sobre la firma del rol =="
# El caso que faltaba, y su ausencia es lo que dejó a los casos 4 y 5 pasando
# por la razón equivocada: NADA medía la guarda, así que su efecto se leía como
# si fuera el veredicto de sidecar. Es el par exacto del caso 3 — mismo
# transcript, mismo sidecar, y lo único que cambia es el `mtime`.
T6B="$TMP/agent-fff.jsonl"; cortado "$T6B"
echo '{"agentType":"x"}' > "$TMP/agent-fff.meta.json"
touch "$T6B"   # recién escrito: el agente sigue vivo
afirmar "un transcript que acaba de crecer NO se cierra como failed" \
        "running" "$(estado "$T6B")"
envejecer "$T6B"
afirmar "el mismo transcript, ya en silencio, sí se cierra" \
        "failed" "$(estado "$T6B")"

echo "== 7. el discriminador es el sidecar, y se mide como tal =="
afirmar "_tiene_sidecar ve el .meta.json"    "True"  "$(python3 - "$SCRIPT" "$T2" <<'PY'
import importlib.util, sys, pathlib
spec = importlib.util.spec_from_file_location("_rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
print(mod._tiene_sidecar(pathlib.Path(sys.argv[2])))
PY
)"
afirmar "_tiene_sidecar es False cuando no está" "False" "$(python3 - "$SCRIPT" "$T4" <<'PY'
import importlib.util, sys, pathlib
spec = importlib.util.spec_from_file_location("_rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
print(mod._tiene_sidecar(pathlib.Path(sys.argv[2])))
PY
)"

echo "== 8. el ancla del store, que la mudanza a agents/ rompio =="
# Cuarta victima de `docs@d566c180` y la unica que no fallaba: `store_db()`
# derivaba `.claude/scripts/agent-results/`, y el guard de `_ids_en_store`
# leia su ausencia como store vacio. El pase seguia en verde y volvia a dar
# de alta los 278 transcripts cada vez: 54.6 s contra 11.6 s. Ver h-docs-498.
afirmar "store_db() sin --claude-dir resuelve a un archivo que existe" \
        "True" "$(python3 - "$SCRIPT" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("_rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
print(mod.store_db().exists())
PY
)"
afirmar "y el ancla es .claude, no .claude/scripts" \
        ".claude/agent-results/agent_store.sqlite3" "$(python3 - "$SCRIPT" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("_rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
partes = mod.store_db().parts
print("/".join(partes[partes.index(".claude"):]))
PY
)"
echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
