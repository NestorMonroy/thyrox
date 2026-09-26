#!/usr/bin/env bash
# La cara de shell del lock de estado compartido: `bin/shared_lock`.
#
# El lock es un PROTOCOLO en disco (`<archivo>.lock/owner.json`, latido por
# mtime), y thyrox escribe estado compartido desde .py, .sh y .ts. Esta suite
# mide la de shell:
#   run <archivo> [...] -- <comando>   corre el comando con el lock tomado;
#                                      sale con el código del comando, o 3
#                                      si el lock es de otro (sin correrlo);
#   check <archivo>                    imprime `tomado` o `libre`.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK="$RAIZ/bin/shared_lock"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
total=0; fallos=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

echo "== 1. run corre el comando con el lock tomado y devuelve su código =="
bash "$LOCK" run "$T/estado" --run-id r1 -- bash -c "test -d '$T/estado.lock' && exit 7"
check "el comando vio el lock y su código sale tal cual" "$?" "7"
check "al terminar no queda lock" "$(test -e "$T/estado.lock" && echo si || echo no)" "no"

echo "== 2. con el lock de otro, sale 3 sin correr el comando =="
PYTHONPATH="$RAIZ/src" python3 -c "
import sys, time
from session import shared_lock as sl
with sl.held(sys.argv[1], run_id='python', stale_s=5, update_s=1):
    print('tomado', flush=True); time.sleep(4)
" "$T/estado" > "$T/holder.out" &
holder=$!
# Acotado: si el dueño muere antes de tomar el lock, no se espera para siempre.
for _ in $(seq 100); do
  grep -q tomado "$T/holder.out" 2>/dev/null && break
  kill -0 "$holder" 2>/dev/null || break
  sleep 0.1
done
salida="$(bash "$LOCK" run "$T/estado" -- touch "$T/corrio" 2>&1)"; code=$?
check "ocupado: exit 3" "$code" "3"
check "el comando no corrió" "$(test -e "$T/corrio" && echo si || echo no)" "no"
check "nombra el pid del dueño" "$(printf '%s' "$salida" | grep -c "$holder")" "1"
check "check lo ve tomado" "$(bash "$LOCK" check "$T/estado")" "tomado"
wait "$holder"
check "check lo ve libre al soltar" "$(bash "$LOCK" check "$T/estado")" "libre"

echo "== 3. N shells que leen-modifican-escriben bajo run no pierden cuentas =="
echo 0 > "$T/contador"
for w in 1 2 3 4; do
  ( for i in $(seq 20); do
      bash "$LOCK" run "$T/contador" --retries 400 --min-wait 0.005 --max-wait 0.05 -- \
        bash -c "n=\$(cat '$T/contador'); echo \$((n + 1)) > '$T/contador'"
    done ) &
done
wait
check "80 incrementos, 80 en el archivo" "$(cat "$T/contador")" "80"

echo "== 4. sin comando, rehúsa con 2 =="
bash "$LOCK" run "$T/estado" >/dev/null 2>&1
check "uso inválido: exit 2" "$?" "2"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
