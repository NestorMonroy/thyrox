#!/usr/bin/env bash
# Los arneses de hardware (niveles 2 y 3) no pueden correr aquí: este
# contenedor no tiene GPU. Lo que SÍ se prueba es que, sin GPU o sin CUDA,
# rehúsan con exit 2, nombran lo que falta y NO publican conteo ni veredicto:
# un 0 o un «holds» ahí se leería como «el modelo corresponde al hardware».
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
HW="$RAIZ/tests/session/hardware"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
total=0; fallos=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

# Una GPU simulada que SÍ responde: así el segundo guard —PyTorch con CUDA—
# es el que decide, no el primero.
mkdir -p "$T/state/used"; echo 6000 > "$T/state/total"
printf '#!/usr/bin/env bash\nGPU_STATE="%s" exec bash "%s" "$@"\n' "$T/state" "$RAIZ/tests/session/fakes/stateful-nvidia-smi.sh" > "$T/smi"
chmod +x "$T/smi"
torch_present=$(python3 -c 'import torch' >/dev/null 2>&1 && echo si || echo no)

echo "== nivel 2: sin nvidia-smi =="
python3 "$HW/test_gpu_admission_real.py" --nvidia-smi "$T/no-existe" --out "$T/n2a" > "$T/o" 2> "$T/e"; code=$?
check "exit 2" "$code" "2"
check "nombra nvidia-smi" "$(grep -c 'nvidia-smi no responde' "$T/e")" "1"
check "sin veredicto publicado" "$(grep -c -E 'holds|violated' "$T/o")" "0"
check "sin traza escrita" "$(ls "$T/n2a" 2>/dev/null | wc -l)" "0"

echo "== nivel 2: GPU que responde, sin PyTorch con CUDA =="
if [[ "$torch_present" == no ]]; then
  python3 "$HW/test_gpu_admission_real.py" --nvidia-smi "$T/smi" --out "$T/n2b" > "$T/o" 2> "$T/e"; code=$?
  check "exit 2" "$code" "2"
  check "nombra PyTorch" "$(grep -c 'PyTorch' "$T/e")" "1"
  check "sin traza escrita" "$(ls "$T/n2b" 2>/dev/null | wc -l)" "0"
else
  echo "(PyTorch presente: el guard de CUDA no se ejercita aquí)"
fi

echo "== nivel 3: sin nvidia-smi =="
HEADLESS_POOL_NVIDIA_SMI="$T/no-existe" bash "$HW/test-gpu-pools-real.sh" "$T/n3" > "$T/o" 2> "$T/e"; code=$?
check "exit 2" "$code" "2"
check "nombra nvidia-smi" "$(grep -c 'nvidia-smi no responde' "$T/e")" "1"
check "sin aserciones publicadas" "$(grep -c -E '^(OK|FALLA)|aserciones' "$T/o")" "0"

echo "== el asignador CUDA sin PyTorch no asigna nada =="
if [[ "$torch_present" == no ]]; then
  python3 "$HW/cuda_stepped_alloc.py" "$T/ctl" 100 2 2> "$T/e"; code=$?
  check "exit 2" "$code" "2"
  check "nombra PyTorch" "$(grep -c 'PyTorch' "$T/e")" "1"
fi

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
