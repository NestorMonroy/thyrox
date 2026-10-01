#!/usr/bin/env bash
# Mide si Ollama en Podman alcanza el registro de modelos a traves del proxy de
# salida del entorno, en dos modos de red: el propio de Podman (control) y el del
# anfitrion (la hipotesis). La API queda solo en loopback en los dos.
set -u
IMAGE="${OLLAMA_IMAGE:-docker.io/ollama/ollama:0.35.0}"
MODEL="${PROBE_MODEL:-qwen2.5:0.5b}"
CA=/root/.ccr/ca-bundle.crt
cleanup() { podman rm -f thyrox-ollama-probe-bridge thyrox-ollama-probe-host >/dev/null 2>&1; }
trap cleanup EXIT

wait_api() {  # <port> : espera la API hasta 60 s
    for _ in $(seq 60); do curl -sf "http://127.0.0.1:$1/api/version" && return 0; sleep 1; done; return 1
}
pull_model() {  # <port>
    local started
    started=$(date +%s)
    curl -sS -m 900 "http://127.0.0.1:$1/api/pull" -d "{\"model\":\"$MODEL\",\"stream\":false}"
    echo " pull_seconds=$(( $(date +%s) - started ))"
}
common=(-e "HTTPS_PROXY=$HTTPS_PROXY" -e "https_proxy=$HTTPS_PROXY" -e "NO_PROXY=localhost,127.0.0.1"
        -e SSL_CERT_FILE=/etc/ssl/certs/proxy-ca.crt -v "$CA:/etc/ssl/certs/proxy-ca.crt:ro"
        -v thyrox-ollama-probe-models:/root/.ollama)

echo "== modo bridge (red propia de Podman), API publicada en 127.0.0.1:11535"
podman run -d --name thyrox-ollama-probe-bridge -p 127.0.0.1:11535:11434 "${common[@]}" "$IMAGE" >/dev/null
wait_api 11535; echo " api_exit=$?"
pull_model 11535
podman rm -f thyrox-ollama-probe-bridge >/dev/null

echo "== modo host, OLLAMA_HOST=127.0.0.1:11534"
podman run -d --name thyrox-ollama-probe-host --network host -e OLLAMA_HOST=127.0.0.1:11534 "${common[@]}" "$IMAGE" >/dev/null
wait_api 11534; echo " api_exit=$?"
pull_model 11534
curl -sS "http://127.0.0.1:11534/api/tags" | head -c 400; echo
podman volume inspect thyrox-ollama-probe-models --format 'volumen={{.Mountpoint}}'
