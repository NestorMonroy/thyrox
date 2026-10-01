#!/usr/bin/env bash
# Construye la imagen del laboratorio y corre la sonda de GRPO sobre el
# snapshot HF de Qwen2.5-0.5B-Instruct que ya guarda el volumen de fuentes del
# pipeline de cuantización. Sale con el código de la sonda.
set -euo pipefail
bank="$(cd "$(dirname "$0")/.." && pwd)"
image=localhost/thyrox-rlvr-lab:cpu
proxy_args=()
if [[ -n "${HTTPS_PROXY:-}" ]]; then
  proxy_args=(--build-arg "HTTPS_PROXY=$HTTPS_PROXY" --build-arg "https_proxy=$HTTPS_PROXY"
    --build-arg "PIP_CERT=/etc/ssl/certs/proxy-ca.crt" -v "${PROBE_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}:/etc/ssl/certs/proxy-ca.crt:ro")
fi
podman build --network host "${proxy_args[@]}" -t "$image" "$bank/probes/rl-image"
model_dir=/sources/Qwen__Qwen2.5-0.5B-Instruct@7ae557604adf67be50417f59c2c2f167def9a775
podman run --rm --network none --memory "${GRPO_MEMORY_LIMIT:-10g}" \
  -v thyrox-quantization-lab-sources:/sources:ro -v "$bank/probes:/probes:ro" \
  "$image" python /probes/grpo_feasibility.py "$model_dir" /tmp/grpo "${GRPO_STEPS:-2}" "${GRPO_GROUP_SIZE:-2}"
