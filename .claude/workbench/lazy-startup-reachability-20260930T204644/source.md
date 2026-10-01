# Fuente de verdad del pool P1 + P6

Gobierna: `kaupamex-docs: source/thyrox/adr/adr-010-empaquetado-instalacion-infraestructura-y-servicios.rst`
v1.3.0 (contratos P1–P7 y la matriz). Antes de escribir, lee
`/home/user/thyrox/.claude/workbench/lazy-startup-reachability-20260930T204644/outputs/p0-baseline.md`:
es la clasificación de lo que YA existe. No reimplementes nada que ahí figure
como EXISTS_AND_REUSE; en lo PARTIAL_EXTEND añade sólo el contrato que falta.

## P1 — TASK-THYROX-0360: arrancar no activa dependencias operacionales

Estado medido (P0): PARTIAL_EXTEND. La conducta ya es la correcta —con
`THYROX_REDIS_URL`, `THYROX_OBSERVABILITY_DATABASE_URL`,
`THYROX_SEMANTIC_SEARCH_DATABASE_URL` y `THYROX_OPENAI_COMPAT_BASE_URL`
apuntando a un listener TCP que cuenta conexiones, y
`THYROX_TOOLCHAIN_PODMAN_BIN` a un binario centinela, `bin/cli --version`,
`--help` y `-p --help` dan 0 conexiones y 0 llamadas (sonda:
`probes/baseline_activation.sh`)— pero NINGUNA prueba lo fija. Falta:

1. Una prueba de contrato (`bun test`, en `src/packages/cli/__tests__/`) que
   ejecute el entrypoint real (`src/packages/cli/src/entry/cli.tsx`, con
   `--feature=UDS_INBOX` como `bin/cli`) en esos tres comandos más
   `providers --help` o el modo ligero que `lightModes.ts` declare, con las
   cinco dependencias en centinela, y afirme: 0 conexiones al listener, 0
   invocaciones del Podman centinela, código de salida el esperado.
2. El control de anulación: la prueba tiene que poder fallar. Construye el
   caso con una inicialización ansiosa inyectada (por ejemplo, un módulo de
   prueba cargado con `--preload` que abra una conexión a la URL de Redis al
   evaluarse) y afirma que ESE caso sí cuenta ≥ 1 conexión. Sin este caso la
   prueba no discrimina.
3. Dos ramas que P0 dejó para P1: la vía rápida de `--version` (`cli.tsx:89`)
   no debe cargar más que el profiler — mídelo y fíjalo; y la versión fuera
   del árbol ya funciona desde el fuente (`env -i PATH=… bash bin/cli
   --version` desde `/` → `0.1.0 (thyrox)`): fíjalo en la prueba. La versión
   dentro de un ejecutable compilado es P5 (no existe construcción): NO la
   construyas aquí; di que queda para P5.

No crees un gestor de servicios ni un inicializador nuevo. Si la prueba
destapa una activación ansiosa real, arréglala en el módulo que la hace.

## P6 — TASK-THYROX-0363, TASK-THYROX-0680, TASK-THYROX-0681: alcance por subcomando y matriz

Estado medido (P0): MISSING. No existe herramienta de grafo de imports
(`bin/closure_graph` es de tareas, `bin/reach` de rutas). Existen y se
reutilizan: la lista de entrypoints de `src/session/generate_bin.py`
(`discover_entrypoints`, `discover_typescript_entrypoints`) y las ramas de
`src/packages/cli/src/entry/cli.tsx` (cada rama importa dinámicamente lo suyo:
`:177` `@thyrox/daemon/workerRegistry.js`, `:246` `@thyrox/daemon/main.js`,
`:289` `../bg.js`, …).

Construye en `src/packaging/` (TypeScript, se ejecuta con bun):

1. `reachability.ts`: con la API del compilador de `typescript` (ya es
   dependencia del árbol; el gate de identificadores la usa) extrae imports
   estáticos, dinámicos (`import('…')` con literal) y `export … from`,
   resuelve los especificadores `@thyrox/<pkg>/…` por el `package.json` de
   cada paquete (`exports`) y los relativos por archivo, y calcula el cierre
   transitivo desde un punto de entrada. Un especificador que no resuelve se
   REPORTA (no se descarta en silencio).
2. Puntos de entrada: cada rama de `cli.tsx` (su condición, en texto, y sus
   imports dinámicos) y los wrappers TypeScript que enumera `generate_bin.py`.
3. Abridores directos de dependencia operacional (tabla declarada en el
   código, con su tipo): `src/packages/store/sql.ts` (`openByUrl`, base de
   datos), `src/packages/shared-state/redis.ts` / `factory.ts` (almacén
   efímero), `src/packages/semantic-search/store.ts` (base de datos +
   pgvector), `src/packages/provider/src/proxy/openaiCompat/declaration.ts`
   (upstream de modelo), `src/packages/daemon/src/podman/podmanWorkerManager.ts`
   (runtime de ejecución). Medido antes: `THYROX_TEST_POSTGRES_URL` sólo vive
   en `store/testing/` — el alcance de `testing/` es de pruebas, no de
   producción.
4. La matriz versionada `src/packaging/reachability-matrix.tsv` con columnas
   `entrypoint	paquetes_alcanzables	dependencia	relacion	condicion	rol	requisito_distribucion`,
   `relacion` = `directa` (el entrypoint abre) o `transitiva` (a través de
   otro módulo). «No detectada» nunca se escribe como «no existe».
5. Un gate `--check` que regenera y compara con la matriz versionada (exit 1
   si difiere, exit 2 si no pudo medir — sin emitir cifra), y el wrapper que
   `generate_bin.py` genere para él si su convención lo cubre.
6. Pruebas (`src/packaging/__tests__/reachability.test.ts`): un árbol
   sintético con imports estáticos, dinámicos y reexportes; el especificador
   que no resuelve se reporta; `--version` de cli.tsx no alcanza ningún
   abridor y la rama del worker del daemon sí alcanza Podman; y el control de
   anulación de cada rama del extractor (retirar los imports dinámicos debe
   hacer caer exactamente la aserción de la rama del daemon).
7. Pruebas de conducta con las dependencias opcionales AUSENTES: sin
   `THYROX_REDIS_URL`, sin URLs de base de datos, sin Podman en `PATH`, los
   comandos que la matriz declara sin dependencia salen con su código normal.
