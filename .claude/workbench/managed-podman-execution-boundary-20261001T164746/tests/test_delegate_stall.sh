#!/usr/bin/env bash
# delegate.sh se detiene con 125 sólo ante inactividad MEDIDA (sin CPU ni
# transcript), y no detiene a un trabajador que consume CPU sin escribir stream.
set -uo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
scratch="$(mktemp -d)"; trap 'rm -rf "${scratch:?}"' EXIT
mkdir -p "$scratch/wb/outputs" "$scratch/wb/probes" "$scratch/home"
cp "$here/probes/delegate.sh" "$here/probes/unit_identity.sh" "$scratch/wb/probes/"
: > "$scratch/wb/manifest.jsonl"; echo prompt > "$scratch/prompt.md"; echo clave > "$scratch/secret"
cat > "$scratch/idle-cli" <<'X'
sleep 30
X
cat > "$scratch/busy-cli" <<'X'
end=$((SECONDS + 5)); while (( SECONDS < end )); do :; done; exit 0
X
ok=0 fail=0
run() { HOME="$scratch/home-$1" DELEGATE_SECRET_FILE="$scratch/secret" DELEGATE_CLI="$scratch/$1-cli" \
  DELEGATE_STALL_SECONDS=3 DELEGATE_POLL_SECONDS=1 bash "$scratch/wb/probes/delegate.sh" "$scratch/wb" "it-$1" m "$scratch/prompt.md" 1 >/dev/null 2>&1; echo $?; }
mkdir -p "$scratch/home-idle" "$scratch/home-busy"
[[ "$(run idle)" == 125 ]] && { ok=$((ok+1)); echo "OK inactivo -> 125"; } || { fail=$((fail+1)); echo "FALLA inactivo no dio 125"; }
[[ "$(run busy)" == 0 ]] && { ok=$((ok+1)); echo "OK ocupado sin stream -> 0"; } || { fail=$((fail+1)); echo "FALLA ocupado detenido"; }
grep -q '"exit":125' "$scratch/wb/outputs/cutover-executions.jsonl" && { ok=$((ok+1)); echo "OK el libro registra 125"; } || { fail=$((fail+1)); echo "FALLA libro"; }
echo "test_delegate_stall: $ok OK, $fail FALLA"; (( fail == 0 ))
