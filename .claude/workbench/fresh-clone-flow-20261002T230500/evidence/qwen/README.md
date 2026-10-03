# Qwen en el clon nuevo (paso 5 de P0)

| Paso | Autoridad | Resultado |
|---|---|---|
| biblioteca de Ollama | `/api/pull qwen3:4b` del servicio gestionado | falla: el blob en el almacenamiento de Ollama no es alcanzable (`pull-qwen3-4b.json`) |
| imagen del laboratorio | `image-registry-build-declared-image --task TASK-THYROX-0912 thyrox-model-quantizer` | `candidate-2027edfaf1a2`, 1.28 GB |
| `THYROX_REDIS_URL` | declaración en el `.env` del clon (lease global) | `redis://127.0.0.1:56379` |
| Hugging Face | `local-models-import run`, `Qwen/Qwen3-4B-GGUF@bc640142…`, `Qwen3-4B-Q4_K_M.gguf`, sha256 `7485fe6f…` | rehusó la admisión de RAM con el límite por defecto (8 GiB contra 6.8 GB libres); con `--memory-limit-bytes 5368709120`: registrado `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` (`hf-import.log`) |
| instalar en Ollama | `local-models-ensure` | **exit 2 `not_materializable`**: ningún artefacto permanente registrado contiene ese sha256 (`ensure-refused.json`) |

El bloqueo: `ensure` sólo instala desde un artefacto publicado en el registro
OCI y ubicado con `local-models-catalog locate`. Publicar exige
`THYROX_REGISTRY_PUBLISHER_{USERNAME,TOKEN,REGISTRY}`, ausentes en el entorno
y en `.env`. No se sustituye esa cadena por una instalación directa en Ollama.

Nota de identidad: el GGUF de Hugging Face no es el `library/qwen3:4b` de
Ollama (`3e4cb141…`, el que admite `execution_policy.json`): el ruteo de
`headless-pool` no lo elegirá hasta que la política lo declare.

## Desbloqueo (credencial `DOCKER_PAT_RW`)

| Paso | Autoridad | Resultado |
|---|---|---|
| publicar | `artifact-registry-publish-artifact`, credencial sólo en el entorno de ese proceso (`THYROX_REGISTRY_PUBLISHER_TOKEN` ← `DOCKER_PAT_RW`, usuario `th3rox`) | `verified` `th3rox/thyrox-quantization-lab-artifacts:qwen3-4b-gguf-bc640142c66e-q4_k_m` @ `sha256:6775c008…` |
| ubicar | `local-models-catalog locate --publication` | `ubicado: sha256 7485fe6f… en …@sha256:6775c008…` |
| instalar | `local-models-ensure` (por `local_control_plane_ready`) | `ready`, `downloaded` e `installed`; catálogo = materializado = runtime = `7485fe6f…`; 2 min 5 s |
| inferencia | `/api/chat` del Ollama gestionado, temperatura 0, `think: false` | «What is 17 + 25? Reply with only the number.» → `42`; carga 5.38 s, total 5.9 s |

Ni el log de la publicación ni el registro contienen el token (`grep -c` → 0).
