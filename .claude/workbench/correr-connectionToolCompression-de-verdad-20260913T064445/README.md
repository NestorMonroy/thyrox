# correr-connectionToolCompression-de-verdad

## El encargo

<!-- verbatim, sin parafrasear -->
"pero, si los podemos ejecutar? porque no nos podemos conectar via socket como
lo hace PostgreSQL con kaupamex-api?" -- aclarado por AskUserQuestion: ejecutar
de verdad el cableado de `--connection`/`compressToolResults` de punta a
punta (T-9), no solo con tests unitarios que llaman `getConnectionContextOptions`
sobre un objeto a mano.

## La premisa, si se corrigio al primer comando

La premisa inicial era optimista: se asumio que `--connection` ya funcionaba en
el binario real porque sus tests unitarios (`connectionToolCompression.test.ts`,
`connectionContextOptions.test.ts`) estaban verdes. **Era falsa.** El primer
intento real de invocar `saveConnection`/`getConnection` desde un script
spawneado revento con dos errores en cadena, ninguno visible desde los tests
unitarios porque esos nunca pasan por la capa de persistencia:

1. `ConfigHostBindingsError: Config host bindings have not been installed`
2. tras arreglarlo: `ConfigAccessError: Config accessed before allowed`

## Las piezas

| archivo | que hace |
|---|---|
| `probes/live-run-compress.ts` | ejecución manual, primero contra `runLoop()` directo (para aislar `@thyrox/config`), luego contra el binario real (`src/entry/main.ts`) via `Bun.spawnSync`, con y sin `--connection` |
| `outputs/home/.claude/.claude.json` | la config REAL que `saveConnection` escribio en disco -- dos conexiones, `demo-compress` (con `providerSpecificData.compressToolResults:true`) y `demo-sin-compresion` (sin ella) |
| `outputs/ejecucion-real.log` | stdout de la ejecución contra `runLoop()` directo: sin conexion 580 caracteres, conexion apagada 580, conexion encendida 181 |
| `outputs/grabacion.json` | turnos grabados (tool_use Bash "git status" + end_turn "listo") para ejercitar el binario real |
| `outputs/ejecucion-binario-real.log` | la primera ejecución real contra `main.ts`, con `--prompt` disparando un `git status` REAL de este repo (no grabado) -- confirma que el binario arreglado ejecuta la herramienta de verdad, no sólo turnos grabados |
| `outputs/ejecucion-binario-real-sin-conexion-guardada.log` | captura el bug de JSDoc que cerraba el bloque `/** */` antes de tiempo (`-*/` dentro del docstring) -- `error: Expected ";" but found "import"` en `main.ts:42`, el error real que llevó al `grep -n '\*/'` que lo diagnosticó |
| `outputs/ejecucion-binario-real-con-conexion.log`, `outputs/ejecucion-binario-real-sin-connection-flag.log` | ambas `EXIT=0`, ejecuciones del binario ya arreglado |
| `outputs/ejecucion-ANULACION-sin-fix.log` | control de anulacion sobre el fix de produccion: `main.ts` revertido con `git stash`, misma invocacion, `EXIT=2` y `ConfigHostBindingsError` verbatim |
(un `outputs/home2/` de un intento anterior con la conexion en un HOME equivocado se borro -- no llegaba a contener la conexion, sólo cache de `bun`/`.harness` sin señal) |

## Los resultados

**El fix de produccion, en `src/entry/main.ts`:** dentro de `import.meta.main`
(no a nivel de modulo -- los tests de este arbol importan `runCli`/`runLoop`
directo y no deben activar un recurso global compartido), se agrego:

```ts
installConfigHostBindings({})   // @thyrox/config/host.js -- {} basta, cada
                                 // binding ausente cae a node:fs real
enableConfigs()                 // @thyrox/config -- flag independiente,
                                 // el primero no lo enciende
```

**Control de anulacion sobre el fix (produccion, no solo tests):** `git stash`
sobre `main.ts` (dejandolo sin las dos lineas), misma invocacion real contra
la conexion ya persistida en disco -> reaparece exactamente
`ConfigHostBindingsError: Config host bindings have not been installed`
(`outputs/ejecucion-ANULACION-sin-fix.log`). `git stash pop` + `diff` contra un
backup previo confirmaron restauracion byte a byte.

