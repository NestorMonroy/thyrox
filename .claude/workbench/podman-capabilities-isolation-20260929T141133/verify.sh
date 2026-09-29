#!/usr/bin/env bash
# Verifica el ítem en su worktree: alcance del diff, shellcheck y la suite de la sonda.
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
if git diff --name-only HEAD -- .claude _references agent-results | grep -q .; then
  fail "toca .claude, _references o agent-results"
fi
S=src/lib/podman_capabilities.sh
T=tests/lib/test-podman-capabilities.sh
for cap in network_none read_only_rootfs cpu_limit readonly_mount; do
  grep -q "$cap" "$S" || fail "la sonda no publica $cap"
  grep -q "$cap" "$T" || fail "la prueba no exige $cap"
done
grep -q -- "--read-only-tmpfs=false" "$S" || fail "read_only_rootfs sin --read-only-tmpfs=false"
# El linter de shell vive en el entorno del proveedor, que el worktree no tiene: se resuelve desde el árbol principal.
main_tree="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
SC="$(command -v shellcheck || echo "$main_tree/.venv/bin/shellcheck")"
[ -x "$SC" ] || fail "no se encontró shellcheck ($SC)"
# La severidad es la del plan de cero errores del repositorio (.shellcheckrc): warning.
"$SC" -S warning "$S" "$T" || fail "shellcheck"
out=$(bash "$T" 2>&1) || { echo "$out" | tail -20 >&2; fail "suite de la sonda en rojo"; }
echo "$out" | tail -5
lines=$(bash "$S" | grep -c $'\t') || true
[ "$lines" -eq 8 ] || fail "la sonda publica $lines líneas, se esperaban 8"
echo "VERIFY OK"
