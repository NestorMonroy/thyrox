#!/usr/bin/env bash
# Suite de model_catalog.py — el lector Python del catálogo del paquete.
#
# Lo que mide: que el precio salga del catálogo vendorizado y no de un peso
# fijo; que sin catálogo REHÚSE sin cifra (exit 2); y que el alias resuelva al
# identificador que el ejecutable declara. El control positivo es real del
# repo: la fila de claude-fable-5-1 en src/models.json, cuyo cache_read (0.25)
# es lo que H-DOCS-1003 casi publicó al revés.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MC="$RAIZ/.claude/scripts/agents/model_catalog.py"
fallos=0; total=0
check() { total=$((total + 1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos + 1)); fi; }

# 1. Control positivo real: fable-5-1 lee caché a 0.25 → 1 Mtok leídos = 0.25 USD
S="$(python3 "$MC" costo claude-fable-5-1 --cache-read 1000000 --ttl 5m 2>&1)"
check "fable-5-1: 1 Mtok de caché leída cuesta 0.25" "$(printf '%s' "$S" | sed -n 's/^usd: *//p')" "0.2500"
# 2. opus-5 lee a 0.5: el doble
S="$(python3 "$MC" costo claude-opus-5 --cache-read 1000000 --ttl 5m 2>&1)"
check "opus-5: 1 Mtok de caché leída cuesta 0.50" "$(printf '%s' "$S" | sed -n 's/^usd: *//p')" "0.5000"
# 3. El TTL cambia la escritura: fable-5-1 w5m 12.5 / w1h 20
A="$(python3 "$MC" costo claude-fable-5-1 --cache-creation 1000000 --ttl 5m | sed -n 's/^usd: *//p')"
B="$(python3 "$MC" costo claude-fable-5-1 --cache-creation 1000000 --ttl 1h | sed -n 's/^usd: *//p')"
check "escritura a 5m y 1h difieren (12.5 vs 20)" "$A/$B" "12.5000/20.0000"
# 4. El alias resuelve al identificador del ejecutable, no a una versión anterior
S="$(python3 "$MC" costo fable --cache-read 1 2>&1 | sed -n 's/^modelo: *//p')"
check "alias fable → claude-fable-5-1 (con el alias entre paréntesis)" "$S" "claude-fable-5-1  (alias fable)"
# 5. Sin catálogo: exit 2 y NINGUNA cifra en stdout
OUT="$(KAUPAMEX_MODEL_CATALOG=/nonexistent/models.json python3 "$MC" costo claude-opus-5 --cache-read 1 2>/dev/null)"; RC=$?
check "sin catálogo rehúsa con exit 2" "$RC" "2"
check "sin catálogo no emite cifra" "${OUT:-vacio}" "vacio"
ERR="$(KAUPAMEX_MODEL_CATALOG=/nonexistent/models.json python3 "$MC" costo claude-opus-5 --cache-read 1 2>&1 >/dev/null)"
case "$ERR" in *"models.json"*"verde falso"*) N=nombra ;; *) N=no ;; esac
check "sin catálogo el mensaje nombra el catálogo y el verde falso" "$N" "nombra"
# 6. Modelo desconocido: exit 2
python3 "$MC" costo claude-no-existe --cache-read 1 >/dev/null 2>&1; check "modelo desconocido rehúsa con exit 2" "$?" "2"
# 7. El control ANULADO del peso fijo: 1 Mtok de caché leída en fable-5-1 pesa
#    0.1x del input en equiv_cost (100 000 equiv) y 0.025x en el catálogo — el
#    cociente es 4, que es la sobrevaloración que H-DOCS-1008 registra.
USD="$(python3 "$MC" costo claude-fable-5-1 --cache-read 1000000 --ttl 5m | sed -n 's/^usd: *//p')"
INP="$(python3 "$MC" costo claude-fable-5-1 --input 100000 --ttl 5m | sed -n 's/^usd: *//p')"
check "peso fijo 0.1x sobrevalora 4x la caché leída de fable-5-1" "$(python3 -c "print(round($INP/$USD))")" "4"
# 8. por-modelo publica su denominador
S="$(python3 "$MC" por-modelo --ttl 1h 2>&1 | tail -1)"
case "$S" in *"alcance medido:"*"de "*"en agent_sessions"*) D=si ;; *) D=no ;; esac
check "por-modelo publica alcance medido con universo" "$D" "si"

