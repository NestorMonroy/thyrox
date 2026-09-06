/**
 * Análisis de argv temprano — reexporta el porte verbatim de
 * `@thyrox/app-host` en vez de reimplementarlo (TASK-DOCS-0205).
 *
 * Por qué un reexport y no una copia
 * -----------------------------------
 * La referencia MISMA no reimplementa esto dentro de su paquete `cli`:
 * `claude-code-nestor-monroy-tools: packages/cli/src/entry/
 * mode-dispatch.ts` importa `eagerParseCliFlag` de
 * `@claude-code-how-works/app-host/cliArgs.js` (medido: `grep -rl
 * eagerParseCliFlag packages/` en la referencia da `packages/app-host/
 * src/cliArgs.ts` — la definición — y `packages/cli/src/entry/
 * mode-dispatch.ts` — el único consumidor fuera de app-host). Ese es el
 * grafo de dependencia real que la referencia declara, y thyrox ya tiene
 * el porte: `@thyrox/app-host: src/cliArgs.ts` es un porte verbatim
 * (capa 0, "sin cita a paquete hermano", fechado antes de esta tarea).
 *
 * Reimplementarlo aquí habría sido la TERCERA copia divergente del mismo
 * mecanismo. Las otras dos ya existen, medidas y NO tocadas en este pase
 * (fuera de las rutas de esta tarea):
 *
 *   harness/bin/harness.ts:  function arg(argv, nombre) { ... }
 *     — busca `--${nombre}` con `indexOf` + `argv[i+1]`. NO soporta la
 *     forma `--flag=valor`.
 *   binary/bin/binary.ts:    function opcion(argv, nombre, defecto) { ... }
 *     — misma idea, firma distinta (recibe el nombre YA con `--`, y con
 *     valor por defecto en vez de `undefined`). Tampoco soporta `--flag=valor`.
 *
 * `eagerParseCliFlag` sí soporta las dos formas (ver su docstring en
 * `@thyrox/app-host: src/cliArgs.ts`) — es la más completa de las tres, y
 * la que menos se usa hoy. El análisis de esta tarea deja esa unificación
 * como decisión pendiente del ejecutor, porque exige tocar
 * `harness/bin/harness.ts` y `binary/bin/binary.ts`, ambos fuera de las
 * rutas de este agente.
 *
 * Puente temporal: import relativo, no por nombre de paquete
 * -------------------------------------------------------------
 * Medido en esta misma tarea: `@thyrox/cli` no resuelve por NOMBRE desde
 * ningún sitio hasta que `src/packages/bun.lock` declare el workspace —
 * `bun install --dry-run` en `src/packages/` lo confirma como aditivo (sin
 * red, sin alterar ninguna entrada existente), pero ESE archivo no está
 * entre las rutas asignadas a este agente en esta tanda. Por eso el import
 * de abajo usa la ruta relativa hacia `app-host/src/cliArgs.ts` en vez de
 * `@thyrox/app-host/cliArgs.js`: funciona hoy sin tocar el lockfile, y el
 * `package.json` de este paquete SÍ declara la dependencia real
 * (`@thyrox/app-host: workspace:*`) para cuando el puente se retire.
 * `// TODO(bun.lock)` marca el cambio de una línea que hace falta entonces.
 */
// TODO(bun.lock): cuando `src/packages/bun.lock` registre a `cli`, cambiar
// por `export { eagerParseCliFlag, extractArgsAfterDoubleDash } from '@thyrox/app-host/cliArgs.js'`.
export { eagerParseCliFlag, extractArgsAfterDoubleDash } from '../../app-host/src/cliArgs.ts'
