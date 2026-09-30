#!/usr/bin/env bash
# La admisión por VRAM desde shell: `bin/gpu_monitor admit` y `release`.
#
# Es la misma carrera que reprodujo `.claude/workbench/vram-toctou-*/probe-toctou.sh`:
# con 5000 MiB libres, dos admisiones simultáneas de 3000 no pueden entrar las
# dos. Aquí se mide la cara de shell, que es la que usa `headless-pool.sh`:
#   admit NEED --ledger L --owner PID   sale 0 si reservó, 3 si venció el plazo;
#   release --ledger L --owner PID      suelta la reserva;
# y sin `nvidia-smi` que responda, admit sale 2 al instante: una ausencia no
# es una espera, y el registro no se escribe.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
GPU="$ROOT/bin/gpu_monitor"
T="$(mktemp -d)"; trap 'rm -rf "${T:?}"' EXIT
total=0; failures=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; failures=$((failures+1)); fi; }

cat > "$T/nvidia-smi" <<'SH'
#!/usr/bin/env bash
case "$*" in
  *--query-compute-apps*) : ;;
  *utilization.gpu*)      echo "0, 0" ;;
  *memory.free*)          echo "0, 5000" ;;
esac
SH
chmod +x "$T/nvidia-smi"
sleep 30 & owner_a=$!
sleep 30 & owner_b=$!

echo "== 1. dos admisiones simultáneas de 3000 con 5000 libres: entra una =="
for owner in "$owner_a" "$owner_b"; do
  ( bash "$GPU" admit 3000 --ledger "$T/vram.json" --owner "$owner" --nvidia-smi "$T/nvidia-smi" \
      --timeout 1 --interval 0.1 && echo admitido || echo esperó ) > "$T/out.$owner" &
done
wait %3 %4 2>/dev/null; wait "$(jobs -p | tail -2)" 2>/dev/null
sleep 0.2
check "una admitida y otra esperó" "$(cat "$T"/out.* | sort | paste -sd,)" "admitido,esperó"

echo "== 2. soltada la reserva, la otra entra =="
admitted="$(grep -l admitido "$T"/out.* | sed 's/.*out\.//')"
bash "$GPU" release --ledger "$T/vram.json" --owner "$admitted"
other=$([[ "$admitted" == "$owner_a" ]] && echo "$owner_b" || echo "$owner_a")
bash "$GPU" admit 3000 --ledger "$T/vram.json" --owner "$other" --nvidia-smi "$T/nvidia-smi" --timeout 1 --interval 0.1
check "admit sale 0 tras el release" "$?" "0"

echo "== 3. sin sitio y con plazo corto, admit sale 3 =="
bash "$GPU" admit 3000 --ledger "$T/vram.json" --owner "$admitted" --nvidia-smi "$T/nvidia-smi" --timeout 0.3 --interval 0.1
check "vencido: exit 3" "$?" "3"

# Mide en milisegundos el `admit` de sus argumentos; deja el código en $rc y
# el stderr en $T/err.
timed_admit() {
  local started
  started=$(date +%s%N)
  bash "$GPU" "$@" 2> "$T/err"; rc=$?
  elapsed_ms=$(( ($(date +%s%N) - started) / 1000000 ))
}

echo "== 4. --nvidia-smi hacia una ruta inexistente: exit 2 al instante, registro intacto =="
timed_admit admit 100 --ledger "$T/absent/vram.json" --owner "$owner_a" --nvidia-smi "$T/no-existe" --timeout 5
check "sin nvidia-smi: exit 2" "$rc" "2"
check "en menos de un segundo" "$(( elapsed_ms < 1000 ))" "1"
check "el registro no se escribe" "$([[ -e "$T/absent" ]] && echo escrito || echo intacto)" "intacto"
check "el stderr nombra la ausencia" "$(grep -c 'nvidia-smi no responde' "$T/err")" "1"

echo "== 5. un PATH sin nvidia-smi, con el nombre por defecto: exit 2 al instante =="
mkdir -p "$T/bin-empty"
started=$(date +%s%N)
PATH="$T/bin-empty:/usr/bin:/bin" bash "$GPU" admit 100 --ledger "$T/nopath/vram.json" --owner "$owner_a" \
  --timeout 5 2> "$T/err"; rc=$?
elapsed_ms=$(( ($(date +%s%N) - started) / 1000000 ))
if PATH="$T/bin-empty:/usr/bin:/bin" command -v nvidia-smi >/dev/null; then
  echo "OMITIDO 5 — este anfitrión tiene nvidia-smi en /usr/bin o /bin"
else
  check "PATH sin nvidia-smi: exit 2" "$rc" "2"
  check "en menos de un segundo" "$(( elapsed_ms < 1000 ))" "1"
  check "el registro no se escribe" "$([[ -e "$T/nopath" ]] && echo escrito || echo intacto)" "intacto"
fi

echo "== 6. el nvidia-smi falso con estado, con sitio: exit 0 =="
STATEFUL="$ROOT/tests/session/fakes/stateful-nvidia-smi.sh"
export GPU_STATE="$T/gpu-state"
mkdir -p "$GPU_STATE/used"; echo 5000 > "$GPU_STATE/total"
timed_admit admit 100 --ledger "$T/stateful.json" --owner "$owner_a" --nvidia-smi "$STATEFUL" --timeout 1 --interval 0.1
check "con sitio: exit 0" "$rc" "0"

echo "== 7. el mismo falso sin sitio: exit 3 al vencer el plazo =="
echo 5000 > "$GPU_STATE/used/$owner_b"
timed_admit admit 100 --ledger "$T/stateful-full.json" --owner "$owner_b" --nvidia-smi "$STATEFUL" --timeout 0.3 --interval 0.1
check "sin sitio: exit 3" "$rc" "3"
check "tras esperar el plazo, no antes" "$(( elapsed_ms >= 300 ))" "1"

kill "$owner_a" "$owner_b" 2>/dev/null
echo
echo "aserciones: $((total - failures)) de $total · failures: $failures"
exit $((failures > 0))
