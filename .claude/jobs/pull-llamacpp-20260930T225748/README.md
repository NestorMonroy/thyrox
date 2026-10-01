# pull-llamacpp

## Qué se lanzó

```
bash -c start=$(date +%s); podman pull ghcr.io/ggml-org/llama.cpp:full >/dev/null 2>&1; rc=$?; echo "pull_exit=$rc pull_s=$(( $(date +%s)-start ))"; podman image inspect ghcr.io/ggml-org/llama.cpp:full --format "digest={{.Digest}} size={{.Size}}"; podman run --rm --network none --entrypoint /bin/sh ghcr.io/ggml-org/llama.cpp:full -c "ls /app | head -60; /app/llama-quantize --help 2>&1 | head -60; python3 /app/convert_hf_to_gguf.py --help 2>&1 | grep -A3 outtype"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