**La regresion automatizada** vive ahora en `bin.test.ts`, bloque
`--connection activa @thyrox/config de verdad y decide compressToolResults
(T-9)`: tres pruebas, spawneando el binario real con `Bun.spawnSync` y
`--output-style json`, leyendo `tool_end.output` del evento real (el mismo
campo que `ejecutar()` en `loop/index.ts` ya pasa por `compressToolResult`
cuando `context.compressToolResults` esta encendido).

Escribirla destapo un SEGUNDO hallazgo, esta vez en el propio test: la
primera version fallaba en la tercera prueba (conexion con
`compressToolResults:true` -> se esperaba el ruido recortado, y no lo estaba).
Causa: `bin.test.ts` corre bajo `bun test`, que fija `NODE_ENV=test` en su
propio proceso; al spawnear el binario con `env: {...process.env, HOME: home}`
ese `NODE_ENV=test` se hereda, y `getGlobalConfig()`/`saveGlobalConfig()`
(`config.ts:794,835`) **desvian a un objeto fijo en memoria bajo ese valor** --
documentado ahi mismo como la via de la FUENTE para probarse sin tocar disco.
El binario nunca llegaba a leer `outputs/home/.claude/.claude.json`: contestaba
con el stub vacio. Arreglo: `delete env.NODE_ENV` antes de spawnear, para que
el hijo se comporte como un usuario real (que nunca corre con `NODE_ENV=test`).

**Control de anulacion sobre el test mismo:** retirado el `delete env.NODE_ENV`
(comentado con `sed`), corren las 18 pruebas del archivo y cae **exactamente
1**: la tercera del bloque nuevo -- las otras 17, incluidas las dos hermanas del
mismo bloque, siguen en verde (no dependen de leer disco de verdad: la primera
no pasa `--connection`, la segunda pasa una conexion sin
`providerSpecificData.compressToolResults`, asi que el stub vacio y el archivo
real dan la misma respuesta para esas dos). Restaurado con `sed`, `diff` contra
un backup confirma cero cambios netos.

*Metrica:* contenido de `tool_end.output` en las tres ejecuciones (sin conexion,
conexion apagada, conexion encendida), leido del stream real de eventos JSON
del binario spawneado -- no de una llamada directa a `runLoop()`.
*Ciega a:* si `--connection` dirige el ENDPOINT/`auth` del transporte -- no lo
hace. `providerFor()` en `runLoop.ts` sigue resolviendo el `Provider` solo por
`--provider recorded|http`, sin mirar `connection.endpoint` en absoluto. El
campo `endpoint: "https://api.anthropic.com"` de la conexion de demo era
puramente decorativo en esta prueba -- nada en el camino cableado lo lee. Es un
gap real y separado, no tapado aqui: `AnthropicHttpProvider` YA acepta
`opts.baseUrl` (`anthropicHttp.ts:68`, con fallback a
`ANTHROPIC_BASE_URL`) -- lo que falta es que `providerFor()` se lo pase desde
`connection.endpoint`, y un servidor local (loopback, `127.0.0.1:<puerto>`)
contra el que apuntarlo en pruebas, en vez de contra `https://api.anthropic.com`
de verdad. Pedido explicito del ejecutor (2026-09-13, con
`OmniRoute/bin/cli/utils/serverHost.mjs` como precedente de la forma) --
registrado como trabajo separado, no absorbido en este fix.

**Verificacion final:**

```
$ bun test src/packages/cli/__tests__/bin.test.ts
 18 pass
 0 fail

$ cd src/packages/cli && bun test
 170 pass
 1 todo
 0 fail
Ran 171 tests across 18 files.
```

`bun run typecheck` en `cli` da UN error, en `../config/global/config.ts:758`
(`Parameter 'content' implicitly has an 'any' type`) -- pre-existente, no
tocado en este pase (`git status --short` sobre ese archivo: vacio antes y
despues de este banco).
