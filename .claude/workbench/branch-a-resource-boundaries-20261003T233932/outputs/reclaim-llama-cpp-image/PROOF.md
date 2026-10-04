# Retiro de `ghcr.io/ggml-org/llama.cpp` (id 9ace0117e8ff, 2.96 GB) — TASK-THYROX-0929

Motivo: el import de Qwen3-8B (5.30 GB) lo rehusó la admisión de disco: techo 6 870 380 544 B menos el piso de
2 GiB. El piso no se toca.

| Prueba | Medida |
|---|---|
| sin etiqueta | `podman images`: `ghcr.io/ggml-org/llama.cpp:<none>` |
| ningún contenedor la usa | `podman ps -a`: ninguno con `ImageID 9ace0117e8ff` (la primitiva lo vuelve a comprobar y rehúsa si no) |
| no es padre de otra imagen | `Parent` vacío; con la imagen del laboratorio (`056739dd0acd`) comparte 1 capa (la base del SO) |
| reconstruible exactamente | `RepoDigests` incluye `ghcr.io/ggml-org/llama.cpp@sha256:88ef2d9c2a221e80d5eb96f707a719524e9fc522d34b272bf2852dde4898d2dc`, el mismo digest fijado en `src/packages/model-artifacts/quantizer-image/Containerfile:10` |
| para qué hace falta | sólo para reconstruir el laboratorio; el laboratorio construido no la necesita para correr |

No se toca `docker.io/th3rox/thyrox-task-runner:<none>` (386 MB): su papel frente a `localhost/thyrox-task-runner:dev`
es parte de H-THYROX-469.
