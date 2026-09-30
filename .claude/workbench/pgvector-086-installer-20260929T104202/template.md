Llevas el instalador de pgvector del toolchain a una versión fijada, 0.8.6, compilada
desde el fuente contra el PostgreSQL de Ubuntu. Decisión del ejecutor (2026-09-29):
«vamos a usar 0.8.6». El `Item:` de abajo nombra los archivos que te pertenecen; no
toques ningún otro. Edita con `sed`, `gawk` o `bash bin/replace_literal`; corre Python y
las pruebas con `uv run --python 3.12 python` cuando haga falta.

Lo medido (banco `.claude/workbench/pgvector-060-envelope-*` y `pgvector-d2b-inputs-*`):
- Instalado hoy: paquete Ubuntu `postgresql-16-pgvector 0.6.0-1`, servidor 16.13 Ubuntu.
- PGDG queda descartado: su pgvector declara `Breaks: postgresql-16-jit-llvm (< 19)` y
  arrastra el servidor a PGDG (H-THYROX-256). La vía es compilar contra Ubuntu.
- Compilar exige `postgresql-server-dev-<mayor>` de Ubuntu; el servidor se compiló
  `--with-llvm` con `CLANG=/usr/bin/clang-17`, y ese paquete trae `clang-17` y `llvm-17-dev`.
- `apt-get -s install postgresql-server-dev-16` hoy arrastra además `postgresql-16`,
  `postgresql-client-16` y `libpq5` de 16.13 a 16.15 (actualización menor de Ubuntu, no PGDG).
- El fuente: `https://github.com/pgvector/pgvector.git`, etiqueta `v0.8.6`.
  `vector.control` declara la versión en `default_version = '<x.y.z>'`.

Contrato nuevo de `thyrox_toolchain_require_pgvector` (mismo patrón que sus hermanos):
1. Versión fijada por `THYROX_PGVECTOR_VERSION` (defecto `0.8.6`). Que exista
   `vector.control` ya NO basta: se exige que su `default_version` sea la fijada.
   Con otra versión presente y sin opt-in, rehúsa con exit 2 nombrando la instalada y la
   pedida, sin emitir conteo.
2. Instalar sigue siendo opt-in (`THYROX_INSTALL_PGVECTOR=1`). El comando por defecto
   (`thyrox_toolchain_pgvector_install_cmd`) instala `postgresql-server-dev-<mayor>`,
   clona la etiqueta `v<versión>` de `THYROX_PGVECTOR_SOURCE_URL` (defecto el repositorio
   de arriba) en un directorio temporal, y corre `make` y `make install` con el `pg_config`
   declarado. `THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD` sigue sustituyéndolo entero.
3. El éxito se RE-COMPRUEBA leyendo `default_version` de `vector.control`, nunca el exit
   del instalador. Un instalador que sale 0 sin dejar la versión pedida rehúsa con exit 2.
4. El docstring declara el efecto colateral medido (la actualización menor del servidor
   que arrastra el paquete de desarrollo) y que la función no ejecuta
   `ALTER EXTENSION vector UPDATE` en ninguna base.

Pruebas en `tests/lib/test-toolchain-pgvector.sh`, con `pg_config` y el instalador falsos
(nunca apt, red ni el servidor real):
- roja primero: `vector.control` con `0.6.0` y versión pedida `0.8.6`, sin opt-in → exit 2
  que nombra las dos versiones (hoy sale 0);
- con opt-in e instalador falso que escribe `0.8.6` → exit 0;
- con opt-in e instalador que miente (sale 0 sin escribir) → exit 2;
- con la versión pedida ya presente → exit 0 sin invocar el instalador;
- `THYROX_PGVECTOR_VERSION` y `THYROX_PGVECTOR_SOURCE_URL` se declaran en `.env.example`
  y cada una tiene prueba (lo exige el gate `checkEnvPrefix`).
Control de anulación: si la comparación de versión se retira (vuelve a bastar el archivo),
caen exactamente las aserciones que dependen de ella; publica los conteos y restaura.

Cierre del ítem (obligatorio):
- Todo en primer plano. No lances trabajos en segundo plano, no uses `git stash` ni
  termines esperando una notificación.
- No ejecutes el instalador real ni `apt-get install`: sólo pruebas con dobles.
- Tu mensaje final incluye la roja inicial, el verde final de
  `bash tests/lib/test-toolchain-pgvector.sh` y el control de anulación con sus conteos.
