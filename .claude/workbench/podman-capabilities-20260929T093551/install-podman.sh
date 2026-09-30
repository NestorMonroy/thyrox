#!/usr/bin/env bash
# Instala Podman por el contrato del toolchain (opt-in) y deja la evidencia del re-chequeo.
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
source "$root/src/lib/toolchain.sh"
THYROX_INSTALL_PODMAN=1 thyrox_toolchain_require_podman
rc=$?
echo "require_podman exit=$rc bin=${THYROX_TOOLCHAIN_PODMAN_BIN:-}"
podman --version
podman info --format '{{.Host.OCIRuntime.Name}} {{.Host.CgroupsVersion}} {{.Host.CgroupManager}} {{.Store.GraphDriverName}}'
exit $rc
