# Pipeline de cuantización idempotente (TASK-THYROX-0718, 0722, 0723)

Fuente de verdad del ítem `quantization-pipeline`. Análisis de capacidad:
`source-capacity.md`. Imagen: `outputs/quantizer-image/README.md`.

Tareas, en este orden:
1. **TASK-THYROX-0723** — coordinación por Redis detrás del puerto.
2. **TASK-THYROX-0718** — el pipeline directo BF16 → F16 → Q4_K_M, idempotente.
3. **TASK-THYROX-0722 (sólo la parte de software)** — `--scratch-dir` y su
   preflight de capacidad mínima. No se simula que el volumen exista.

No ejecutes el pipeline real sobre el modelo (descarga de 3 GB, conversión):
eso lo corre el orquestador en exclusión. Tú construyes y pruebas con dobles.

## Lo que ya existe y se reutiliza (no se reinventa)

| Necesidad | Pieza existente |
|---|---|
| Runtime del laboratorio | imagen `localhost/thyrox-model-quantizer:dev`, digest `sha256:7bbe1b609ecf553fffa28443c41c1ba27ec02a8b45f856dc231166da0eac40ad`; definición en `src/packages/model-artifacts/quantizer-image/`. Contiene `convert_hf_to_gguf.py` (en `/app`, se ejecuta como `python /app/convert_hf_to_gguf.py`), `gguf-dump`, `llama-quantize`, `llama-perplexity`, `llama-simple`. |
| Exclusión entre ejecuciones (lease) | `@thyrox/shared-state`: `SharedStateStore.acquireLease/releaseLease` vía `openSharedStateStore` (`factory.ts`). Redis gestionado `thyrox-redis` en `THYROX_REDIS_URL` (`.env`, `redis://127.0.0.1:56379`). Redis es estado EFÍMERO (sin persistencia, `src/lib/infrastructure.sh`): ahí va sólo lo que dice qué ocurre ahora. |
| Idempotencia durable | el patrón de `src/session/pool_lifecycle.py`: el plan, con el `sha256` esperado de cada artefacto, se escribe ANTES de mover nada; un paso cuyo artefacto ya está con su hash registrado no se repite; un proceso que muere se reanuda desde el plan. |
| Admisión de disco y RAM | `bin/resource_admission disk-admit --need-bytes N --owner PID --path P --timeout 0` (0 reservó, 3 no cabe, 2 no midió; ya resta lo reservado por otros y un piso de seguridad) y `admit-ram NEED_KB --owner PID --container NAME --memory-limit-kb K --timeout 0`; `disk-release`/`release` al terminar. |
| Medida del contenedor | `bin/container_measure read <name>` (cgroup del contenedor, no GNU Time). |
| Procedencia | `src/packages/model-artifacts/artifactManifest.ts` (`ArtifactManifest`, serialización canónica) y `ggufMetadata.ts` (`readGgufMetadata`). Niveles en `quantizationLevel.ts`. |
| Ejecución de contenedores | `src/packages/podman-execution/` (`PodmanExecutor`, `podmanLockCollision`). |

## 1. TASK-THYROX-0723 — lease de la ejecución por el puerto

- Módulo `src/packages/model-artifacts/quantization/runLease.ts`: toma el lease
  `quantization:run:<runId>` con dueño `<host>:<pid>` y TTL declarado (constante
  con nombre), lo renueva con un latido mientras corre y lo suelta al final.
  Si otro dueño lo tiene vivo, la ejecución rehúsa con exit 4 nombrando al
  dueño; nunca corre en paralelo sobre el mismo directorio de trabajo.
- Recibe el `SharedStateStore` por parámetro (inyección), así se prueba con el
  adaptador `memory` y un doble; el comando lo abre con `openSharedStateStore`.
- `@thyrox/shared-state` pasa a dependencia de `@thyrox/model-artifacts`
  (sólo vía `bun install`).

## 2. TASK-THYROX-0718 — pipeline directo e idempotente

Módulos nuevos en `src/packages/model-artifacts/quantization/` (identificadores
en inglés, comentarios en español técnico):

