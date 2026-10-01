#!/usr/bin/env bash
# Prueba de recreacion: un contenedor NUEVO, con la misma imagen, el mismo
# volumen de modelos y una configuracion equivalente a la del contenedor del
# probe, lista el modelo y hace una inferencia minima. No toca el contenedor
# viejo ni el volumen; retira sólo el contenedor temporal que crea.
set -u
IMAGE="${OLLAMA_IMAGE:-docker.io/ollama/ollama:0.35.0}"
VOLUME="${OLLAMA_MODELS_VOLUME:-thyrox-ollama-probe-models}"
PORT="${RECREATE_PORT:-11536}"
NAME=thyrox-ollama-recreate-probe
MODEL="${PROBE_MODEL:-qwen2.5:0.5b}"
CA="${PROBE_CA_BUNDLE:-}"  # la sonda no lee claves de thyrox: la clave del servicio la declara O1
cleanup() { podman rm -f "$NAME" >/dev/null 2>&1; }
trap cleanup EXIT
old_pid=$(podman inspect thyrox-ollama-probe-host --format '{{.State.Pid}}' 2>/dev/null)
if [ -n "$old_pid" ] && [ "$old_pid" != 0 ] && [ -d "/proc/$old_pid" ]; then
  echo "ABORTA: el contenedor viejo tiene proceso vivo ($old_pid); no se comparte el volumen en caliente"; exit 2
fi
echo "contenedor viejo sin proceso vivo (pid=$old_pid): el volumen no está en uso"
args=(--name "$NAME" --network host -e "OLLAMA_HOST=127.0.0.1:$PORT"
      --label io.thyrox.role=probe -v "$VOLUME:/root/.ollama")
if [ -n "${HTTPS_PROXY:-}" ]; then args+=(-e "HTTPS_PROXY=$HTTPS_PROXY" -e "https_proxy=$HTTPS_PROXY" -e "NO_PROXY=localhost,127.0.0.1"); fi
if [ -n "$CA" ] && [ -r "$CA" ]; then args+=(-v "$CA:/etc/ssl/certs/proxy-ca.crt:ro" -e SSL_CERT_FILE=/etc/ssl/certs/proxy-ca.crt); fi
podman run -d "${args[@]}" "$IMAGE" >/dev/null || { echo "no arrancó"; exit 1; }
for _ in $(seq 60); do curl -sf "http://127.0.0.1:$PORT/api/version" >/dev/null && break; sleep 1; done
echo "version: $(curl -sS "http://127.0.0.1:$PORT/api/version")"
echo "== ollama list (desde el contenedor recreado)"
podman exec -e "OLLAMA_HOST=127.0.0.1:$PORT" "$NAME" ollama list
echo "== inferencia mínima (sin pull: el modelo sale del volumen)"
started=$(date +%s.%N)
resp=$(curl -sS -m 300 "http://127.0.0.1:$PORT/api/generate" \
  -d "{\"model\":\"$MODEL\",\"prompt\":\"Reply with the single word: ready\",\"stream\":false,\"options\":{\"temperature\":0,\"seed\":7,\"num_predict\":8}}")
echo "$resp" | jq -c '{model, response, done, done_reason, load_duration, eval_count}'
echo "pared_s=$(echo "$(date +%s.%N) - $started" | bc)"
echo "$resp" | jq -e '.done == true and (.response | length) > 0' >/dev/null && echo "RESULTADO: el modelo del volumen responde desde un contenedor nuevo" || { echo "RESULTADO: falló"; exit 1; }
