Implementas en thyrox (bash), en TDD, un instalador opt-in de Podman en `src/lib/toolchain.sh`,
con la misma forma que `thyrox_toolchain_require_redis` (léelo antes de escribir). El `Item:` de
abajo nombra los archivos que te pertenecen; no toques ningún otro. Edita con `sed`, `gawk` o
`bash bin/replace_literal`; no reescribas archivos enteros. Nunca instales nada de verdad: las
pruebas usan dobles.

Estado medido en este contenedor (2026-09-29): `podman` no está; apt ofrece `podman 4.9.3`;
hay `runc 1.3.4`; cgroups v1; el cliente `docker` existe sin daemon.

Lo que se pide:
1. Mitad roja primero, en `tests/lib/test-toolchain-podman.sh` (modelo:
   `tests/lib/test-toolchain-redis.sh`). Casos con un `podman` falso en un PATH controlado:
   a. podman presente y `podman info` responde → exit 0 y `THYROX_TOOLCHAIN_PODMAN_BIN` exportada;
   b. ausente y sin opt-in → exit 2, mensaje que nombra `THYROX_INSTALL_PODMAN=1`, sin conteo;
   c. ausente con opt-in y un instalador que instala un podman sano → exit 0;
   d. ausente con opt-in y un instalador que MIENTE (sale 0 sin instalar) → exit 2;
   e. presente pero `podman info` falla (runtime u almacenamiento rotos) → exit 2: `command -v`
      y `--version` no bastan.
2. `thyrox_toolchain_require_podman` en `src/lib/toolchain.sh`, tras el bloque de Redis:
   - `THYROX_TOOLCHAIN_PODMAN_INSTALL_CMD` con default `sudo apt-get install -y podman`;
   - `THYROX_TOOLCHAIN_PODMAN_BIN` con default `podman`;
   - opt-in `THYROX_INSTALL_PODMAN=1`;
   - el éxito se RE-COMPRUEBA con `podman info` (sale 0), no con el exit de apt ni con `--version`:
     `info` inicializa el runtime OCI y el almacenamiento;
   - `export -f`, y su cabecera `# @description` en español con el porqué del re-chequeo.
   No ejecutes un contenedor en el instalador: exigiría descargar una imagen.
3. Las tres variables nuevas van a `.env.example` junto a las de Redis, vacías, con el formato
   de sus vecinas; el gate de variables `THYROX_*` exige además que tengan prueba, y la tienen.
4. Control de anulación: sustituye el re-chequeo por `command -v` solo y confirma que caen
   exactamente los casos d y e; publica el conteo antes y después. Restaura.
5. Comentarios en español sin coloquialismos; identificadores en inglés.

Cierre del ítem (obligatorio):
- No lances trabajos en segundo plano ni termines el turno esperando una notificación.
- Tu mensaje final incluye la salida roja inicial, el conteo verde final y el control de
  anulación con sus conteos.

Criterio de cierre: `bash tests/lib/test-toolchain-podman.sh` y `bash tests/lib/test-toolchain-redis.sh`
en verde.
