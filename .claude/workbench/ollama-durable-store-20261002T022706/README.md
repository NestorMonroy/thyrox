# ollama-durable-store

## El encargo

> «thyrox-ollama debe usar almacenamiento durable gestionado por Thyrox
> mediante un volumen Podman declarado como infraestructura […] Si existe y
> contiene el store durable correcto de Ollama: reutilízalo. No crees otro.»
> (ejecutor, 2026-10-02). TASK-THYROX-0757.

## Lo medido antes de decidir

| volumen | bytes | contenido | etiquetas | montado por |
|---|---|---|---|---|
| `thyrox-ollama-models` (default declarado en `src/lib/infrastructure.sh:103`) | 32 K | store vacío | ninguna | — |
| `thyrox-ollama-probe-models` (el que fijaba el `.env`) | 36 K | store vacío | ninguna | thyrox-ollama (hasta esta prueba) |
| `thyrox-ollama-bench-models` | 2.4 G | `qwen3:4b`, 5 blobs | ninguna | — |

- Mountpoint medido en la imagen y en el runtime: la imagen
  `docker.io/ollama/ollama:0.35.0` no declara `OLLAMA_MODELS`; `HOME=/root`,
  uid 0, y el store vive en `/root/.ollama/models/{blobs,manifests,metadata}`,
  el destino ya declarado (`_INFRASTRUCTURE_OLLAMA_MODELS_DIR`).
- Ningún código de producción borra volúmenes (0 `volume rm`/`prune` fuera de
  comentarios en `src/`): recrear el contenedor no puede retirar el volumen.
- La primitiva creaba volúmenes sin etiquetas. Ahora `ensureVolumes` los crea
  con `thyrox.owner-kind`, `thyrox.owner-id`, `thyrox.resource-kind` y
  `thyrox.resource-name`, sin el pid: el volumen sobrevive al proceso. Un
  volumen que ya existía se conserva como está (Podman no re-etiqueta).

## Estado de la prueba real (en curso)

`outputs/durability.log`, primera pasada:

1. bootstrap sobre `thyrox-ollama-bench-models`: recreado por deriva de
   volumen, exit 0, montaje `thyrox-ollama-bench-models:/root/.ollama`.
2. artefacto reconocible `thyrox-durability-probe:20261002t022736`, creado
   desde `qwen3:4b` sin descarga; digest `a79806aa…`.
3. se retiró SÓLO el contenedor; el volumen sigue presente.
4. el bootstrap rehusó con exit 3: locks de Podman desfasados (asignados 7,
   referenciados 8). Los volúmenes comparten números de lock con contenedores
   (la forma de H-THYROX-308) y retirar el contenedor liberó uno que un volumen
   aún referencia. La compuerta actuó como debe.

Los PASS/FAIL de los pasos 5-7 de esa pasada NO valen: corrieron sin
contenedor. `probes/recover_and_resume.sh` espera una ventana sin unidades de
tarea vivas, corre la recuperación EXPLÍCITA de locks y retoma desde el paso 4.