- `quantizationPlan.ts` — puro, sin E/S:
  - `QuantizationMethod = 'direct' | 'requantized_q8_to_q4'` (el segundo lo usa
    0721; aquí sólo se declara y se rechaza en el comando hasta entonces).
  - `SourceSpec { repository, revision /* 40 hex, completa */, files: { path, sizeBytes, digest } }`
    donde `digest` es `sha256:<hex>` para LFS o `gitblob:<sha1>` para los demás.
  - Pasos, en orden: `download` → `convert` → `verify-intermediate` →
    `quantize` → `validate` → `release-intermediate` → `register`.
    `release-source` va justo tras `verify-intermediate`. Un artefacto anterior
    sólo se libera cuando el siguiente está completo y validado.
  - `requiredScratchBytes(source, method)`: pico con la liberación en orden,
    `direct = max(source + f16, f16 + q4)`, con `f16 = source` (BF16 → F16 no
    cambia el ancho) y `q4` derivado de los bits por peso del nivel (constante
    con nombre, documentada); más un margen de metadatos con nombre.
  - `evaluateScratchCapacity({ freeBytes, minimumFreeBytes, requiredBytes })`
    → admitido, o rechazo con las tres cifras.
  - `nextPendingStep(plan, records)`: un paso está hecho sólo si su registro
    trae el `sha256` y los bytes del artefacto y coinciden con lo que hay en
    disco; si no, es el siguiente pendiente. Esto hace la reejecución
    idempotente y reanudable.
- `quantizationRun.ts` — el orquestador, con dependencias inyectadas
  (`PodmanExecutor`, admisión, `SharedStateStore`, reloj, sistema de archivos,
  descarga) para que las pruebas lo ejerzan sin red ni contenedores:
  1. lease (§1); 2. preflight de capacidad del scratch (§3) y `disk-admit` +
  `admit-ram` con `--timeout 0`: si no cabe, exit 2 ANTES de descargar, con un
  `refusal.json` que trae las cifras observadas; 3. plan durable
  (`<run>/plan.json`) escrito antes de mover nada; 4. cada paso pendiente.
  - `download`: `https://huggingface.co/<repo>/resolve/<revision>/<file>`; cada
    archivo se verifica contra su `digest` (sha256, o el sha1 de objeto git
    `blob <size>\0<contenido>`) antes de registrarse; un archivo ya presente y
    verificado no se descarga otra vez. Se cuentan los bytes descargados.
  - Contenedor por paso: `podman run --rm --network none --memory <límite>
    --cpus <n> -v <scratch>:/scratch` con la imagen fijada por DIGEST, nombre
    estable `thyrox-quantize-<runId>-<step>`; antes de terminar, se lee
    `container_measure read` para el pico de memoria del cgroup.
  - `convert`: `python /app/convert_hf_to_gguf.py /scratch/source --outtype f16 --outfile /scratch/model-F16.gguf`.
  - `verify-intermediate`: `readGgufMetadata` (arquitectura, conteo de
    tensores, `general.file_type` F16).
  - `quantize`: `llama-quantize /scratch/model-F16.gguf /scratch/model-Q4_K_M.gguf Q4_K_M` (sin `--allow-requantize`).
  - `validate`: abre el GGUF (`readGgufMetadata`), arquitectura igual a la del
    F16, `general.file_type` = Q4_K_M, tamaño dentro de un rango con nombre,
    inferencia mínima con `llama-simple` (prompt fijo, `-n` acotado, salida no
    vacía), `llama-perplexity -c 128 -t 4` sobre el corpus del banco
    (`README.md` + `LICENSE` de la fuente, copiados aparte ANTES de liberar la
    fuente), `sha256` del artefacto final.
  - `register`: escribe el `ArtifactManifest` (repositorio, revisión, digest de
    cada archivo, convertidor con imagen y digest, nivel, sha256 y bytes,
    validación, `createdAt`), más `quantizationMethod` en un registro de
    ejecución propio (no altera la forma de `ArtifactManifest` si no hace
    falta). Declara en el registro: «valida el pipeline; no cualifica el
    modelo para cargas de ~73K tokens».
  - Métricas en `<run>/metrics.json`: pico de disco (mínimo de espacio libre
    muestreado cada segundo durante toda la ejecución), pico de memoria del
    cgroup por paso, duración por paso y total, bytes descargados, tamaños
    BF16 / F16 / Q4_K_M. Nada se publica como medido si el paso no corrió.
