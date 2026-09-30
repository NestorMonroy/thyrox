#!/usr/bin/env bash
# Suite del envoltorio de git que rehúsa `git stash` en un ítem de
# headless-pool --isolation worktree (TASK-THYROX-0604): `refs/stash` es
# compartido entre todos los worktrees del repositorio, y un stash del ítem
# sacaba su trabajo del working tree sin que `finalize` lo viera —el parche
# quedaba vacío y el veredicto decía `sin-cambios` en silencio (H-THYROX-275).
#
# Dos señales de distinta naturaleza: el envoltorio da `con-stash`, evidencia
# ATRIBUIBLE al ítem que lo intentó; la comparación de la pila da
# `<n>.shared-stash-anomaly`, evidencia de una mutación COMPARTIDA que no se
# le puede atribuir a nadie en particular. No se corren con un runner real:
# llaman a `item_worktree.sh` y al envoltorio de git directamente.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODULE="${ITEM_WORKTREE_MODULE:-$RAIZ/src/session/item_worktree.sh}"
GIT_GUARD="${ITEM_GIT_GUARD_MODULE:-$RAIZ/src/session/item_git_guard/git}"
INTEGRATE="${POOL_INTEGRATE_MODULE:-$RAIZ/src/session/pool_integrate.sh}"
fallos=0; total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "  ok    $1"; else echo "  FALLA $1: esperado «$3», obtenido «$2»"; fallos=$((fallos + 1)); fi
}

mkdir -p "$HOME/.cache"
F="$(mktemp -d "$HOME/.cache/thyrox-stash-test.XXXXXX")"
trap 'git -C "$F/repo" worktree prune 2>/dev/null; rm -rf "${F:?}"' EXIT
REPO="$F/repo"
git init -q "$REPO" && git -C "$REPO" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base

echo "caso a — git stash por el envoltorio rehúsa y registra el intento"
ATTEMPTS_A="$F/attempts-a"
(cd "$REPO" && THYROX_POOL_STASH_ATTEMPTS_FILE="$ATTEMPTS_A" "$GIT_GUARD" stash) > "$F/out-a" 2> "$F/err-a"; rc_a=$?
check "sale 2" "$rc_a" "2"
check "no imprime salida" "$(wc -c < "$F/out-a")" "0"
check "una línea en el archivo de intentos" "$(wc -l < "$ATTEMPTS_A")" "1"

echo "caso b — las formas que escriben refs/stash rehúsan tras opciones globales"
THYROX_POOL_STASH_ATTEMPTS_FILE="$F/attempts-b2" "$GIT_GUARD" -C "$REPO" stash create > /dev/null 2> "$F/err-b2"; rc_b2=$?
check "stash create rehúsa" "$rc_b2" "2"
THYROX_POOL_STASH_ATTEMPTS_FILE="$F/attempts-b3" "$GIT_GUARD" --git-dir "$REPO/.git" --work-tree "$REPO" stash push > /dev/null 2> "$F/err-b3"; rc_b3=$?
check "--git-dir y --work-tree con valor separado: stash push rehúsa" "$rc_b3" "2"
for form in pop apply drop clear store branch save; do
    THYROX_POOL_STASH_ATTEMPTS_FILE="$F/attempts-b-$form" "$GIT_GUARD" -C "$REPO" stash "$form" > /dev/null 2>&1; rc=$?
    check "stash $form rehúsa" "$rc" "2"
done

echo "caso b2 — las formas de sólo lectura pasan al git real y no cuentan como intento"
# `item_worktree.sh` lee la pila con `git stash list` para su línea base: un
# ítem que ejecuta las pruebas del pool no debe salir con-stash por leerla.
THYROX_POOL_STASH_ATTEMPTS_FILE="$F/attempts-b1" "$GIT_GUARD" -C "$REPO" --no-pager stash list > /dev/null 2> "$F/err-b1"; rc_b1=$?
check "-C --no-pager stash list pasa" "$rc_b1" "0"
check "stash list no registra intento" "$([[ -e "$F/attempts-b1" ]] && echo registrado || echo limpio)" "limpio"
THYROX_POOL_STASH_ATTEMPTS_FILE="$F/attempts-b4" "$GIT_GUARD" -C "$REPO" stash show > /dev/null 2>&1
check "stash show no registra intento" "$([[ -e "$F/attempts-b4" ]] && echo registrado || echo limpio)" "limpio"

echo "caso c — cualquier otro subcomando pasa al git real"
"$GIT_GUARD" -C "$REPO" status > "$F/out-c" 2> "$F/err-c"; rc_c=$?
check "status sale 0" "$rc_c" "0"
check "status trae salida real" "$(gawk '/nothing to commit|nada para hacer commit/{n++} END{print n+0}' "$F/out-c")" "1"

