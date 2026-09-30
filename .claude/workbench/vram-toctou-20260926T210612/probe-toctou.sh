#!/usr/bin/env bash
# Sonda: ¿dos admisiones simultaneas de 3000 MiB con 5000 libres dejan
# arrancar a las dos? Si sí, la admision es TOCTOU: cada una comprueba sola.
set -u
here="$(cd "$(dirname "$0")" && pwd)"; root="$(cd "$here/../../.." && pwd)"
dir="$(mktemp -d -p "$here")"; trap 'rm -rf "$dir"' EXIT
cat > "$dir/nvidia-smi" <<'SH'
#!/usr/bin/env bash
case "$*" in
  *--query-compute-apps*) : ;;
  *utilization.gpu*)      echo "0, 0" ;;
  *memory.free*)          echo "0, 5000" ;;
esac
SH
chmod +x "$dir/nvidia-smi"
admit() { PYTHONPATH="$root/src" python3 "$root/src/session/gpu_monitor.py" "$@"; }
for job in A B; do
  ( admit ${ADMIT:-wait-free} 3000 --nvidia-smi "$dir/nvidia-smi" --timeout 1 --interval 0.1 ${ADMIT_ARGS:-} \
      && echo "$job admitido" || echo "$job esperó y venció" ) &
done
wait
