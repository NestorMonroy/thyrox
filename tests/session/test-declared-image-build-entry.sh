#!/usr/bin/env bash
# =============================================================================
# test-declared-image-build-entry.sh — el plano de control concede una sola
# capacidad de construcción: la imagen declarada por su identidad lógica
# (TASK-THYROX-0912, H-THYROX-429)
# =============================================================================
# Casos:
#   1. `bin/image-registry-build-declared-image` es una entrada declarada;
#   2. `bin/podman-execution-execute` NO lo es: la lista autoriza ejecutables
#      enteros y la primitiva entera abriría `run`, `remove-image` y
#      `reconcile-orphans`;
#   3. `thyrox-bg` rehúsa la primitiva genérica (`build-image` y `run`) y un
#      comando arbitrario del anfitrión sin `--task`;
#   4. la política del cliente exime a la entrada declarada y niega en
#      segundo plano la primitiva genérica y un payload de shell;
#   5. la entrada misma rehúsa, sin tocar Podman, una identidad no declarada y
#      todo argumento del `build-image` genérico.
# Controles de anulación: sin la fila de la entrada cae el caso 1 y la
# exención del 4; con la primitiva declarada caen el 2, el 3 y la negación
# del 4.
# =============================================================================
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
ROOT="$PWD"
ok=0; failures=0
check() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — esperado [$3] obtenido [$2]"; failures=$((failures+1)); fi; }

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP:?}"' EXIT
source "$ROOT/src/lib/test_homes.sh"; thyrox_isolate_homes "$TMP/homes"
# Un Podman que nunca debe invocarse: si la entrada lo llama, el caso 5 lo ve.
mkdir -p "$TMP/bin"
printf '#!/usr/bin/env bash\necho "$*" >> %q\nexit 0\n' "$TMP/podman.calls" > "$TMP/bin/podman"
chmod +x "$TMP/bin/podman"
export PATH="$TMP/bin:$PATH"

ENTRY="$ROOT/bin/image-registry-build-declared-image"
source "$ROOT/src/lib/managed_execution.sh"
thyrox_control_plane_entry "$ENTRY"; check "1 la construcción declarada es entrada del plano de control" "$?" "0"
thyrox_control_plane_entry "$ROOT/bin/podman-execution-execute"; check "2 la primitiva entera no es entrada del plano de control" "$?" "1"

bg() { bash "$ROOT/bin/thyrox-bg" start "$@" >/dev/null 2>&1; echo "$?"; }
check "3 thyrox-bg rehúsa build-image genérico" "$(bg generic-build -- bin/podman-execution-execute build-image --task TASK-THYROX-0912 --context / --tag x:y)" "2"
check "3 thyrox-bg rehúsa run genérico" "$(bg generic-run -- bin/podman-execution-execute run --task TASK-THYROX-0912 --kind probe --mount /:/host:rw -- id)" "2"
check "3 thyrox-bg rehúsa un comando arbitrario del anfitrión" "$(bg host-shell -- bash -c id)" "2"

verdict() {
  python3 - "$ROOT" "$1" <<'PY'
import importlib.util, pathlib, sys
root, command = pathlib.Path(sys.argv[1]), sys.argv[2]
sys.path.insert(0, str(root / "src"))
spec = importlib.util.spec_from_file_location("gate", root / "src/hooks/detect_client_background.py")
gate = importlib.util.module_from_spec(spec); spec.loader.exec_module(gate)
result = gate.detect({"tool_name": "Bash", "tool_input": {"command": command, "run_in_background": True}})
print("deny" if isinstance(result, dict) and result.get("decision") == "deny" else "allow")
PY
}
check "4 la entrada declarada no es un payload no gestionado" "$(verdict 'bash bin/image-registry-build-declared-image --task TASK-THYROX-0912 thyrox-model-quantizer')" "allow"
check "4 la primitiva genérica se niega" "$(verdict 'bash bin/podman-execution-execute build-image --task TASK-THYROX-0912 --context / --tag x:y')" "deny"
check "4 un payload de shell se niega" "$(verdict 'bash -c id')" "deny"

# El código 2 no basta: también lo da una admisión de disco que rehúsa. Se
# exige el motivo, para que un mutante que deje pasar la petición no quede
# oculto tras otro rechazo posterior.
refused() {
  local reason="$1" errors rc
  shift
  errors="$(bash "$ENTRY" "$@" 2>&1 >/dev/null)"; rc=$?
  if grep -qF -- "$reason" <<<"$errors"; then echo "$rc"; else echo "$rc sin el motivo «$reason»"; fi
}
check "5 una identidad no declarada" "$(refused 'imagen no declarada' --task TASK-THYROX-0912 thyrox-anything)" "2"
check "5 run como identidad" "$(refused 'imagen no declarada' --task TASK-THYROX-0912 run)" "2"
check "5 --context del llamador" "$(refused "'--context'" --task TASK-THYROX-0912 --context / thyrox-model-quantizer)" "2"
check "5 --mount del socket de Podman" "$(refused "'--mount'" --task TASK-THYROX-0912 --mount /run/podman/podman.sock thyrox-model-quantizer)" "2"
check "5 Podman no se invocó en ningún rechazo" "$(cat "$TMP/podman.calls" 2>/dev/null | wc -l | tr -d ' ')" "0"

echo "test-declared-image-build-entry: $ok ok, $failures falla(s)"
(( failures == 0 ))
