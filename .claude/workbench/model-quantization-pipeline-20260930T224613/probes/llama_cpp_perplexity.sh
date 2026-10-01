#!/usr/bin/env bash
# Perplexity de cada GGUF del laboratorio sobre un texto ingles versionado
# (dos capitulos de _references/harness-books, con PROVENANCE.md), mismo
# contexto y mismos hilos para todos los niveles: la comparacion es relativa.
set -u
IMAGE="${LLAMA_CPP_IMAGE:-ghcr.io/ggml-org/llama.cpp:full}"
ARTIFACTS=thyrox-quantization-lab-artifacts
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
out_root=$(podman volume inspect "$ARTIFACTS" --format '{{.Mountpoint}}')
cat "$ROOT/_references/harness-books/book1/chapter-07-multi-agent-and-verification.md" \
    "$ROOT/_references/harness-books/book1/chapter-08-team-landing-practices.md" > "$out_root/eval.txt"
echo "texto_bytes=$(wc -c < "$out_root/eval.txt") sha256=$(sha256sum "$out_root/eval.txt" | cut -c1-16)"
for level in ${LEVELS:-F16 Q8_0 Q4_K_M}; do
  t0=$(date +%s)
  line=$(podman run --rm --network none -v "$ARTIFACTS:/artifacts:ro" --entrypoint /app/llama-perplexity "$IMAGE" \
    -m "/artifacts/model-$level.gguf" -f /artifacts/eval.txt -c 512 -t 4 2>&1 | grep -oE "Final estimate: PPL = [0-9.]+ \+/- [0-9.]+" | tail -1)
  echo "$level: ${line:-sin estimacion} pared_s=$(( $(date +%s) - t0 ))"
done
