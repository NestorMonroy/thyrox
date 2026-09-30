# ollama-managed-service

Directiva del ejecutor 2026-09-30: *«Ollama tiene que ser usado realmente por
Thyrox»*. TASK-THYROX-0662. El contrato y el P0 están en `source.md`.

| archivo | qué hace |
|---|---|
| `probes/ollama_image_layers.sh` | mide bytes comprimidos (capas amd64) y desempaquetados de la imagen |
| `outputs/ollama-image-layers.txt` | su salida: 3 750 477 083 comprimidos, 5 513 676 936 locales |
| `items.txt`, `launch.sh`, `template.md`, `probes/verify-item.sh` | el pool del ítem O1 (declarar `thyrox-ollama`) |

Orden: O1 (servicio) → integrar → ensure real y pull del modelo por el
servicio gestionado → benchmark (`ollama-cpu-benchmark-20260930T191740`) →
elegir modelo → O2 (cablear el upstream OpenAI-compatible del proxy y el
recomendador al servicio, TASK-THYROX-0663).

## El contenedor del probe: qué es, y qué hace falta para retirarlo

Directiva del ejecutor 2026-09-30: no borrar `thyrox-ollama-probe-host` hasta
convertir el modelo y la configuración en un servicio reproducible; el volumen
`thyrox-ollama-probe-models` se conserva.

| Pieza | Qué es | Medido (`outputs/probe-container-inspection.txt`) |
|---|---|---|
| contenedor `thyrox-ollama-probe-host` | runtime y configuración | `--network host`, `OLLAMA_HOST=127.0.0.1:11534`, CA del proxy en bind `ro`, sin etiquetas de thyrox; estado `running` con el PID 22580 **inexistente**: lo mató el reinicio del contenedor y Podman conserva el estado viejo (la forma de TASK-THYROX-0605) |
| volumen `thyrox-ollama-probe-models` | los modelos | montado en `/root/.ollama`; 397 828 601 bytes; manifiesto `registry.ollama.ai/library/qwen2.5/0.5b` y sus blobs. Guarda también la clave `id_ed25519` de la instalación: no se copia a ningún archivo versionado |
| imagen `docker.io/ollama/ollama:0.35.0` | el software | `sha256:2a6e883b…`, ya bajada |

Prueba de recreación (`probes/recreate_from_volume.sh`,
`outputs/recreate-from-volume.txt`): un contenedor temporal nuevo, con la
misma imagen, el mismo volumen y configuración equivalente (otro puerto),
lista `qwen2.5:0.5b` y responde `ready` sin pull (`load_duration` 69 s en CPU
con dos pools en paralelo). El volumen no estaba en uso: el guion aborta si el
contenedor viejo tuviera proceso vivo. Se retiró sólo el temporal.

Condición de retiro del contenedor viejo:
modelo persistente ✓ · configuración reproducible ✓ · un contenedor nuevo usa
el modelo ✓ · **servicio gestionado `thyrox-ollama` levantado sobre ese
volumen** — pendiente: el ítem O1 y su integración. Hasta entonces el
contenedor viejo no se borra.

*Métrica:* `podman inspect`, contenido del volumen y respuesta de
`/api/generate` desde el contenedor recreado, n = 1.
*Ciega a:* otros modelos (sólo hay uno) y a la calidad de la respuesta más
allá de «responde».
