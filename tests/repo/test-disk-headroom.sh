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

FIXTURES=$(mktemp -d)
trap 'rm -rf "$FIXTURES"' EXIT

# CapEff completo de 64 bits: todo puesto, incluido el 24.
printf 'Name:\tprueba\nCapEff:\t000001ffffffffff\n' > "$FIXTURES/status-con-24"
# El de ESTE contenedor: digito 10 = 'e' -> bit 24 apagado.
printf 'Name:\tprueba\nCapEff:\t000001fffeffffff\n' > "$FIXTURES/status-sin-24"
printf '/dev/x / ext4 rw,relatime 0 0\n'                       > "$FIXTURES/mounts-sin-reserva"
printf '/dev/x / ext4 rw,relatime,resuid=65534 0 0\n'          > "$FIXTURES/mounts-con-reserva"
printf '/dev/x / ext4 rw,resv_strict,resuid=65534 0 0\n'       > "$FIXTURES/mounts-estricto"

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
assert_equals "no emite ninguna cifra en MiB" 0 "$(grep -c 'MiB' <<<"$OUT")"

echo "== 7. rehusa si la ruta no existe =="
bash "$SCRIPT" --path "$FIXTURES/no-existe-tampoco" >/dev/null 2>&1
assert_equals "exit 2 ante ruta ausente" 2 "$?"

echo "== 8. control POSITIVO real: este contenedor, sin fixture =="
OUT=$(bash "$SCRIPT" --path . 2>&1); CODE=$?
assert_equals "este contenedor declara la reserva inalcanzable" 3 "$CODE"
assert_contains "cita la reserva medida" "reserva" "$OUT"

printf '\nok=%d fallo=%d\n' "$PASSED" "$FAILED"
[[ $FAILED -eq 0 ]]
