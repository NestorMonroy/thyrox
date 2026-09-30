#!/usr/bin/env bash
# Mide si la reserva del ext4 raíz es alcanzable por alguna vía legítima:
# el propio sistema de archivos, Podman, un dispositivo virtio o zram.
set -euo pipefail
T="${THYROX_ROOT:-/home/user/thyrox}"
echo "== disk-headroom"
bash "$T/bin/disk-headroom" || echo "disk_headroom_exit=$?"
echo "== bloque de dispositivos (virtio)"
lsblk -o NAME,SIZE,TYPE,RO,MOUNTPOINT,FSTYPE
echo "== montaje raiz"
findmnt -no SOURCE,TARGET,FSTYPE,OPTIONS /
echo "== almacen de Podman"
podman info --format '{{.Store.GraphRoot}} {{.Store.GraphDriverName}}'
findmnt -no SOURCE,FSTYPE -T "$(podman info --format '{{.Store.GraphRoot}}')"
echo "== capacidades efectivas (bit 24 = CAP_SYS_RESOURCE)"
cap_eff=$(gawk '/^CapEff/{print $2}' /proc/self/status)
echo "CapEff=$cap_eff bit24=$(( (16#$cap_eff >> 24) & 1 ))"
echo "== zram"
echo "zram0_disksize=$(cat /sys/block/zram0/disksize)"
free -b | awk 'NR<=2'
