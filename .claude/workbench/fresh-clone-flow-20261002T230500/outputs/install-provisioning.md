# install.sh «listo para usar»: qué existe, qué falta (TASK-THYROX-0912)

Directiva del ejecutor 2026-10-02: *«cuando use install, ya considere los
modelos, podman, que sea opcional si se tiene kaupamex-docs […], que se
instale redis, listo para usar»*, *«también usa gnu parallel y varias
herramientas más»*.

## Medido en este clon

| Pieza | Autoridad existente | Medida | Evidencia |
|---|---|---|---|
| consumidores opcionales | `install.sh` paso 5 → `reach.py --paths` | `bash install.sh` sin argumentos sale **1** cuando no hay `kaupamex-*` al lado (`ReachRootError`) | este documento |
| herramientas | 13 instaladores opt-in en `src/lib/toolchain.sh` (`THYROX_INSTALL_{GAWK,PARALLEL,GNU_TIME,RSYNC,POPPLER,PDF_TEXT,IPROUTE2,PODMAN,REDIS,PGVECTOR,POSTGRES_TEST_DB,TEXLIVE,HUNSPELL}`) | **ninguno** lo invoca `install.sh` (`grep -c THYROX_INSTALL install.sh` → 0) | — |
| podman | `thyrox_toolchain_require_podman` | `THYROX_INSTALL_PODMAN=1` instala 4.9.3 y `podman info` responde | `evidence/install-provisioning/podman-install.txt` |
| dependencias TS | `bun install` | 587 paquetes, 3.5 s; sin él `bootstrap.ts` no corre | `evidence/install-provisioning/bun-install.txt` |
| redis | `bin/infrastructure_ensure thyrox-redis` | `created … health=healthy`; `PONG` por `127.0.0.1:56379` | `evidence/install-provisioning/infrastructure-ensure-redis.txt` |
| ollama | `bin/infrastructure_ensure thyrox-ollama` | `created … health=healthy`, 74 s | `evidence/install-provisioning/infrastructure-ensure-ollama.txt` |
| modelos | `local-models-catalog declare/locate` + `local-models-ensure` | el catálogo de un clon nuevo está **vacío** (`{"entries":[]}`): es estado de instalación en `.thyrox/models/`, no se versiona | — |
| postgres | `infrastructure_ensure thyrox-postgres` | exige `THYROX_INFRA_POSTGRES_PASSWORD`; no se levantó | — |

**Corrección:** el punto 2 del README («`gawk` no tiene instalador opt-in»)
era falso. `THYROX_INSTALL_GAWK` existe en `toolchain.sh`; la búsqueda de
entonces no lo vio.

## Por qué 5.5 GB de imagen de Ollama

`THYROX_INFRA_OLLAMA_IMAGE` por defecto es `docker.io/ollama/ollama:0.35.0`
(`src/lib/infrastructure.sh:125`), y su tamaño está medido y admitido
(`ollama-managed-service-20260930T224010`). Dentro de la imagen:

| Ruta | Tamaño |
|---|---|
| `/usr/lib/ollama/mlx_cuda_v13` | 2.7 G |
| `/usr/lib/ollama/cuda_v12` | 1.2 G |
| `/usr/lib/ollama/cuda_v13` | 812 M |
| `/usr/lib/ollama/vulkan` | 41 M |
| `/usr/bin/ollama` | 28 M |

`bin/hardware-inventory` → `verdict none`: este contenedor no tiene GPU. 4.7
de los 5.5 GB no se usan. Ningún repositorio de `th3rox` publica una variante
CPU.

## Lo que hay en Docker Hub (`th3rox`, API pública, 2026-10-02)

| Repositorio | Último push | Uso en el árbol |
|---|---|---|
| `thyrox-quantization-lab-artifacts` | 2026-10-02 | GGUF de los modelos (p. ej. `qwen3-4b-359d7dd-q4_k_m`, `local-bootstrap-20261002T180454/outputs/publication-qwen3-4b.json`) |
| `thyrox-task-runner` | 2026-10-02 | publicada como `:ubuntu24.04-bun1.3.11-uv0.8.17`, pero `executionCommand.ts:25` usa por defecto `localhost/thyrox-task-runner:dev`, que hay que **construir** |
| `thyrox-volume-archive` | 2026-10-01 | archivo de volúmenes (`archive-volumes-to-hub-20261001T055233`) |
| `thyrox-artifact-probe`, `thyrox-registry-probe` | 2026-10-01 | sondas |

`local-models-ensure` corre su trabajo de descarga en `docker.io/library/ubuntu:24.04`
(`ensure.ts`, `DEFAULT_JOB_IMAGE`), no en `thyrox-task-runner`.

## Podman: la documentación (`main`) contra el binario instalado (4.9.3)

| Función de la doc | En 4.9.3 | En thyrox hoy | Qué podría hacer |
|---|---|---|---|
| `podman artifact pull/push/extract` (artefactos OCI nativos) | **no** | cliente OCI propio + trabajo bun en ubuntu para bajar GGUF | sustituir el fetcher cuando el host tenga podman ≥ 5 |
| `--health-cmd`, `--health-on-failure=restart`, `--health-startup-cmd` | sí | salud por `podman exec` del comando (`infrastructure.sh:319`) | que podman reinicie el servicio caído sin esperar a `infrastructure_ensure` |
| `podman wait --condition healthy` | sí | 1 uso | esperar la salud sin sondeo propio |
| `podman volume export/import` | sí | 0 usos (el archivo a Docker Hub va por un probe de banco) | restaurar el volumen de modelos de Ollama sin volver a bajarlos |
| `podman system renumber` | sí | `podman_locks.sh` ya lo usa | — |
| `podman update` (límites en caliente) | sí | ningún uso para contenedores | ajustar CPU/memoria de `thyrox-ollama` según el modelo residente |
| `podman system check` | **no** | — | — |
| quadlet / `podman-restart.service` / auto-update | quadlet **no**; los demás exigen systemd | PID 1 es `process_api`: no aplican | — |

*Métrica:* la descripción que imprime `podman <subcomando> --help` (un
subcomando desconocido imprime la ayuda del padre y sale 0, así que el exit
no discrimina), y `git grep` sobre `src/`.
*Ciega a:* las opciones de un subcomando que existe; la doc es de `main`, no
de 4.9.3.
