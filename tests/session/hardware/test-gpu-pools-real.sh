#!/usr/bin/env bash
# Nivel 3 — dos `headless-pool` (dos GNU Parallel) sobre una GPU NVIDIA REAL y
# un registro común. Cada ítem (`cuda_pool_item.py`) asigna el 35 % de la VRAM
# libre tras 3 s de arranque: dos no caben juntos y, sin registro, los dos lo
# verían libre al empezar. Pasa si nunca corren a la vez, los dos terminan y el
# registro queda vacío.
#
# Precondiciones: nvidia-smi, PyTorch con CUDA y GNU Time (la primera
# ejecución mide el pico con el que el pool deriva lo que pide cada ítem). Sin
# alguna sale 2 nombrándola, sin publicar ningún conteo.
# Deja su evidencia en OUT (primer argumento, o .claude/build-logs/gpu-pools-<fecha>).
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
SMI="${HEADLESS_POOL_NVIDIA_SMI:-nvidia-smi}"
rehusa() { echo "test-gpu-pools-real: REHÚSA — $*. No se midió nada." >&2; exit 2; }
bash "$RAIZ/bin/gpu_monitor" available --nvidia-smi "$SMI" >/dev/null 2>&1 || rehusa "nvidia-smi no responde ($SMI)"
python3 -c 'import torch, sys; sys.exit(0 if torch.cuda.is_available() else 1)' >/dev/null 2>&1 \
  || rehusa "falta PyTorch con CUDA"
TIME_BIN="${HEADLESS_POOL_TIME:-/usr/bin/time}"
[[ "$("$TIME_BIN" --version 2>&1)" == *"GNU Time"* ]] || rehusa "falta GNU Time ($TIME_BIN)"

OUT="${1:-$RAIZ/.claude/build-logs/gpu-pools-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT/history"
FREE="$(bash "$RAIZ/bin/gpu_monitor" free --nvidia-smi "$SMI")"
export CUDA_ITEM_MIB=$(( FREE * 35 / 100 )) CUDA_ITEM_DELAY=3 CUDA_ITEM_HOLD=2
export RAMPA_LOG="$OUT/rampa.log" HEADLESS_POOL_CLAUDE="$HERE/cuda_pool_item.py"
export HEADLESS_POOL_HISTORY_DIR="$OUT/history" HEADLESS_POOL_NVIDIA_SMI="$SMI"
printf 'Ítem de GPU.\n' > "$OUT/prompt.md"
pool() { bash "$RAIZ/src/session/headless-pool.sh" --prompt "$OUT/prompt.md" --out "$OUT/out-$1" \
           --model claude-sonnet-5 --width 2 --timeout 120; }

# 1. Una ejecución sola, con GNU Time: su pico real alimenta lo que el pool pide.
printf 'medida\n' | pool medida > "$OUT/pool-medida.salida" 2>&1
: > "$RAMPA_LOG"
# 2. Dos pools a la vez, sin GNU Time: no se toca el historial entre medio.
for p in a b; do printf 'item-%s\n' "$p" | HEADLESS_POOL_TIME=/no-existe pool "$p" > "$OUT/pool-$p.salida" 2>&1 & done
wait

total=0; fallos=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }
check "los dos pools terminan su ítem" "$(cat "$OUT"/pool-[ab].salida | gawk '/^items=/{print}' | sort -u)" "items=1 ok=1 fallidos=0"
check "nunca corren a la vez" "$(sort -k2,2n "$RAMPA_LOG" | gawk '$1=="start"{n++; if (n>m) m=n} $1=="end"{n--} END{print m+0}')" "1"
check "el registro queda vacío" "$(jq -r 'length' "$OUT/history/vram-reservations.json" 2>/dev/null)" "0"
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos · evidencia: $OUT"
exit $((fallos > 0))
