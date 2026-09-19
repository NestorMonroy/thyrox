#!/bin/bash
# El techo real del sistema de archivos — lo que `Avail` no dice.
#
# TASK-THYROX-0051. `pack_headroom.py` se declara **ciega a** «los otros
# escritores del mismo sistema de archivos» y a por que el disco libre es el
# que es. Este guion cubre esa mitad: mide si `Avail` ES el techo, si hay una
# reserva y si quien llama la alcanza.
#
# EL CONTROL QUE DISCRIMINA (caso 5): la anulacion del bit 24. Este contenedor
# declara `resv_strict` y un `CapEff` al que le falta CAP_SYS_RESOURCE, asi que
# su veredicto real es RESERVA_INALCANZABLE. Retirado el test de ese bit, el
# veredicto TIENE que pasar a RESERVA_ALCANZABLE — y nada mas puede caer. Un
# guion que publicara el mismo veredicto con y sin esa comprobacion no estaria
# midiendo la capacidad, seria un adorno (sub-patron D).

set -uo pipefail
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/src/paths/reach.py" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
cd "$_thyrox_root" || exit 1

SCRIPT=src/repo/disk-headroom.sh
PASSED=0; FAILED=0
assert_equals() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}
assert_contains() {
    if grep -qF -- "$2" <<<"$3"; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        no assert_contains [%s] en:\n%s\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}
# El negativo de assert_contains. Antes esto se escribia como
# `assert_equals ... 0 "$(grep -c ...)"`, y esa forma es fragil: `grep -c` emite
# DOS senales que se contradicen —stdout «0» y exit 1— asi que el veredicto
# depende de cual de las dos lea quien llama. Dentro de un `if` el codigo de
# salida lo consume la condicion y `pipefail` no lo propaga: esa es la forma
# segura, y es la que assert_contains ya usaba. Adyacente a TASK-THYROX-0148.
assert_not_contains() {
    if ! grep -qF -- "$2" <<<"$3"; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLO %s\n        NO deberia contener [%s], y esta en:\n%s\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}

FIXTURES=$(mktemp -d)
trap 'rm -rf "$FIXTURES"' EXIT

# CapEff completo de 64 bits: todo puesto, incluido el 24.
printf 'Name:\tprueba\nCapEff:\t000001ffffffffff\n' > "$FIXTURES/status-con-24"
# El de ESTE contenedor: digito 10 = 'e' -> bit 24 apagado.
printf 'Name:\tprueba\nCapEff:\t000001fffeffffff\n' > "$FIXTURES/status-sin-24"
printf '/dev/x / ext4 rw,relatime 0 0\n'                       > "$FIXTURES/mounts-sin-reserva"
printf '/dev/x / ext4 rw,relatime,resuid=65534 0 0\n'          > "$FIXTURES/mounts-con-reserva"
printf '/dev/x / ext4 rw,resv_strict,resuid=65534 0 0\n'       > "$FIXTURES/mounts-estricto"

# --- TASK-THYROX-0219: la forma REAL de `lsof`, con las tres trampas ---
# Fila 1-3: VIVAS (NLINK=1). Las 2-3 son el MISMO inodo por dos descriptores.
# Fila 4-5: un inodo borrado de 10 MiB sostenido por DOS procesos.
# Fila 6: borrado pero en OTRO dispositivo (memfd) — no ocupa el montaje.
cat > "$FIXTURES/lsof-mezcla" <<'LSOF'
COMMAND     PID     USER   FD   TYPE DEVICE  SIZE/OFF NLINK    NODE NAME
environme    86     root   16w   REG  254,0 165891356     1 1886483 /tmp/claude-code.log
environme    86     root    1w   REG  254,0  41943040     1 1884161 /tmp/environment-manager.out
sh           82     root    1w   REG  254,0  41943040     1 1884161 /tmp/environment-manager.out
python      900     root    3u   REG  254,0  10485760     0 2200001 /home/user/borrado.bin (deleted)
python      901     root    7u   REG  254,0  10485760     0 2200001 /home/user/borrado.bin (deleted)
6            81    64321  txt    REG    0,1   5559584     0       2 /memfd:sbx-telemetry-collector (deleted)
LSOF

