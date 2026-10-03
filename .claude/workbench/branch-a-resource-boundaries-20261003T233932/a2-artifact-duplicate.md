# A2 — la copia duplicada del artefacto en cada unidad de Ollama

## Search Existing

| Candidato | Comportamiento | Decisión |
|---|---|---|
| `OllamaRuntimeAdapter.prepareRuntimeArtifact` | `HEAD /api/blobs`; si falta, `pushBlob` copia el GGUF de la caché a la unidad | **EXTEND**: `artifactMounted` — con el blob montado no sube; si falta, rehúsa en vez de copiar |
| `RuntimeContainerProfile.artifactMount` (TASK-THYROX-0776) | montaje de sólo lectura de un directorio, para Transformers | **EXTEND**: `hostPath`/`containerPath` por artefacto y `mode` declarado |
| `thyrox-ollama-models` (volumen de infraestructura) | 2.50 GB: blob `7485fe6f…` (qwen3-4b), única copia en el anfitrión | no es duplicado: no se toca |
| scratch de importación `qwen25-7b-import/scratch/*.gguf` | enlace duro al GGUF de la caché (mismo inodo) | 0 bytes extra; su retención es TASK #23 |

## Medición

| | Antes (23:43Z) | Después (23:54Z) |
|---|---|---|
| libre en `/home/user` | 4 721 549 312 B | 9 400 274 944 B |
| usado | 36 412 526 592 B | 31 733 800 960 B |
| capa escribible de la unidad qwen2.5-7b | 4.68 GB (copia del blob) | 64.7 kB |
| copias físicas de `sha256-1875fb29…` | 2 (caché + overlay de la unidad) | 1 (caché) |

Equivalencia antes de retirar la unidad vieja: `outputs/a2/digests.txt` —
sha256 idéntico de la copia de la unidad y de la caché—. La unidad la retiró
`model_coordinator stop` (su camino declarado), no un `podman rm`.

## Lo que la medición corrigió

El primer intento montó el blob de sólo lectura: Ollama 0.35.0 hace `chtimes`
sobre el blob en `/api/create` y respondió 500 «read-only file system»
(`outputs/a2/qualify-ro-mount.log`). El montaje es de escritura y sólo de ese
archivo; Ollama no reescribe un blob existente. Con él, la cualificación de
protocolo de qwen2.5-7b aprobó 6/6 (`outputs/a2/qualify-rw-mount.log`).

*Ciega a:* que un runtime futuro escriba en el blob montado —el montaje rw lo
permitiría—; hoy lo acota el comportamiento medido de Ollama, no el kernel.

## Anulaciones

| Retirado | Cae |
|---|---|
| el rechazo con `artifactMounted` | 1 test del adaptador |
| el `artifactMount` del perfil de Ollama | 1 test de composición |

## Fuera de alcance, medido

`__tests__/commands.test.ts › local-models-qualify` (5 casos) no puede pasar en
ningún entorno: `qualify` siempre conecta con un coordinador y la suite no
aísla su socket —con uno vivo habla con el real, sin él el connect falla—.
Defecto previo a esta rama.