- Comando `quantizeCommand.ts` + envoltorio en `bin/` como los demás de
  `local-models` (mira cómo se generan y sigue esa forma):
  `quantize-model run --repository R --revision SHA --level Q4_K_M
   --method direct --scratch-dir DIR --run-dir DIR [--minimum-free-bytes N]
   [--memory-limit SIZE] [--cpus N]`. Exit: 0 hecho, 2 rehusó por capacidad o
   admisión (sin descargar), 4 lease ocupado, 1 fallo de un paso (el plan queda
   para reanudar).

## 3. TASK-THYROX-0722 — scratch externo, preparado y no simulado

- `--scratch-dir` es el único lugar de los bytes grandes; Podman sólo lo
  consume por bind mount. El almacenamiento no pertenece a Podman.
- `--minimum-free-bytes` (para el 7B: 40 GiB = 42949672960) se compara con el
  espacio libre REAL del sistema de archivos del scratch (`statfs`); si no
  alcanza: exit 2, sin descargar, sin convertir, sin métricas de ejecución.
- No crear VMs, archivos-disco ni loop devices.

## Pruebas (bun test, desde `src/packages/model-artifacts`)

- plan: orden de pasos; `requiredScratchBytes` para el 1.5B medido
  (`model.safetensors` 3 087 467 144 bytes, total 3 098 973 788); el rechazo
  de capacidad con sus tres cifras; `nextPendingStep` salta lo verificado y
  repite un paso cuyo artefacto cambió de hash (la anulación: quitar la
  comparación de hash hace caer exactamente ese caso).
- lease: rehúsa con dueño vivo ajeno; renueva el propio; suelta al final, también
  si un paso falla.
- orquestador con dobles: la reejecución tras un fallo en `quantize` no
  repite `download` ni `convert`; un rechazo de admisión sale 2 sin llamar a la
  descarga; `--minimum-free-bytes` mayor que lo libre sale 2 sin descargar; la
  fuente no se libera antes de verificar el F16.

## Datos medidos de la fuente de prueba

`outputs/coder-1.5b-source.txt`: `Qwen/Qwen2.5-Coder-1.5B-Instruct`, revisión
`2e1fd397ee46e1388853d2af2c993145b0f1098a`, apache-2.0, 10 archivos,
3 098 973 788 bytes; `model.safetensors` sha256
`c1b9b30e907950516ba3c646bdf570d8084c25a6410a0cdca80cf04b11bc13a8`.

## Corrección: la ejecución pasa por `@thyrox/podman-execution` (2026-10-01)

La primera versión del laboratorio componía su propio `podman run`. La vía
obligatoria de ejecución es la primitiva (ADR-THYROX-007): el laboratorio
ahora construye un `WorkerContainerSpec` con dueño `lab` y un
`WorkerResourceProfile` (sin red, memoria y CPU declaradas, `pids` 512, rootfs
escribible a propósito, scratch montado `rw`) y corre cada paso con
`runJobWithOutput`, que la primitiva gana en TDD: crear, arrancar, esperar,
leer stdout y stderr con `podman logs` y retirar siempre. Una prueba del
paquete rehúsa cualquier módulo que vuelva a componer `['run', '--rm'`; su
anulación (un módulo con esa forma) cae exactamente en ella.

## Relación con RLVR (TASK-THYROX-0708, 0710)

Lo que este pipeline mide por artefacto —perplejidad sobre un corpus fijo,
inferencia mínima, tamaño y tipo verificados, digest— es una señal
**verificable** y determinista: sirve como componente de recompensa para el
ajuste por RLVR y como puerta de aceptación de un adaptador entrenado (un
LoRA que empeore la perplejidad del corpus o deje de generar no se
registra). Lo que no aporta es la recompensa principal: la competencia en una
clase de tarea la mide la suite de 0710, y la de tool calling está saturada
(`rlvr-local-models-*/README.md`, ventaja nula). Orden: 0718 mide la cadena,
0710 da la recompensa de tarea, 0708 entrena con ambas y vuelve a pasar por
este pipeline para registrarse.
