#!/usr/bin/env bash
# test-parallel.sh — la semántica del cliente, ejercida.
#
# Cada caso mide la REGLA, no que la función devuelva algo: un test que sólo
# comprueba «devolvió 5 resultados» pasa aunque el cap no limite nada.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."   # kaupamex-docs/

OK=0; FALLO=0
caso() { if [[ "$2" == "$3" ]]; then OK=$((OK+1)); else
    FALLO=$((FALLO+1)); echo "  FALLO $1: esperado '$3', obtenido '$2'"; fi; }

# --- 1..4: la fórmula, con su PISO ------------------------------------------
# El piso es justo lo que la paráfrasis del propio ejecutable pierde.
for par in "1:2" "3:2" "4:2" "12:10" "64:16"; do
    cpus="${par%%:*}"; esperado="${par##*:}"
    obtenido=$(python3 -c "
import sys; sys.path.insert(0, '.claude/scripts')
from parallel import width_cap; print(width_cap($cpus))")
    caso "width_cap($cpus)" "$obtenido" "$esperado"
done

# --- 5: la CONCURRENCIA está realmente limitada (el control que discrimina) --
# Se mide el máximo de trabajos simultáneos observado, no el resultado.
obtenido=$(python3 -c "
import sys, threading, time; sys.path.insert(0, '.claude/scripts')
from parallel import parallel
vivos, tope, lock = 0, 0, threading.Lock()
def trabajo(x):
    global vivos, tope
    with lock:
        vivos += 1; tope = max(tope, vivos)
    time.sleep(0.05)
    with lock:
        vivos -= 1
    return x
parallel(list(range(20)), trabajo, cap=3)
print(tope)")
caso "concurrencia real con cap=3" "$obtenido" "3"

# --- 6: TODOS completan aunque N >> cap (regla 3) ---------------------------
obtenido=$(python3 -c "
import sys; sys.path.insert(0, '.claude/scripts')
from parallel import parallel
print(len(parallel(list(range(50)), lambda x: x*2, cap=2)))")
caso "50 items con cap=2 completan" "$obtenido" "50"

# --- 7: el orden es el de ENTRADA, no el de terminación ---------------------
obtenido=$(python3 -c "
import sys, time; sys.path.insert(0, '.claude/scripts')
from parallel import parallel
# el ítem 0 tarda más: si el orden fuera de terminación, saldría al final
print(parallel([0,1,2,3], lambda x: (time.sleep(0.1 if x==0 else 0), x)[1], cap=4))")
caso "orden de entrada preservado" "$obtenido" "[0, 1, 2, 3]"

# --- 8: exceder la cota es error EXPLÍCITO, no truncamiento -----------------
obtenido=$(python3 -c "
import sys; sys.path.insert(0, '.claude/scripts')
from parallel import parallel, ParallelError
try:
    parallel(list(range(51)), lambda x: x, item_cap=50)
    print('NO-LEVANTO')
except ParallelError:
    print('ParallelError')")
caso "51 items con cota 50 rehusa" "$obtenido" "ParallelError"

# --- 9: y NO trunca — el mensaje lo dice, y no devuelve 50 ------------------
obtenido=$(python3 -c "
import sys; sys.path.insert(0, '.claude/scripts')
from parallel import parallel, ParallelError
try: parallel(list(range(51)), lambda x: x, item_cap=50)
except ParallelError as e: print('si' if 'truncamiento' in str(e) else 'no')")
caso "el rechazo nombra el truncamiento" "$obtenido" "si"

# --- 10: pipeline encadena sin barrera entre etapas -------------------------
obtenido=$(python3 -c "
import sys; sys.path.insert(0, '.claude/scripts')
from parallel import pipeline
print(pipeline([1,2,3], lambda x: x+10, lambda y: y*2, cap=2))")
caso "pipeline dos etapas" "$obtenido" "[22, 24, 26]"

echo "test-parallel: $OK OK · $FALLO fallo(s) (alcance medido: $((OK+FALLO)) aserciones sobre las 5 reglas del ejecutable)"
[[ "$FALLO" -eq 0 ]]
