#!/usr/bin/env bash
# `bin/hardware-inventory`: qué hardware expone esta máquina, con veredicto
# sobre la GPU NVIDIA y no sólo un volcado.
#
# Se prueba con árboles /sys, /dev y /proc FALSOS (`--root`) —la forma de una
# microVM Firecracker con sólo virtio, una NVIDIA completa y una NVIDIA sin
# driver— y con el host real como control: en este contenedor no hay GPU, y
# el instrumento tiene que decir `none`, no inventarla.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
INV="$RAIZ/src/session/hardware-inventory.sh"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
total=0; fallos=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

pci() { # raíz dirección vendor clase driver
  local d="$1/sys/bus/pci/devices/$2"; mkdir -p "$d" "$1/sys/bus/pci/drivers/$5"
  echo "$3" > "$d/vendor"; echo 0x0000 > "$d/device"; echo "$4" > "$d/class"
  [[ "$5" == none ]] || ln -s "../../../bus/pci/drivers/$5" "$d/driver"
}
virtio() { # raíz nombre id-de-dispositivo driver
  local d="$1/sys/bus/virtio/devices/$2"; mkdir -p "$d" "$1/sys/bus/virtio/drivers/$4"
  echo "$3" > "$d/device"; ln -s "../../../bus/virtio/drivers/$4" "$d/driver"
}
firecracker() { # la forma medida en este contenedor: puente Intel y virtio
  local r="$1"; mkdir -p "$r/dev" "$r/proc"
  pci "$r" 0000:00:00.0 0x8086 0x060000 none
  pci "$r" 0000:00:02.0 0x1af4 0x018000 virtio-pci
  pci "$r" 0000:00:08.0 0x1af4 0x020000 virtio-pci
  virtio "$r" virtio0 0x0002 virtio_blk
  virtio "$r" virtio1 0x0001 virtio_net
  echo "console=ttyS0 reboot=k panic=1 pci=off" > "$r/proc/cmdline"
}
no_libs="$T/ldconfig-vacio"; printf '#!/usr/bin/env bash\n:\n' > "$no_libs"; chmod +x "$no_libs"
libs="$T/ldconfig-nvidia"
printf '#!/usr/bin/env bash\necho "	libcuda.so.1 (libc6,x86-64) => /usr/lib/libcuda.so.1"\necho "	libnvidia-ml.so.1 (libc6,x86-64) => /usr/lib/libnvidia-ml.so.1"\n' > "$libs"; chmod +x "$libs"
smi_ok="$T/nvidia-smi"; printf '#!/usr/bin/env bash\necho "GPU 0: NVIDIA A100 (UUID: GPU-x)"\n' > "$smi_ok"; chmod +x "$smi_ok"

run() { # raíz ldconfig nvidia-smi
  OUT="$(bash "$INV" --root "$1" --ldconfig "$2" --nvidia-smi "$3" --out "$T/evidencia.out" 2>&1)"; CODE=$?
}
signal() { printf '%s\n' "$OUT" | gawk -F'\t' -v s="$1" '$1 == "signal" && $2 == s {print $3}'; }
verdict() { printf '%s\n' "$OUT" | gawk -F'\t' '$1 == "verdict" {print $2}'; }

echo "== 1. microVM Firecracker con sólo virtio: ninguna GPU =="
R="$T/fc"; firecracker "$R"
run "$R" "$no_libs" "$T/no-existe"
check "veredicto none" "$(verdict)" "none"
check "exit 1" "$CODE" "1"
check "ningún PCI de NVIDIA" "$(signal pci_nvidia)" "absent"
check "ninguna clase 0x03 (display)" "$(signal pci_display)" "absent"
check "los virtio aparecen con su driver" \
  "$(printf '%s\n' "$OUT" | gawk -F'\t' '$1 == "virtio" {print $3}' | sort | paste -sd,)" "virtio_blk,virtio_net"
check "la evidencia queda en --out" "$(gawk -F'\t' '$1 == "verdict" {print $2}' "$T/evidencia.out")" "none"

echo "== 2. NVIDIA completa: tarjeta, driver, nodos, bibliotecas y nvidia-smi =="
R="$T/nv"; firecracker "$R"
pci "$R" 0000:00:0b.0 0x10de 0x030200 nvidia
mkdir -p "$R/proc/driver/nvidia"; : > "$R/dev/nvidia0"; : > "$R/dev/nvidiactl"; mkdir -p "$R/dev/dri"
run "$R" "$libs" "$smi_ok"
check "veredicto nvidia-usable" "$(verdict)" "nvidia-usable"
check "exit 0" "$CODE" "0"
check "las ocho señales presentes" \
  "$(printf '%s\n' "$OUT" | gawk -F'\t' '$1 == "signal" && $3 == "present" {n++} END{print n+0}')" "8"

echo "== 3. la tarjeta está pero el driver no: parcial, y nombra lo que falta =="
R="$T/sin-driver"; firecracker "$R"
pci "$R" 0000:00:0b.0 0x10de 0x030200 none
run "$R" "$no_libs" "$T/no-existe"
check "veredicto partial" "$(verdict)" "partial"
check "exit 3" "$CODE" "3"
check "nombra el driver y los nodos que faltan" \
  "$(printf '%s\n' "$OUT" | gawk -F'\t' '$1 == "verdict" {print ($3 ~ /proc_driver_nvidia/ && $3 ~ /dev_nvidia/)}')" "1"

echo "== 4. control real: este contenedor =="
OUT="$(bash "$INV" --out "$T/host.out" 2>&1)"; CODE=$?
check "el host no tiene GPU NVIDIA: none" "$(verdict)" "none"
check "y ve dispositivos PCI (no un árbol vacío)" \
  "$(printf '%s\n' "$OUT" | gawk -F'\t' '$1 == "pci" {n++} END{print (n > 0)}')" "1"

echo "== 5. sin /sys legible no hay veredicto: exit 2, no un none =="
bash "$INV" --root "$T/vacio" > "$T/o" 2>&1; code=$?
check "exit 2" "$code" "2"
check "sin veredicto publicado" "$(gawk -F'\t' '$1 == "verdict"' "$T/o" | wc -l)" "0"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
