#!/usr/bin/env bash
# test-quantizer-image-build.sh — la imagen del cuantizador se construye por la
# primitiva (`build-image` de @thyrox/podman-execution), nunca con `podman build`
# directo (ADR-007 Regla 4, TASK-THYROX-0747). Lo que build.sh sigue invocando de
# `podman` es medida: `image inspect` e `history`.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/packages/model-artifacts/quantizer-image/build.sh"
CONTAINERFILE="$ROOT/src/packages/model-artifacts/quantizer-image/Containerfile"
source "$ROOT/src/lib/assert.sh"
WORK="$(mktemp -d)"; trap 'rm -rf "${WORK:?}"' EXIT
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

cat > "$WORK/runner" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$WORK/runner.log"
echo sha256:feedface
STUB
cat > "$WORK/podman" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$WORK/podman.log"
case "\$1 \$2" in
  "image inspect") echo '[{"Id":"feedface","Digest":"sha256:d","Size":42}]' ;;
  history*) echo '[{"size":42,"CreatedBy":"RUN true"}]' ;;
esac
STUB
cat > "$WORK/time" <<'STUB'
#!/usr/bin/env bash
# GNU Time falso: -v -o ARCHIVO COMANDO...
shift; out="$2"; shift 2; : > "$out"; exec "$@"
STUB
chmod +x "$WORK/runner" "$WORK/podman" "$WORK/time"

THYROX_MANAGED_EXECUTION_RUNNER="$WORK/runner" THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman" \
THYROX_TOOLCHAIN_TIME_BIN="$WORK/time" HTTPS_PROXY=http://127.0.0.1:3128 \
  bash "$SUBJECT" "$WORK/out" localhost/thyrox-model-quantizer:test TASK-THYROX-0747 > "$WORK/stdout" 2>&1
thyrox_check "build.sh sale 0" "0" "$?"
runner_argv="$(cat "$WORK/runner.log" 2>/dev/null)"
for piece in "build-image" "--task TASK-THYROX-0747" "--context $ROOT/src/packages/model-artifacts/quantizer-image" \
             "--tag localhost/thyrox-model-quantizer:test" "--network host"; do
  [[ "$runner_argv" == *"$piece"* ]] && ok "la primitiva recibe $piece" || bad "la primitiva no recibe $piece: [$runner_argv]"
done
thyrox_check "ningún podman build directo" "0" "$(grep -c '^build' "$WORK/podman.log" 2>/dev/null)"
[[ -s "$WORK/out/image.json" ]] && ok "registra image.json con la medida" || bad "no registra image.json: $(cat "$WORK/stdout")"
thyrox_check "la Containerfile toma la CA del contrato de la primitiva (PROXY_CA)" "1" "$(grep -c '^ARG PROXY_CA$' "$CONTAINERFILE")"
thyrox_check "la Containerfile ya no espera PIP_CERT del anfitrión" "0" "$(grep -c '^ARG PIP_CERT' "$CONTAINERFILE")"
thyrox_check "build.sh no invoca podman build" "0" "$(grep -cE '^[^#]*podman build' "$SUBJECT")"
thyrox_summary
