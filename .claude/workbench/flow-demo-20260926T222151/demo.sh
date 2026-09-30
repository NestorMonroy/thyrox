#!/usr/bin/env bash
# Demostración de punta a punta del pool: historial -> anchura -> GNU Parallel
# -> admit -> ítem -> medida -> release -> historial -> step_report.
# GPU simulada con estado (14000 MiB; esta VM no tiene GPU), GNU Time y GNU
# Parallel REALES. Cada ítem asigna 1600 MiB medio segundo después de
# arrancar y los sostiene 1.5 s: con margen 2 pide 3200.
set -uo pipefail
T=/home/user/thyrox; B="$(cd "$(dirname "$0")" && pwd)"
export GPU_STATE="$B/gpu"; mkdir -p "$GPU_STATE/used"; echo 14000 > "$GPU_STATE/total"
printf '#!/usr/bin/env bash\nGPU_STATE="%s" exec bash "%s" "$@"\n' "$GPU_STATE" "$T/tests/session/fakes/stateful-nvidia-smi.sh" > "$B/nvidia-smi"
cat > "$B/item" <<'SH'
#!/usr/bin/env bash
# Hace de `claude -p`: consume el prompt, asigna VRAM tarde y responde.
cat >/dev/null
echo "start $(date +%s.%N) $$" >> "$ITEM_LOG"
sleep 0.5; echo 1600 > "$GPU_STATE/used/$$"; sleep 1.5
echo "end $(date +%s.%N) $$" >> "$ITEM_LOG"
printf '{"type":"result","result":"ok"}\n'
SH
chmod +x "$B/nvidia-smi" "$B/item"; printf 'Procesa el ítem.\n' > "$B/prompt.md"
export HEADLESS_POOL_CLAUDE="$B/item" HEADLESS_POOL_NVIDIA_SMI="$B/nvidia-smi" HEADLESS_POOL_TIME=/usr/bin/time
export HEADLESS_POOL_HISTORY_DIR="$B/historial" HEADLESS_POOL_VRAM_RESERVE_MIB=2000 HEADLESS_POOL_GPU_INTERVAL=0.2
max_concurrent() { sort -k2,2n "$1" | gawk '$1=="start"{n++; if (n>m) m=n} $1=="end"{n--} END{print m+0}'; }
pool() { # nombre anchura ítems...
  local name="$1" width="$2"; shift 2
  printf '%s\n' "$@" | bash "$T/src/session/headless-pool.sh" --prompt "$B/prompt.md" --out "$B/$name/outputs" \
    --model claude-sonnet-5 --width "$width" --timeout 60
}
ledger="$B/historial/vram-reservations.json"

echo "################ 1. SIN HISTORIAL: calibrar ################"
export ITEM_LOG="$B/items-1.log"; : > "$ITEM_LOG"
pool run-1 8 a b c 2>&1 | grep -E "^(gpu|anchura|historial|items|memoria)"
echo "máximo simultáneo: $(max_concurrent "$ITEM_LOG") (esperado 1: GPU entera, de a uno)"
echo "fila registrada: $(tail -1 "$B"/historial/*/runs.jsonl)"

echo; echo "################ 2. CALIBRADO: min(8, RAM, VRAM) ################"
peak_kb="$(tail -1 "$B"/historial/*/runs.jsonl | jq -r .peak_kb)"
# MemAvailable para que la RAM admita 6: 6.5 x (pico x 2).
printf 'MemTotal: 99999999 kB\nMemAvailable: %d kB\n' "$(( peak_kb * 2 * 13 / 2 ))" > "$B/meminfo"
export THYROX_POOL_MEMINFO_PATH="$B/meminfo" ITEM_LOG="$B/items-2.log"; : > "$ITEM_LOG"
pool run-2 8 a b c d e f 2>&1 | grep -E "^(anchura|historial|items)"
echo "máximo simultáneo: $(max_concurrent "$ITEM_LOG") (esperado 3: (14000-2000)/(1600x2) = 3.75 -> 3)"
unset THYROX_POOL_MEMINFO_PATH

echo; echo "################ 3. DOS POOLS A LA VEZ, un registro ################"
export ITEM_LOG="$B/items-3.log"; : > "$ITEM_LOG"
pool run-3a 8 a1 a2 a3 > "$B/run-3a.salida" 2>&1 & pool run-3b 8 b1 b2 b3 > "$B/run-3b.salida" 2>&1 & wait
grep -hE "^items=" "$B/run-3a.salida" "$B/run-3b.salida"
echo "máximo simultáneo entre los dos: $(max_concurrent "$ITEM_LOG") (cada pool solo admitiría 3; juntos caben 4: 14000/3200)"
echo "registro al terminar: $(cat "$ledger")"

echo; echo "################ 4. step_report de la ejecución 2 ################"
bash "$T/bin/step_report" --bench "$B/run-2" 2>&1 | head -40
