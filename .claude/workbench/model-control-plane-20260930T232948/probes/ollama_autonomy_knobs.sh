#!/usr/bin/env bash
# Mide en el binario de Ollama las variables con las que decide por su cuenta
# (residencia, modelos cargados, concurrencia, dispositivos, planificacion) y
# su descripcion, y que parametros de peticion lo acotan (keep_alive,
# num_gpu, main_gpu). Contenedor efimero sin red.
set -u
IMAGE="${1:-docker.io/ollama/ollama:0.35.0}"
podman run --rm --network none --entrypoint /bin/sh "$IMAGE" -c '
  echo "== variables OLLAMA_* con descripcion"
  grep -aoE "OLLAMA_[A-Z_]+[^\x00-\x1f\"]{0,3}[^\x00-\x1f]{0,110}" /bin/ollama | grep -E "^OLLAMA_(MAX_LOADED_MODELS|KEEP_ALIVE|NUM_PARALLEL|MAX_QUEUE|SCHED_SPREAD|GPU_OVERHEAD|LOAD_TIMEOUT|FLASH_ATTENTION|KV_CACHE_TYPE|NOPRUNE|NEW_ENGINE|CONTEXT_LENGTH|MULTIUSER_CACHE|LLM_LIBRARY)" | sort -u | head -40
  echo "== dispositivos"; grep -aoE "(CUDA_VISIBLE_DEVICES|HIP_VISIBLE_DEVICES|GPU_DEVICE_ORDINAL|ROCR_VISIBLE_DEVICES)" /bin/ollama | sort | uniq -c
  echo "== parametros de peticion"; grep -aoE "\"(keep_alive|num_gpu|main_gpu|num_ctx|num_thread|use_mmap)\"" /bin/ollama | sort | uniq -c'