# 9-12. `sesion` valora el transcript del orquestador (H-DOCS-1010): deduplica
#    por message.id (el JSONL repite el mismo mensaje por bloque de contenido),
#    aplica el TTL real de cada escritura y estima el coste de cambiar de modelo.
FX="$(mktemp -d)"; T="$FX/sesion.jsonl"
{
  printf '%s\n' '{"message":{"id":"m1","model":"claude-fable-5-1","usage":{"input_tokens":1000,"cache_creation_input_tokens":100000,"cache_read_input_tokens":0,"output_tokens":10,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":100000}}}}'
  printf '%s\n' '{"message":{"id":"m1","model":"claude-fable-5-1","usage":{"input_tokens":1000,"cache_creation_input_tokens":100000,"cache_read_input_tokens":0,"output_tokens":10,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":100000}}}}'
  printf '%s\n' '{"message":{"id":"m2","model":"claude-fable-5-1","usage":{"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":1000000,"output_tokens":100,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":0}}}}'
  printf '%s\n' '{"type":"user","message":{"role":"user","content":"sin usage"}}'
} > "$T"
S="$(python3 "$MC" sesion --transcript "$T" --cambiar-a claude-opus-5 2>&1)"
# 9. dedup: m1 dos veces cuenta una → 2 turnos, no 3
check "sesion deduplica por message.id (2 turnos)" "$(printf '%s' "$S" | awk '$1=="claude-fable-5-1"{print $2}')" "2"
# 10. USD = 1000·10 + 100000·20 (esc. 1h) + 1e6·0.25 + 110·50 = 0.0100+2.0000+0.2500+0.0055
check "sesion valora la escritura al TTL real (1h) y la lectura a 0.25" "$(printf '%s' "$S" | awk '$1=="claude-fable-5-1"{print $NF}')" "2.2655"
# 11. cambiar a opus-5: el último contexto (1 000 000) reescrito a 6.25 (5m) / 10 (1h)
case "$S" in *"(1,000,000 tokens) se reescribe — 6.2500 USD a 5 m · 10.0000 USD a 1 h"*) C=si ;; *) C=no ;; esac
check "sesion estima el coste de reescribir el contexto en el destino" "$C" "si"
# 12. sin transcript rehúsa con exit 2 y sin cifra
S="$(CLAUDE_CODE_SESSION_ID= python3 "$MC" sesion --transcript "$FX/no-existe.jsonl" 2>/dev/null)"; RC=$?
check "sesion sin transcript: exit 2 y stdout vacío" "$RC/$S" "2/"
rm -rf "$FX"

# 13. agent_store.py copiado a un directorio SIN model_catalog.py (así lo cargan
#    otras suites) sigue corriendo censo-medicion, y declara el USD como SIN
#    MEDIR en vez de morir con ModuleNotFoundError (falla medida en run-all).
#    La copia vive en un ESPEJO de la estructura real, como en
#    test-agent-store-compara-antes-de-escribir.sh: agent_store.py deriva la
#    raíz y a su vecino tipos_documentales por Path(__file__), y una copia
#    suelta moriría antes por otra causa (IndexError / tipos_documentales).
FX="$(mktemp -d)"; mkdir -p "$FX/.claude/scripts/agents" "$FX/.claude/scripts/corpus"
cp "$RAIZ/.claude/scripts/agents/agent_store.py" "$FX/.claude/scripts/agents/"
cp "$RAIZ/.claude/scripts/corpus/tipos_documentales.py" "$FX/.claude/scripts/corpus/"
S="$(cd "$RAIZ" && python3 "$FX/.claude/scripts/agents/agent_store.py" censo-medicion --claude-dir "$RAIZ/.claude" 2>&1)"; RC=$?
case "$S" in *"USD por modelo: SIN MEDIR"*) D=si ;; *) D=no ;; esac
check "agent_store sin model_catalog al lado: censo corre (exit 0) y declara SIN MEDIR" "$RC/$D" "0/si"
rm -rf "$FX"

echo "test-model-catalog: $((total - fallos)) ok, $fallos fallos (alcance medido: $total aserciones)"
[[ $fallos -eq 0 ]]
