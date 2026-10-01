#!/usr/bin/env bash
# Mide, en el binario de la imagen de Ollama, qué ofrece para importar y
# cuantizar modelos: la ayuda de `create`, las formas de Modelfile y los tipos
# de cuantización que el binario nombra. Contenedor efímero, sin red ni volumen.
set -u
IMAGE="${1:-docker.io/ollama/ollama:0.35.0}"
run() { podman run --rm --network none --entrypoint "$1" "$IMAGE" "${@:2}"; }
echo "== ollama --version"; run /bin/ollama --version 2>&1 | tail -1
echo "== ollama create --help"; run /bin/ollama create --help 2>&1
echo "== tipos de cuantización nombrados por el binario (strings)"
run /bin/sh -c 'grep -aoE "\b(Q[2-8]_[0-9A-Z_]+|IQ[1-4]_[A-Z0-9_]+|F16|BF16|F32|MXFP4)\b" /bin/ollama /usr/lib/ollama/*.so 2>/dev/null | cut -d: -f2 | sort | uniq -c | sort -rn | head -40'
echo "== cadenas de import: safetensors / gguf / quantize"
run /bin/sh -c 'grep -aoE "(unsupported quantization type[^\"]{0,60}|quantization is only supported[^\"]{0,80}|safetensors[a-z ]{0,30}|convert[A-Za-z]{0,20}Model)" /bin/ollama | sort | uniq -c | sort -rn | head -25'
echo "== binarios de llama.cpp en la imagen"; run /bin/sh -c 'ls /usr/lib/ollama /usr/bin 2>/dev/null | grep -iE "llama|quant|gguf" ; echo fin'