echo "caso d — un intento registrado da con-stash a ese ítem"
mkdir -p "$F/outd"
dird="$(bash "$MODULE" prepare "$REPO" "$F/outd" 1)"
(cd "$dird" && THYROX_POOL_STASH_ATTEMPTS_FILE="$F/outd/1.stash-attempts" "$GIT_GUARD" stash) > /dev/null 2>&1
bash "$MODULE" finalize "$REPO" "$dird" "$F/outd" 1 0
check "veredicto con-stash" "$(cat "$F/outd/1.verdict")" "con-stash"

echo "caso e — anomalía compartida: ningún ítem la atribuye, un solo registro, dos observadores"
mkdir -p "$F/oute"
dir1="$(bash "$MODULE" prepare "$REPO" "$F/oute" 1)"
dir2="$(bash "$MODULE" prepare "$REPO" "$F/oute" 2)"
REAL_GIT="$(command -v git)"
echo cambio > "$REPO/sin-guardia.txt"
"$REAL_GIT" -C "$REPO" stash push -u -m thyrox-test-anomaly > /dev/null 2>&1
hash="$("$REAL_GIT" -C "$REPO" stash list --format=%H | head -1)"
bash "$MODULE" finalize "$REPO" "$dir1" "$F/oute" 1 0
bash "$MODULE" finalize "$REPO" "$dir2" "$F/oute" 2 0
check "item1 no recibe con-stash" "$(cat "$F/oute/1.verdict")" "sin-cambios"
check "item2 no recibe con-stash" "$(cat "$F/oute/2.verdict")" "sin-cambios"
check "item1 deja la anomalía" "$(cat "$F/oute/1.shared-stash-anomaly")" "$hash"
check "item2 deja la anomalía" "$(cat "$F/oute/2.shared-stash-anomaly")" "$hash"
check "un solo parche de la anomalía" "$(find "$F/oute/unexpected-stashes" -maxdepth 1 -name '*.patch' | wc -l)" "1"
check "los dos ítems constan como observadores" \
    "$(grep -c '^item: ' "$F/oute/unexpected-stashes/$hash.meta")" "2"
check "la pila conserva la entrada" "$("$REAL_GIT" -C "$REPO" stash list | wc -l)" "1"

echo "caso f — sin stash, los veredictos existentes no cambian"
mkdir -p "$F/outf"
dirf="$(bash "$MODULE" prepare "$REPO" "$F/outf" 1)"
echo hola > "$dirf/nuevo.txt"
bash "$MODULE" finalize "$REPO" "$dirf" "$F/outf" 1 0 true
check "veredicto verificado, sin stash de por medio" "$(cat "$F/outf/1.verdict")" "verificado"

echo "caso g — pool_integrate no aplica ni con-stash ni anomalía, y los anota"
# Los artefactos se escriben en el runtime y se publican, como hace el pool:
# pool_integrate sólo lee ítems con `<n>.closed`.
LIFECYCLE="$RAIZ/bin/pool_lifecycle"
export THYROX_RUNTIME_DIR="$F/runtime"
liveg="$(bash "$LIFECYCLE" open-run "$F/outg" --owner $$)"
bash "$LIFECYCLE" begin "$liveg" "$F/outg" 1 --owner $$ > /dev/null
bash "$LIFECYCLE" begin "$liveg" "$F/outg" 2 --owner $$ > /dev/null
echo con-stash > "$liveg/1.verdict"
: > "$liveg/1.patch"; : > "$liveg/1.files"
echo verificado > "$liveg/2.verdict"
printf 'deadbeef\n' > "$liveg/2.shared-stash-anomaly"
: > "$liveg/2.patch"; : > "$liveg/2.files"
bash "$LIFECYCLE" publish "$liveg" "$F/outg" 1 --exit 0
bash "$LIFECYCLE" publish "$liveg" "$F/outg" 2 --exit 0
printf '1\t\n2\t\n' > "$F/outg/index.tsv"
bash "$INTEGRATE" "$F/outg" --repo "$REPO" > "$F/outg.log" 2>&1
check "item1 (con-stash) no se aplica" "$(gawk -F'\t' '$1 == 1 {print $2}' "$F/outg/integration.tsv")" "con-stash"
check "item2 (anomalía) no se aplica" \
    "$(gawk -F'\t' '$1 == 2 {print $2}' "$F/outg/integration.tsv")" "anomalia-stash-compartido: deadbeef"

echo "item_worktree stash guard: $((total - fallos))/$total"
[[ "$fallos" -eq 0 ]]
