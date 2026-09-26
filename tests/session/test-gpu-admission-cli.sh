#!/usr/bin/env bash
# La admisión por VRAM desde shell: `bin/gpu_monitor admit` y `release`.
#
# Es la misma carrera que reprodujo `.claude/workbench/vram-toctou-*/probe-toctou.sh`:
# con 5000 MiB libres, dos admisiones simultáneas de 3000 no pueden entrar las
# dos. Aquí se mide la cara de shell, que es la que usa `headless-pool.sh`:
#   admit NEED --ledger L --owner PID   sale 0 si reservó, 3 si venció el plazo;
#   release --ledger L --owner PID      suelta la reserva.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
GPU="$RAIZ/bin/gpu_monitor"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
total=0; fallos=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

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

kill "$owner_a" "$owner_b" 2>/dev/null
echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
