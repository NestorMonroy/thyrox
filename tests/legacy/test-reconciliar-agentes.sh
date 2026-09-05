#!/bin/bash
# =============================================================================
# test-reconciliar-agentes.sh — prueba de reconciliar-agentes.sh
# =============================================================================
#
# Por qué este test existe y qué forma tiene
# -------------------------------------------
# `hallazgo-abierto-genera-sucesor.md` deja escrito cómo se prueba un gate, y
# por qué la forma cómoda no sirve:
#
#   *"No basta 'en los dos sentidos' con un incumplidor **fabricado**: si lo
#   escribe quien escribió el patrón, hereda su encuadre y confirma el
#   instrumento. El test que sirve es contra un **positivo conocido del
#   repo**."*
#
# Por eso el fixture no inventa la firma del subagente muerto: la **copia de
# una medición**. Medido 2026-08-13 sobre `agent-a584cfe87465ddf94.jsonl`, el
# único de 84 que no cerró con su reporte:
#
#     type = user | role = user | bloques = ['tool_result']
#
# El caso 2 de abajo reproduce exactamente esa forma. Si algún día el harness
# cambia cómo termina un transcript cortado, este test falla — que es lo que
# debe pasar.
#
# Y el fixture fija los mtime con `touch -d` en vez de crear los archivos y
# confiar en el reloj: en el ext2/ext3 de este contenedor dos archivos creados
# en el mismo comando comparten mtime hasta el nanosegundo, así que un empate
# de frescura sería indecidible por accidente, no por diseño.
#
# Uso:  bash .claude/scripts/test-reconciliar-agentes.sh
# =============================================================================

set -uo pipefail

# El SUT vive un nivel arriba: los tests son un directorio hermano del
# código, no viven junto a él (forma medida en ``ccb: daemon/src/__tests__/``).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUT="$SCRIPT_DIR/agents/reconciliar-agentes.sh"

PASS=0; FAIL=0
check() {  # check <descripción> <esperado> <obtenido>
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
ROSTER="$TMP/tasks"; TRANSCRIPTS="$TMP/subagents"
mkdir -p "$ROSTER" "$TRANSCRIPTS"

VIEJO='2026-01-01 00:00:00'      # muy fuera de cualquier ventana

# --- 1. subagente que cerró con su reporte final -> terminado -------------
cat > "$TRANSCRIPTS/agent-cerrado.jsonl" <<'EOF'
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Read"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Reporte final del subagente."}]}}
EOF
ln -s "$TRANSCRIPTS/agent-cerrado.jsonl" "$ROSTER/cerrado.output"

# --- 2. subagente cortado a media frase -> desaparecido ------------------
# Forma copiada de la medición real (ver cabecera), no inventada.
cat > "$TRANSCRIPTS/agent-cortado.jsonl" <<'EOF'
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Grep"}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"..."}]}}
EOF
ln -s "$TRANSCRIPTS/agent-cortado.jsonl" "$ROSTER/cortado.output"

# --- 3. subagente sin cerrar pero recién escrito -> reciente --------------
cat > "$TRANSCRIPTS/agent-pegado.jsonl" <<'EOF'
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"..."}]}}
EOF
ln -s "$TRANSCRIPTS/agent-pegado.jsonl" "$ROSTER/pegado.output"

# --- 4. bash con marcador del harness -> terminado ------------------------
printf 'salida\n[exited with code 0]\n' > "$ROSTER/harness.output"

# --- 5. bash con marcador nuestro R-2.0 -> terminado ----------------------
printf '2464 passed in 585s\nEXIT=0\n' > "$ROSTER/propio.output"

# --- 6. bash sin marcador, congelado -> indecidible -----------------------
printf '88 failed, 338 passed in 163.14s\n' > "$ROSTER/mudo.output"

# --- 7. bash sin marcador, fresco -> atascado ----------------------------
printf 'trabajando...\n' > "$ROSTER/fresco.output"

# --- 8. CONTROL POSITIVO REAL (H-DOCS-1004): subagente vivo cuyo ENLACE es
# viejo y cuyo transcript es fresco. Es la forma exacta del episodio del
# 2026-09-02: el harness crea el symlink al arrancar y no vuelve a tocarlo;
# el transcript crece por turno. Un guion que mida el enlace lo da por
# congelado (desaparecido); el que mide el destino lo ve dentro de la ventana.
cat > "$TRANSCRIPTS/agent-vivo.jsonl" <<'EOF'
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Bash"}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"..."}]}}
EOF
ln -s "$TRANSCRIPTS/agent-vivo.jsonl" "$ROSTER/vivo.output"

# Congelar los que deben quedar fuera de la ventana. El guion mide el DESTINO
# del symlink (stat -L), así que se congela el transcript; el enlace de
# `vivo` se envejece a propósito para que el caso 8 discrimine.
touch -h -d "$VIEJO" "$ROSTER/cortado.output" "$ROSTER/mudo.output" "$ROSTER/vivo.output"
touch    -d "$VIEJO" "$TRANSCRIPTS/agent-cortado.jsonl"

export RECONCILIAR_ROSTER="$ROSTER"

