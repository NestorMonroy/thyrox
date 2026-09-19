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
 * El puente relativo se RETIRO — su precondicion estaba rancia
 * -------------------------------------------------------------
 * Aqui vivia un import relativo a `../../app-host/src/cliArgs.ts`, con su
 * razon declarada: el enlace de workspace no existia todavia y el lockfile
 * quedaba fuera del alcance de aquel agente. Esa razon era cierta cuando se
 * escribio y dejo de serlo sin que nadie tocara este archivo — medido por
 * conducta, no releyendo el comentario: `cli/node_modules/@thyrox/app-host`
 * existe y apunta a `src/packages/app-host`.
 *
 * Retirarlo no es cosmetico. Un import relativo que entra a la FUENTE de un
 * hermano rodea su `exports` —que declara `./cliArgs.js` explicitamente— y
 * arrastra ese archivo al programa de `cli` por fuera de su `rootDir`. Ahi
 * la declaracion emitida aterriza junto a la fuente ajena en vez de en
 * `dist/`, porque la ruta de salida es `outDir + relativa-a-rootDir`.
 */
export { eagerParseCliFlag, extractArgsAfterDoubleDash } from '@thyrox/app-host/cliArgs.js'
