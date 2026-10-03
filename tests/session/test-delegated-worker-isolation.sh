#!/usr/bin/env bash
# Prueba de arquitectura: un trabajador delegado recibe SÓLO los secretos que su
# ExecutionAuthorization declara. Siembra secretos falsos en tres sitios —un
# `.env` del árbol de trabajo, el entorno del anfitrión que pide la unidad y un
# ExecutionSecret autorizado— y mira desde dentro de una unidad real.
#   repo secret       ausente   (la máscara de `.env` del despacho)
#   host secret       ausente   (la autorización no reenvía el entorno del anfitrión)
#   secret autorizado presente  (llega montado en /run/secrets)
#   y reenviar con --env un nombre de credencial se rehúsa (su valor quedaría en
#   podman inspect). El valor del anfitrión lleva un nombre opaco para que la
#   anulación `host` mida el reenvío y no esa segunda defensa.
# Anulación (THYROX_ISOLATION_ANNUL=mask|host|secret): retira una pieza del
# aislamiento y deben caer exactamente sus aserciones.
# Corre en el anfitrión porque lanza unidades: es plano de control que observa.
set -uo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
annul="${THYROX_ISOLATION_ANNUL:-}"
work="$root/.thyrox/runtime/isolation-test-$$"; mkdir -p "$work"
trap 'rm -rf "${work:?}"' EXIT
printf 'THYROX_FAKE_REPO_SECRET=repo-value-123\n' > "$work/.env"
export THYROX_FAKE_HOST_VALUE=host-value-456 THYROX_FAKE_AUTHORIZED=authorized-value-789
args=(run --task TASK-THYROX-0743 --kind test --workdir "$work")
[[ "$annul" == mask ]] || args+=(--mount "/dev/null:$work/.env:ro")
[[ "$annul" == host ]] && args+=(--env THYROX_FAKE_HOST_VALUE)
[[ "$annul" == secret ]] || args+=(--secret-from-env THYROX_FAKE_AUTHORIZED)
probe='cd "$PWD"; bun -e "const e=process.env; console.log(\"repo=\"+(\"THYROX_FAKE_REPO_SECRET\" in e)); console.log(\"host=\"+(\"THYROX_FAKE_HOST_VALUE\" in e))"; test -s /run/secrets/THYROX_FAKE_AUTHORIZED && echo authorized=true || echo authorized=false'
out="$(bash "$root/bin/podman-execution-execute" "${args[@]}" -- bash -c "$probe" 2>&1)"
ok=0 fail=0
check() { if grep -qx "$2" <<<"$out"; then ok=$((ok+1)); echo "ok   $1"; else fail=$((fail+1)); echo "FALLA $1 (esperado $2)"; fi; }
check "el secreto del .env del árbol no llega al trabajador" "repo=false"
check "el secreto del entorno del anfitrión no llega al trabajador" "host=false"
check "el ExecutionSecret autorizado sí llega" "authorized=true"
refused="$(THYROX_FAKE_HOST_TOKEN=x bash "$root/bin/podman-execution-execute" run --task TASK-THYROX-0743 --kind test --env THYROX_FAKE_HOST_TOKEN -- true 2>&1; echo "exit=$?")"
if grep -q "nombra una credencial" <<<"$refused" && grep -qx "exit=2" <<<"$refused"; then ok=$((ok+1)); echo "ok   reenviar un nombre de credencial con --env se rehúsa"
else fail=$((fail+1)); echo "FALLA reenviar un nombre de credencial con --env se rehúsa"; fi
echo "test-delegated-worker-isolation: $ok OK, $fail FALLA${annul:+ (anulado: $annul)}"
(( fail == 0 ))
