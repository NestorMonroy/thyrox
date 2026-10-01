# Fuente de verdad — Ollama como infraestructura gestionada que thyrox usa

Tarea: TASK-THYROX-0662 (board «Run Ollama as managed inference infrastructure
and pick the model by benchmark»). Gobierna:
`kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`
(Podman es el runtime de la infraestructura; la etiqueta de rol separa la
infraestructura de los workers) y
`adr-010-empaquetado-instalacion-infraestructura-y-servicios.rst` (capa 3).

Directiva del ejecutor 2026-09-30: *«Ollama tiene que ser usado realmente por
Thyrox»*. Hoy no lo es: el único contenedor de Ollama es
`thyrox-ollama-probe-host`, que dejó una sonda de medición
(`ollama-podman-measure-20260930T185844/probes/network_modes.sh`), sin etiqueta
de rol, con estado `running` y PID muerto tras el reinicio del contenedor. Nada
en `src/` lo declara ni lo usa.

## Lo que ya existe (P0) y se reutiliza — no se reimplementa

| Pieza | Dónde | Estado |
|---|---|---|
| declaración de la infraestructura gestionada | `src/lib/infrastructure.sh` (postgres, redis) | EXISTS_AND_REUSE — se extiende con un tercer contenedor |
| el ensure idempotente (inspect → PID vivo → stale → recrear → salud) | `src/session/infrastructure_ensure.sh`, `bin/infrastructure_ensure` | EXISTS_AND_REUSE — recorre `thyrox_infrastructure_container_names`, no cambia |
| admisión de disco antes del pull | `thyrox_infrastructure_disk_need_bytes` + `resource_admission` | EXISTS_AND_REUSE |
| upstream OpenAI-compatible del proxy local | `src/packages/provider/src/proxy/openaiCompat/`, declarado por `THYROX_OPENAI_COMPAT_BASE_URL`/`_MODEL` | EXISTS — lo cablea un ítem posterior, no éste |
| benchmark de tool calling | `.claude/workbench/ollama-cpu-benchmark-20260930T191740/probes/benchmark.py` | EXISTS — se corre después, contra el servicio gestionado |

## Medido, y el contrato que se sigue de ello

`ollama-podman-measure-20260930T185844/README.md`: con la red propia de Podman
el pull de un modelo falla (`proxyconnect tcp: dial tcp 127.0.0.1:46021:
connect: connection refused`: el proxy de salida escucha en el loopback del
anfitrión). Con `--network host` y `OLLAMA_HOST` en loopback descarga en 8 s.

`probes/ollama_image_layers.sh` de este banco (`outputs/ollama-image-layers.txt`):
4 capas, **3 750 477 083** bytes comprimidos (linux/amd64); desempaquetada
ocupa **5 513 676 936** bytes. Ya está bajada en este contenedor.

## El ítem O1 — declarar `thyrox-ollama` en la infraestructura gestionada

Archivos que te pertenecen: `src/lib/infrastructure.sh`,
`src/session/infrastructure_ensure.sh` (sólo si hace falta), `tests/session/test-infrastructure.sh`,
`tests/session/test-infrastructure-ensure.sh`, `.env.example`.

1. **Un tercer contenedor, `thyrox-ollama`**, en `_INFRASTRUCTURE_CONTAINERS`,
   con la etiqueta de rol `io.thyrox.role=infrastructure` y todas las funciones
   públicas (`create_argv`, `health_check_argv`, `image`, `disk_need_bytes`)
   extendidas, con sus comentarios `@arg` al día.
2. **Red del anfitrión, API sólo en loopback.** `--network host`,
   `-e OLLAMA_HOST=127.0.0.1:$THYROX_INFRA_OLLAMA_PORT` (default **51434**:
   loopback, lejos de 11434 para no chocar con un Ollama del anfitrión, en la
   familia 55432/56379). No se publica ningún puerto (`-p` no aplica en host).
   Es la única excepción de red de la declaración, y el comentario cita la
   medición de arriba.
3. **Proxy de salida, sólo si está.** Si `HTTPS_PROXY` está en el entorno, se
   pasan `HTTPS_PROXY`, `https_proxy` y `NO_PROXY=localhost,127.0.0.1`; si
   `THYROX_INFRA_PROXY_CA_BUNDLE` nombra un archivo legible, se monta en
   `/etc/ssl/certs/proxy-ca.crt:ro` con `SSL_CERT_FILE` apuntándolo. Sin
   proxy, ni una ni otra: un clon fuera de este entorno no hereda rutas de
   aquí. Ninguna ruta de este anfitrión (`/root/.ccr/...`) se escribe en el
   archivo; la declara `.env.example` (vacía) y el `.env` del clon.
4. **Volumen con nombre `thyrox-ollama-models` en `/root/.ollama`**: los
   modelos son la verdad durable del servicio, igual que el volumen de
   postgres; el contenedor es descartable. `rm -f` del ensure nunca toca el
   volumen.
5. **Imagen** `THYROX_INFRA_OLLAMA_IMAGE`, default
   `docker.io/ollama/ollama:0.35.0`, sobreescribible por variable.
6. **Salud**: `ollama list` dentro del contenedor (sale 0 cuando la API
   responde en `OLLAMA_HOST`). Compruébalo contra el contenedor real antes de
   fijarlo: si `ollama list` no lee `OLLAMA_HOST` del entorno del `exec`,
   declara la forma que funciona, medida.
7. **Disco**: la necesidad de Ollama no usa el factor 4 (cota superior para
   imágenes nunca bajadas): aquí las dos cifras están medidas. Declara
   `comprimido + desempaquetado` (el blob se conserva mientras se desempaqueta)
   con las dos constantes citando este banco, y deja el factor para postgres y
   redis. Si no te convence la suma, mide otra forma y dilo; no inventes.
8. **`.env.example`** declara `THYROX_INFRA_OLLAMA_IMAGE`,
   `THYROX_INFRA_OLLAMA_PORT` y `THYROX_INFRA_PROXY_CA_BUNDLE` (vacías, con su
   comentario), como las de postgres y redis.

Pruebas (TDD, primero en rojo): las suites existentes de infraestructura, con
el doble de `podman` que ya usan (no el real):
- `container_names` lista los tres en orden postgres, redis, ollama;
- el argv de ollama lleva `--network host`, `OLLAMA_HOST=127.0.0.1:51434`, la
  etiqueta de rol, el volumen, y **ningún** `--network thyrox-infra` ni `-p`;
- con `HTTPS_PROXY` y CA legible: lleva los tres `-e` del proxy, el montaje y
  `SSL_CERT_FILE`; sin `HTTPS_PROXY`: ninguno; con CA declarada ilegible: sin
  montaje (y sin `SSL_CERT_FILE`);
- `THYROX_INFRA_OLLAMA_PORT` y `_IMAGE` ganan;
- `disk_need_bytes thyrox-ollama` = comprimido + desempaquetado;
- el ensure recorre los tres y un ollama stale (running, PID muerto) se recrea
  sin que el volumen aparezca en el `rm`.
Control de anulación por rama nueva (proxy presente, CA legible, puerto por
variable): retirada cada una, caen exactamente sus aserciones; dilo con números.

No corras el ensure real ni descargues nada: el servicio real lo levanta y lo
mide el orquestador después de integrar.