echo "== conteos del reporte =="
OUT=$(bash "$SUT" 2>&1)
# El segundo campo DEBE ser numérico: el reporte repite la misma palabra en el
# bloque de detalle ("desaparecido  cortado  (subagente, …)"), y un awk que
# sólo case por $1 devuelve las dos líneas. Es la misma clase de defecto que
# el test persigue en el guion — el instrumento midiendo de más.
get() { printf '%s\n' "$OUT" | awk -v k="$1" '$1==k && $2 ~ /^[0-9]+$/ {print $2; exit}'; }

check "terminado = 3 (cerrado + harness + propio)" "3" "$(get terminado)"
check "desaparecido = 1 (el cortado y congelado; NO el vivo de enlace viejo)"  "1" "$(get desaparecido)"
check "indecidible = 1 (bash mudo y congelado)"    "1" "$(get indecidible)"
# ANTES: los tres caian en `atascado`, y ese era el defecto (H-DOCS-1004):
# sin segunda muestra, «escribio hace poco» se publicaba como «se quedo
# pegado» — el veredicto CONTRARIO. Desde que el veredicto lo decide
# `thyrox: src/roster/job_liveness.py`, los tres se reparten: dentro de la
# ventana y sin `--vigilar` el guion publica `reciente`, que dice lo unico
# que se sabe. `atascado` queda para lo que una segunda muestra confirma.
check "reciente = 3 (pegado + fresco + vivo con enlace viejo)" "3" "$(get reciente)"
check "atascado = 0 sin --vigilar (no se afirma sin segunda muestra)" "0" "$(get atascado)"
check "TOTAL = 8"                                  "8" "$(get TOTAL)"

echo "== el guard: sólo 'desaparecido' autoriza relanzar =="
bash "$SUT" --confirmar-muerte cortado >/dev/null 2>&1
check "desaparecido -> exit 0 (confirma)"          "0" "$?"

bash "$SUT" --confirmar-muerte mudo >/dev/null 2>&1
check "indecidible  -> exit 2 (BAIL)"              "2" "$?"

bash "$SUT" --confirmar-muerte pegado >/dev/null 2>&1
check "reciente     -> exit 2 (BAIL)"              "2" "$?"

bash "$SUT" --confirmar-muerte cerrado >/dev/null 2>&1
check "terminado    -> exit 2 (BAIL)"              "2" "$?"

bash "$SUT" --confirmar-muerte no_existe >/dev/null 2>&1
check "id ausente   -> exit 2 (BAIL)"              "2" "$?"

echo "== el contador de intentos: la segunda vez se rinde =="
# El primer --confirmar-muerte de arriba ya asentó el intento 1 en el ledger.
SEGUNDA=$(bash "$SUT" --confirmar-muerte cortado 2>&1); RC2=$?
check "segundo relanzamiento del mismo id -> exit 2" "2" "$RC2"
case "$SEGUNDA" in
  *"volvió a morir"*) check "el BAIL nombra la reincidencia, no la muerte" "sí" "sí" ;;
  *)                  check "el BAIL nombra la reincidencia, no la muerte" "sí" "no" ;;
esac
rm -f "$ROSTER/.reconciliar-respawns"   # el resto de los casos parte de cero

echo "== el BAIL explica POR QUÉ, no sólo que no =="
RAZON=$(bash "$SUT" --confirmar-muerte pegado 2>&1 || true)
case "$RAZON" in
  *"DOS copias"*) check "reciente nombra el riesgo de duplicar" "sí" "sí" ;;
  *)              check "reciente nombra el riesgo de duplicar" "sí" "no" ;;
esac

echo "== --quiet publica su denominador =="
Q=$(bash "$SUT" --quiet 2>&1)
case "$Q" in
  *"alcance medido: 8 entradas"*) check "--quiet declara sobre cuántas midió" "sí" "sí" ;;
  *)                              check "--quiet declara sobre cuántas midió" "sí" "no  ($Q)" ;;
esac

echo "== --vigilar separa vivo de atascado =="
# Con el archivo quieto, la segunda muestra no avanza -> sigue atascado.
V1=$(RECONCILIAR_ROSTER="$ROSTER" bash "$SUT" --vigilar 1 2>&1 | awk '$1=="vivo"{print $2}')
check "sin avance de mtime -> vivo = 0" "0" "$V1"

# Con el archivo escribiéndose durante la vigilancia -> vivo.
( sleep 1; printf 'sigo\n' >> "$ROSTER/fresco.output" ) &
WRITER=$!
V2=$(RECONCILIAR_ROSTER="$ROSTER" bash "$SUT" --vigilar 3 2>&1 | awk '$1=="vivo"{print $2}')
wait $WRITER 2>/dev/null || true
check "con avance de mtime -> vivo >= 1" "sí" "$( [[ "${V2:-0}" -ge 1 ]] && echo sí || echo "no (vivo=$V2)" )"

echo "== roster ilegible falla ruidoso, no en silencio =="
RECONCILIAR_ROSTER=/no/existe bash "$SUT" >/dev/null 2>&1
check "roster inexistente -> exit 3" "3" "$?"

echo
echo "resultado: $PASS ok, $FAIL fallas"
[[ "$FAIL" -eq 0 ]] || exit 1