echo "== 1. sin reserva: Avail ES el techo, nada que declarar =="
OUT=$(DISK_HEADROOM_STATFS="1000 200 200 4096" \
      DISK_HEADROOM_MOUNTS="$FIXTURES/mounts-sin-reserva" \
      DISK_HEADROOM_STATUS="$FIXTURES/status-con-24" \
      bash "$SCRIPT" --path . 2>&1); CODE=$?
assert_equals "exit 0 cuando no hay reserva" 0 "$CODE"
assert_contains "nombra el veredicto" "SIN_RESERVA" "$OUT"

echo "== 2. reserva ALCANZABLE: el techo es mayor que Avail =="
OUT=$(DISK_HEADROOM_STATFS="1000 500 200 4096" \
      DISK_HEADROOM_MOUNTS="$FIXTURES/mounts-con-reserva" \
      DISK_HEADROOM_STATUS="$FIXTURES/status-con-24" \
      bash "$SCRIPT" --path . 2>&1); CODE=$?
assert_equals "exit 1 cuando la reserva se alcanza" 1 "$CODE"
assert_contains "nombra el veredicto" "RESERVA_ALCANZABLE" "$OUT"

echo "== 3. resv_strict la vuelve inalcanzable AUNQUE se tenga el bit =="
OUT=$(DISK_HEADROOM_STATFS="1000 500 200 4096" \
      DISK_HEADROOM_MOUNTS="$FIXTURES/mounts-estricto" \
      DISK_HEADROOM_STATUS="$FIXTURES/status-con-24" \
      bash "$SCRIPT" --path . 2>&1); CODE=$?
assert_equals "exit 3 con resv_strict y bit puesto" 3 "$CODE"
assert_contains "nombra resv_strict como la causa" "resv_strict" "$OUT"

echo "== 4. sin el bit 24 la reserva es inalcanzable =="
OUT=$(DISK_HEADROOM_STATFS="1000 500 200 4096" \
      DISK_HEADROOM_MOUNTS="$FIXTURES/mounts-con-reserva" \
      DISK_HEADROOM_STATUS="$FIXTURES/status-sin-24" \
      bash "$SCRIPT" --path . 2>&1); CODE=$?
assert_equals "exit 3 sin CAP_SYS_RESOURCE" 3 "$CODE"
assert_contains "nombra la capacidad ausente" "CAP_SYS_RESOURCE" "$OUT"

echo "== 5. ANULACION: retirado el test del bit 24, el veredicto cambia =="
MUTANT="$FIXTURES/mutante.sh"
sed 's/^THYROX_TEST_BIT_RESOURCE=1$/THYROX_TEST_BIT_RESOURCE=0/' "$SCRIPT" > "$MUTANT"
assert_equals "la anulacion modifico el guion" 1 "$(diff -q "$SCRIPT" "$MUTANT" >/dev/null; echo $?)"
OUT=$(DISK_HEADROOM_STATFS="1000 500 200 4096" \
      DISK_HEADROOM_MOUNTS="$FIXTURES/mounts-con-reserva" \
      DISK_HEADROOM_STATUS="$FIXTURES/status-sin-24" \
      bash "$MUTANT" --path . 2>&1); CODE=$?
assert_equals "sin la comprobacion del bit, pasa a ALCANZABLE" 1 "$CODE"

echo "== 6. rehusa SIN cifra si no puede leer las capacidades =="
OUT=$(DISK_HEADROOM_STATFS="1000 500 200 4096" \
      DISK_HEADROOM_MOUNTS="$FIXTURES/mounts-con-reserva" \
      DISK_HEADROOM_STATUS="$FIXTURES/no-existe" \
      bash "$SCRIPT" --path . 2>&1); CODE=$?
assert_equals "exit 2 al rehusar" 2 "$CODE"
assert_not_contains "no emite ninguna cifra en MiB" "MiB" "$OUT"

