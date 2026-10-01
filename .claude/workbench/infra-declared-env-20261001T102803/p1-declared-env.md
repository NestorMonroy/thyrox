# P1 — TASK-THYROX-0735: las claves de infraestructura salen del `.env` declarado

Hallazgo: H-THYROX-307 (`kaupamex-docs: source/gestion/pm/thyrox/iniciativas/implementar-ciclo-de-vida-del-pool-thyrox/hallazgos/`).

`src/lib/infrastructure.sh` y `src/session/infrastructure_ensure.sh` leen cada
`THYROX_INFRA_*` sólo del entorno del proceso (`"${VAR:-default}"`). El `.env`
declara `THYROX_INFRA_OLLAMA_VOLUME`; `bin/infrastructure_ensure` no lo carga,
y así creó `thyrox-ollama` sobre un volumen vacío.

1. Resolución. Cada `THYROX_INFRA_*` de los dos archivos se resuelve con
   `thyrox_config_value` de `src/lib/reach.sh` (proceso, luego el `.env` que
   nombra `THYROX_ENV_FILE` o el de la raíz, luego el default). Es el mecanismo
   canónico; no escribas otro lector del `.env`. Una función con nombre en
   `infrastructure.sh` que reciba clave y default, usada por los dos archivos.
   Los `readonly` y los `_INFRASTRUCTURE_*` que no son declarables se quedan.
   La contraseña y la CA también se resuelven así (viven en el `.env`).
2. Deriva de volumen. En `_infra_ensure_container`, un contenedor vivo cuyo
   volumen con nombre montado (`podman inspect --format` sobre `.Mounts`, el
   campo `.Name` de cada montaje) no es el que su declaración monta ya no es
   `kept`: se retira con `rm -f` (nunca un volumen) y se recrea; la línea de
   estado lo reporta `action=recreated`. Sólo cuenta para contenedores que
   declaran un volumen con nombre (postgres y ollama); el volumen declarado se
   obtiene de la declaración, no se duplica.

Pruebas: `bash tests/lib/test-infrastructure.sh` (casos `0735`) y
`bash tests/session/test-infrastructure-ensure.sh` (casos 26-28, y el resto
sigue en verde).
