# #129 — barrido de errores antes del Empaquetado

`sweep.sh` corre los dos gates del árbol:

- `bin/check_lint_zero`: shellcheck 0 hallazgos en 216 archivos; ruff y
  pyright, 0 hallazgos en 594 archivos.
- `bin/check_package_typecheck --no-rebuild`: 0 errores propios en 50 de 50
  paquetes.

La salida completa está en `static-sweep.txt`. La suite entera
(`tests/run.sh`) corre aparte, en `.claude/jobs/suite-129-*`.

*Métrica:* hallazgos de cada herramienta sobre los archivos que su gate
recorre.
*Ciega a:* errores en tiempo de ejecución, que sólo la suite ve, y a los
archivos que cada gate excluye por su alcance.

## La suite entera: 20 archivos rojos, y qué era cada uno

`full-suite.txt` es la salida de `tests/run.sh` (930 s). `red-files.txt` lista
los rojos; `rerun-red.sh` los relanza uno por uno.

- **Carga, no defecto** (pasan solos): `cli/bin`, `impactCli`,
  `loopStreaming`, `rules/markdown` y `test_gpu_monitor`. Agotaron su plazo de
  5 s con la suite entera corriendo.
- **Arreglados en este tramo:**
  - `envUtils.test.ts` importaba `getClaudeConfigHomeDir`, el nombre anterior
    al renombre, y esperaba `.claude` por defecto. La prueba ahora mide
    `resolveConfigHomeDir`: `.thyrox` por defecto, `.claude` sólo si es el que
    existe.
  - `renameEnvPrefix`: `CLAUDE_CODE_TARGET` nombra el destino MITM del cliente
    ajeno y entra en `FOREIGN_CONSTANTS`.
  - `mitmServer` modo root-CA: ver H-THYROX-236. La CA que una ejecución dejó
    en `/usr/local/share/ca-certificates` (copia en `leaked-thyrox-mitm.crt`)
    pasó al paquete del entorno al que apunta `SSL_CERT_FILE`, y el TLS de
    Bun elige al emisor por nombre. Sondas en `probes/`. La prueba verifica
    ahora en un hijo sin el almacén del anfitrión. Anulación: con el servidor
    usando una CA nueva en vez de la guardada, cae exactamente esa prueba.
    `mitm-suite-trust-watch.sh` corrió la suite de `mitm` vigilando el
    almacén del sistema: no instaló nada.
- **Segundo tramo:**
  - `exports`: faltaban en el mapa de la raíz los índices de
    `mitm/src/detection`, `mitm/src/targets` y `transparent-napi/src`.
  - `dependencies`: el escáner leía como import el `import("${DEF}")` de una
    plantilla en las pruebas de `binary`. Un import no admite interpolación;
    control rojo en `red-template-specifier.txt`.
  - `sibling_exports`: el `dist/` de `provider` no tenía las declaraciones de
    sus exportaciones nuevas; `bin/emit_declarations provider` las emitió y
    añadió sus rutas a `tsconfig.build.json`.
  - `test_pre_commit_hook`: el fixture no seguía el paso de los gates que el
    hook ganó. Ahora copia también los `.ts` hermanos que cada gate nombra,
    congela la línea base de los gates de árbol entero tras el `add`, crea las
    raíces de `check_md_relative_links`, declara una línea base de idioma
    vacía y enlaza `node_modules`. Anulación: sin el recorrido de hermanos,
    los 12 casos caen.
- **Pendientes:** `test_env_contract_keys`, `test_path_arithmetic`,
  `test_runner`, los dos githooks, `check-skill-artifacts`, `script-naming` y
  `suite-discrimina`.