echo "== 7. rehusa si la ruta no existe =="
bash "$SCRIPT" --path "$FIXTURES/no-existe-tampoco" >/dev/null 2>&1
assert_equals "exit 2 ante ruta ausente" 2 "$?"

echo "== 8. control POSITIVO real: este contenedor, sin fixture =="
OUT=$(bash "$SCRIPT" --path . 2>&1); CODE=$?
assert_equals "este contenedor declara la reserva inalcanzable" 3 "$CODE"
assert_contains "cita la reserva medida" "reserva" "$OUT"

echo "== 9. borrado y abierto: SOLO lo borrado, una vez por inodo, en ESTE dispositivo =="
# TASK-THYROX-0219. El fixture lleva 263.51 MiB de filas. De ellas:
#   - 238.21 MiB estan VIVAS (NLINK=1): borrarlas no devuelve nada, ya estan contadas
#   -   5.30 MiB estan borradas pero en otro dispositivo: no ocupan este montaje
#   -  10.00 MiB es el inodo borrado REAL, sostenido por DOS descriptores
# 10.00 MiB es el UNICO valor que satisface las tres correcciones a la vez.
OUT=$(DISK_HEADROOM_LSOF="$FIXTURES/lsof-mezcla" \
      DISK_HEADROOM_DEV="254,0" \
      DISK_HEADROOM_STATFS="1000 200 200 4096" \
      DISK_HEADROOM_MOUNTS="$FIXTURES/mounts-sin-reserva" \
      DISK_HEADROOM_STATUS="$FIXTURES/status-con-24" \
      bash "$SCRIPT" --path . 2>&1)
assert_contains "cuenta el inodo borrado una sola vez" "borrado y abierto 10.00 MiB" "$OUT"

echo "== 10. cada correccion tiene su cifra equivocada, y NINGUNA se publica =="
# Cada aserccion esta anclada al valor que el guion publicaria si se le retirase
# ESA correccion y solo esa. Sin ese anclaje, una aserccion pasa por la razon
# equivocada: medido al escribirla, «no suma ningun archivo VIVO» anclada a
# 263.51 sobrevivia a retirar el filtro de borrado, porque con la deduplicacion
# y el dispositivo aun puestos la cifra cae a 208.20 y el grep no la buscaba.
# Es el sub-patron D dentro del control escrito para evitarlo.
SIN_NADA=$(awk 'NR>1 && $7 ~ /^[0-9]+$/ {s+=$7} END{printf "%.2f", s/1048576}' "$FIXTURES/lsof-mezcla")
SIN_BORRADO=$(awk 'NR>1 && $6=="254,0" && $7 ~ /^[0-9]+$/ && !v[$6":"$9]++ {s+=$7} END{printf "%.2f", s/1048576}' "$FIXTURES/lsof-mezcla")
SIN_DEDUPE=$(awk 'NR>1 && $NF=="(deleted)" && $6=="254,0" && $7 ~ /^[0-9]+$/ {s+=$7} END{printf "%.2f", s/1048576}' "$FIXTURES/lsof-mezcla")
SIN_DEV=$(awk 'NR>1 && $NF=="(deleted)" && $7 ~ /^[0-9]+$/ && !v[$6":"$9]++ {s+=$7} END{printf "%.2f", s/1048576}' "$FIXTURES/lsof-mezcla")
assert_equals "el fixture discrimina: sin ninguna correccion" "263.51" "$SIN_NADA"
assert_equals "el fixture discrimina: sin el filtro de borrado" "208.21" "$SIN_BORRADO"
assert_equals "el fixture discrimina: sin deduplicar por inodo" "20.00" "$SIN_DEDUPE"
assert_equals "el fixture discrimina: sin acotar al dispositivo" "15.30" "$SIN_DEV"
for CIFRA in "$SIN_NADA" "$SIN_BORRADO" "$SIN_DEDUPE" "$SIN_DEV"; do
    assert_not_contains "no publica la cifra de $CIFRA MiB" "borrado y abierto $CIFRA MiB" "$OUT"
done

printf '\nok=%d fallo=%d\n' "$PASSED" "$FAILED"
[[ $FAILED -eq 0 ]]
