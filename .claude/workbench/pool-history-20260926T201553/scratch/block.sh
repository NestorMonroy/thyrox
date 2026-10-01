HP_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# El mismo parser de tamaños que `run-task-pool.sh` y `bg.sh`: una cota
# ilegible no se deja a la interpretación de Parallel.
source "$HP_HERE/../lib/memory.sh"
pool_history() { PYTHONPATH="$HP_HERE/..${PYTHONPATH:+:$PYTHONPATH}" python3 "$HP_HERE/pool_history.py" "$@"; }
HISTORY="$(pool_history dir "$PROMPT")" || rehusa "no se pudo resolver el historial de la plantilla (HEADLESS_POOL_HISTORY_DIR)"
# La memoria de un VECINO que corre junto al pool —el `tsc` del pipeline en
# `tsc_cycle`—, parámetro del consumidor: se suma a la medida del ítem.
RESERVE_KB=0
if [[ -n "${HEADLESS_POOL_MEMFREE_RESERVE:-}" ]]; then
    RESERVE_BYTES="$(parse_binary_size "$HEADLESS_POOL_MEMFREE_RESERVE" 2>/dev/null)" \
        || rehusa "HEADLESS_POOL_MEMFREE_RESERVE ilegible: '$HEADLESS_POOL_MEMFREE_RESERVE' (ej. 2G, 512M)"
    RESERVE_KB=$(( RESERVE_BYTES / 1024 ))
fi
MEMFREE_WHY=option
if [[ -z "$CACHE_TTL" || -z "$MEMFREE_SPEC" ]]; then
    if IFS=$'\t' read -r H_TTL H_MEMFREE H_WHY < <(pool_history derive "$HISTORY" "$MODEL" --reserve-kb "$RESERVE_KB"); then
        [[ -n "$CACHE_TTL" || "$H_TTL" == - ]] || { CACHE_TTL="$H_TTL"; CACHE_TTL_WHY=history; }
        [[ -n "$MEMFREE_SPEC" || "$H_MEMFREE" == - ]] || { MEMFREE_SPEC="$H_MEMFREE"; MEMFREE_WHY=history; }
        echo "historial: $H_WHY"
    else
        echo "historial: no se pudo derivar (sin catálogo de modelos); corre con lo declarado"
    fi
fi
