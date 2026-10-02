#!/usr/bin/env bash
# test-bg-managed-execution.sh — thyrox-bg orquesta; el payload corre en una
# unidad de ejecución (ADR-007 Regla 4, enmienda 1.16.0; TASK-THYROX-0743).
#
# Con --task/--kind el comando de `start` se entrega como argv al runner de la
# primitiva: el anfitrión sólo supervisa al runner. Sin ellos sólo se lanza
# una entrada declarada del plano de control —por el módulo al que apunta su
# envoltorio, no por su nombre— y todo lo demás se rehúsa sin lanzar nada.
#
# Qué haría fallar a este control:
# - que un payload con --task corriera en el anfitrión en vez de llegar al runner;
# - que un payload sin --task (un `bash -c`) se lanzara;
# - que un envoltorio con el nombre de una entrada del plano de control pero
#   apuntando a otro módulo se aceptara.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
source "$ROOT/src/lib/assert.sh"
source "$ROOT/src/lib/test_homes.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }
BG="$ROOT/src/session/bg.sh"

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK:?}"' EXIT
thyrox_isolate_homes "$WORK"
: > "$WORK/empty.env"
export THYROX_ENV_FILE="$WORK/empty.env"

# El runner doble registra su argv y ejecuta lo que sigue a `--`, como haría la unidad.
cat > "$WORK/runner" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$WORK/runner.log"
while [[ "\$1" != "--" ]]; do shift; done; shift
exec "\$@"
STUB
chmod +x "$WORK/runner"
export THYROX_MANAGED_EXECUTION_RUNNER="$WORK/runner"

out="$(bash "$BG" start gestionado --grace 10 --task TASK-THYROX-0001 --kind test --network host --mount /srv:/srv:ro -- bash -c 'echo dentro; exit 6' 2>&1)"; rc=$?
thyrox_check "caso 1: el código del payload vuelve por el runner" "6" "$rc"
if grep -q -- "^run --task TASK-THYROX-0001 --kind test --network host --mount /srv:/srv:ro -- bash -c echo dentro; exit 6$" "$WORK/runner.log" 2>/dev/null; then
  ok "caso 1: el runner recibe la autorización y el payload como argv"
else
  bad "caso 1: el runner no recibió la autorización esperada: [$(cat "$WORK/runner.log" 2>/dev/null)]"
fi
[[ "$out" == *dentro* ]] && ok "caso 1: la salida del payload llega al log" || bad "caso 1: falta la salida: [$out]"

: > "$WORK/runner.log"
out="$(bash "$BG" start suelto --grace 5 -- bash -c 'touch "$1"' _ "$WORK/tocado" 2>&1)"; rc=$?
thyrox_check "caso 2: un payload sin --task se rehúsa con 2" "2" "$rc"
[[ ! -e "$WORK/tocado" ]] && ok "caso 2: no corrió nada en el anfitrión" || bad "caso 2: el payload corrió en el anfitrión"
[[ "$out" == *"--task"* && "$out" == *"plano de control"* ]] && ok "caso 2: el rehúso nombra --task y el plano de control" || bad "caso 2: rehúso sin remedio: [$out]"

out="$(bash "$BG" start sin-tipo --grace 5 --task TASK-THYROX-0001 -- true 2>&1)"; rc=$?
thyrox_check "caso 3: --task sin --kind se rehúsa con 2" "2" "$rc"

# Una entrada declarada del plano de control corre en el anfitrión: lo decide el módulo.
mkdir -p "$WORK/tree/bin" "$WORK/tree/src/session" "$WORK/tree/src/packages/podman-execution"
printf 'wait-jobs\tsrc/session/wait-jobs.sh\tbarrera del ledger: observa, no ejecuta payload\n' > "$WORK/entries.tsv"
printf '#!/usr/bin/env bash\nexec bash "$(dirname "$0")/../src/session/wait-jobs.sh" "$@"\n' > "$WORK/tree/bin/wait-jobs"
printf '#!/usr/bin/env bash\necho barrera; exit 0\n' > "$WORK/tree/src/session/wait-jobs.sh"
chmod +x "$WORK/tree/bin/wait-jobs"
export THYROX_CONTROL_PLANE_ENTRIES="$WORK/entries.tsv"
out="$(bash "$BG" start barrera --grace 10 -- "$WORK/tree/bin/wait-jobs" 2>&1)"; rc=$?
thyrox_check "caso 4: una entrada declarada del plano de control corre" "0" "$rc"
[[ "$out" == *barrera* ]] && ok "caso 4: su salida llega al log" || bad "caso 4: falta su salida: [$out]"

# El mismo nombre, apuntando a otro módulo, no es la entrada declarada.
printf '#!/usr/bin/env bash\nexec bash -c "touch %s"\n' "$WORK/impostor" > "$WORK/tree/bin/wait-jobs"
out="$(bash "$BG" start impostor --grace 5 -- "$WORK/tree/bin/wait-jobs" 2>&1)"; rc=$?
thyrox_check "caso 5: un envoltorio que no apunta a su módulo declarado se rehúsa" "2" "$rc"
[[ ! -e "$WORK/impostor" ]] && ok "caso 5: no corrió nada" || bad "caso 5: el impostor corrió"

# Una credencial viaja por su NOMBRE: el runner la monta como secreto; su valor
# nunca entra en el argv que bg compone.
: > "$WORK/runner.log"
export THYROX_TEST_CREDENTIAL="valor-que-no-debe-aparecer"
bash "$BG" start con-secreto --grace 10 --task TASK-THYROX-0001 --kind probe --secret-from-env THYROX_TEST_CREDENTIAL -- true >/dev/null 2>&1
if grep -q -- "^run --task TASK-THYROX-0001 --kind probe --secret-from-env THYROX_TEST_CREDENTIAL -- true$" "$WORK/runner.log" 2>/dev/null; then
  ok "caso 6: --secret-from-env llega al runner por nombre"
else
  bad "caso 6: el runner no recibió --secret-from-env: [$(cat "$WORK/runner.log" 2>/dev/null)]"
fi
! grep -q "valor-que-no-debe-aparecer" "$WORK/runner.log" && ok "caso 6: el valor no aparece en el argv" || bad "caso 6: el valor apareció en el argv"

: > "$WORK/runner.log"
bash "$BG" start de-consumidor --grace 10 --work ai-course-notes:cs224r/n/001 --kind test -- true >/dev/null 2>&1; rc=$?
thyrox_check "caso 7: --work se acepta en lugar de --task" "0" "$rc"
if grep -q -- "^run --work ai-course-notes:cs224r/n/001 --kind test -- true$" "$WORK/runner.log" 2>/dev/null; then
  ok "caso 7: el runner recibe la referencia de trabajo del consumidor, no una TASK"
else
  bad "caso 7: el runner no recibió --work: [$(cat "$WORK/runner.log" 2>/dev/null)]"
fi
out="$(bash "$BG" start ambas --grace 5 --task TASK-THYROX-0001 --work a:b --kind test -- true 2>&1)"; rc=$?
thyrox_check "caso 8: --task y --work juntos se rehúsan con 2" "2" "$rc"

thyrox_summary
