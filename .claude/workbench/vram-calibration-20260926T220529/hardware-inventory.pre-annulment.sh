#!/usr/bin/env bash
# El hardware que esta máquina EXPONE, con veredicto sobre la GPU NVIDIA.
#
# Una microVM Firecracker expone sobre todo dispositivos virtio (red, bloque,
# vsock), aunque sea por transporte PCI; no una GPU física. «No hay
# nvidia-smi» no prueba nada por sí solo —el binario puede faltar con la
# tarjeta presente—, así que se miden ocho señales independientes y el
# veredicto sale de su combinación:
#
#   pci_nvidia          un dispositivo PCI con fabricante 0x10de
#   pci_display         un dispositivo PCI de clase 0x03xxxx (display/3D)
#   dev_nvidia          /dev/nvidia* (nodos del driver)
#   dev_dri             /dev/dri (DRM genérico; una GPU de cómputo puede no tenerlo)
#   proc_driver_nvidia  /proc/driver/nvidia (driver cargado)
#   libcuda             libcuda en la caché de ldconfig
#   libnvml             libnvidia-ml en la caché de ldconfig
#   nvidia_smi          nvidia-smi responde a `-L`
#
# Veredicto: `nvidia-usable` (exit 0) si están la tarjeta, sus nodos, el
# driver, libcuda y nvidia-smi; `none` (exit 1) si no hay NINGUNA señal de
# NVIDIA; `partial` (exit 3), con las que faltan, en cualquier otro caso —la
# tarjeta sin driver, el driver sin nodos—. Sin /sys legible rehúsa con exit 2
# y sin veredicto: un `none` ahí se leería como «medido: no hay GPU».
#
# Uso: hardware-inventory.sh [--root DIR] [--ldconfig BIN] [--nvidia-smi BIN] [--out ARCHIVO]
#   --root lee DIR/sys, DIR/dev y DIR/proc en lugar de los del sistema (pruebas).
# Salida: una línea por dato, separada por tabuladores —pci, virtio, context,
# signal, verdict—, legible con gawk -F'\t'.
set -uo pipefail

ROOT=""
LDCONFIG_BIN=""
NVIDIA_SMI_BIN="nvidia-smi"
OUT_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --root) ROOT="${2%/}"; shift 2 ;;
        --ldconfig) LDCONFIG_BIN="$2"; shift 2 ;;
        --nvidia-smi) NVIDIA_SMI_BIN="$2"; shift 2 ;;
        --out) OUT_FILE="$2"; shift 2 ;;
        *) echo "hardware-inventory: argumento desconocido: $1" >&2; exit 2 ;;
    esac
done
if [[ -z "$LDCONFIG_BIN" ]]; then
    LDCONFIG_BIN="$(command -v ldconfig || echo /sbin/ldconfig)"
fi

read_or() { cat "$1" 2>/dev/null || printf '%s' "$2"; }
driver_of() { local link; link="$(readlink "$1/driver" 2>/dev/null)" && basename "$link" || echo none; }

pci_devices() {
    local d
    for d in "$ROOT"/sys/bus/pci/devices/*; do
        [[ -e "$d" ]] || continue
        printf 'pci\t%s\t%s\t%s\t%s\t%s\n' "${d##*/}" "$(read_or "$d/vendor" -)" \
            "$(read_or "$d/device" -)" "$(read_or "$d/class" -)" "$(driver_of "$d")"
    done
}

virtio_devices() {
    local d
    for d in "$ROOT"/sys/bus/virtio/devices/*; do
        [[ -e "$d" ]] || continue
        printf 'virtio\t%s\t%s\t%s\n' "${d##*/}" "$(driver_of "$d")" "$(read_or "$d/device" -)"
    done
}

context() {
    printf 'context\tcmdline\t%s\n' "$(read_or "$ROOT/proc/cmdline" -)"
    if [[ -z "$ROOT" ]]; then
        printf 'context\tkernel\t%s\n' "$(uname -r)"
        printf 'context\tvirt\t%s\n' "$(systemd-detect-virt 2>/dev/null || echo 'systemd-detect-virt ausente')"
        command -v lspci >/dev/null 2>&1 && lspci -nn | sed 's/^/context\tlspci\t/' \
            || printf 'context\tlspci\tausente\n'
    fi
}

# Una señal: nombre, presente/ausente y el dato que la sostiene.
signal() { printf 'signal\t%s\t%s\t%s\n' "$1" "$([[ -n "$2" ]] && echo present || echo absent)" "${2:--}"; }

pci_signals() {
    local listing="$1"
    signal pci_nvidia "$(printf '%s\n' "$listing" | gawk -F'\t' '$3 == "0x10de" {printf "%s ", $2}')"
    signal pci_display "$(printf '%s\n' "$listing" | gawk -F'\t' '$5 ~ /^0x03/ {printf "%s(%s) ", $2, $5}')"
}

node_signals() {
    signal dev_nvidia "$(ls -d "$ROOT"/dev/nvidia* 2>/dev/null | paste -sd' ')"
    signal dev_dri "$([[ -e "$ROOT/dev/dri" ]] && echo "$ROOT/dev/dri")"
    signal proc_driver_nvidia "$([[ -e "$ROOT/proc/driver/nvidia" ]] && echo "$ROOT/proc/driver/nvidia")"
}

library_signals() {
    local cache; cache="$("$LDCONFIG_BIN" -p 2>/dev/null)"
    signal libcuda "$(printf '%s\n' "$cache" | gawk '/libcuda\.so/ {print $NF; exit}')"
    signal libnvml "$(printf '%s\n' "$cache" | gawk '/libnvidia-ml\.so/ {print $NF; exit}')"
}

smi_signal() {
    local listing; listing="$("$NVIDIA_SMI_BIN" -L 2>/dev/null)" || listing=""
    signal nvidia_smi "$(printf '%s' "$listing" | head -1)"
}

# El veredicto sólo lee las líneas `signal`: no vuelve a medir.
verdict() {
    gawk -F'\t' '
        $1 == "signal" { present[$2] = ($3 == "present") }
        END {
            split("pci_nvidia dev_nvidia proc_driver_nvidia libcuda nvidia_smi", required, " ")
            split("pci_nvidia dev_nvidia proc_driver_nvidia libcuda libnvml nvidia_smi", nvidia, " ")
            missing = ""; any = 0
            for (i in nvidia) if (present[nvidia[i]]) any = 1
            for (i = 1; i <= 5; i++) if (!present[required[i]]) missing = missing required[i] " "
            if (missing == "") { print "verdict\tnvidia-usable\tmissing=-"; exit 0 }
            if (!any)          { print "verdict\tnone\tmissing=" missing; exit 1 }
            print "verdict\tpartial\tmissing=" missing; exit 3
        }'
}

main() {
    if [[ ! -d "$ROOT/sys/bus" ]]; then
        echo "hardware-inventory: REHÚSA — no hay $ROOT/sys/bus legible; no se emite veredicto" >&2
        return 2
    fi
    local listing report
    listing="$(pci_devices)"
    report="$(printf '%s\n' "$listing"; virtio_devices; context
              pci_signals "$listing"; node_signals; library_signals; smi_signal)"
    report="$(printf '%s\n' "$report" | gawk 'NF')"
    local final code
    final="$(printf '%s\n' "$report" | verdict)"; code=$?
    printf '%s\n%s\n' "$report" "$final"
    [[ -z "$OUT_FILE" ]] || printf '%s\n%s\n' "$report" "$final" > "$OUT_FILE"
    return "$code"
}

main "$@"
exit $?
