# wire-endpoint-y-mock-server-local

## El encargo

<!-- verbatim, sin parafrasear -->
"y vas a realizar la implementacion en TDD de Wire ConnectionRecord.endpoint
into providerFor() + build local loopback Anthropic-shaped mock server for
tests -- queremos ENV HOSTNAME=0.0.0.0" -- con
`OmniRoute/bin/cli/utils/serverHost.mjs`,
`OmniRoute/scripts/devin-bridge/verify-anthropic-isolation`,
`OmniRoute/scripts/dev/system-info.mjs` y
`OmniRoute/docs/ops/PROXY_GUIDE.md` como referencias.

## La premisa, si se corrigio al primer comando

Las cuatro referencias del ejecutor NO eran igual de relevantes -- medido
leyendolas enteras, no supuesto:

| Referencia | Relevancia medida |
|---|---|
| `serverHost.mjs` | **directa** -- el patron de host configurable + aviso de exposicion, portado casi verbatim |
| `verify-anthropic-isolation` | **parcial** -- el 90% es aislamiento docker/red para sandboxear un agente Devin (fuera de alcance); lo unico util es el patron de env vars real (`ANTHROPIC_BASE_URL=http://omniroute:20128`) para apuntar un cliente Claude a un gateway LOCAL, que ya confirma el mismo mecanismo que `AnthropicHttpProvider.opts.baseUrl` |
| `system-info.mjs` | **sin señal directa** -- es un generador de reporte de bug-report (versiones, docker, CLIs instalados); no tiene `HOSTNAME` ni nada de servidor/mock |
| `PROXY_GUIDE.md` (817 lineas) | **otro concepto** -- documenta el PROXY DE SALIDA de OmniRoute (route mis propias peticiones salientes a traves de un proxy HTTP/SOCKS5 de terceros, para bypass geografico), no un servidor mock local. No se leyo completo por no ser load-bearing para esta tarea |

Se lo digo al ejecutor en vez de forzar una relevancia que la lectura no dio.

**Medido antes de escribir una linea:** `AnthropicHttpProvider` YA acepta
`opts.baseUrl`/`opts.apiKey` (`anthropicHttp.ts:60,68`) -- el transporte no
necesitaba ningun cambio. Lo unico que faltaba era `providerFor()`
pasandoselos desde la conexion, y algo real contra que apuntarlo en pruebas.

## Las piezas

| archivo | que hace |
|---|---|
| `src/packages/provider/src/anthropicMockServer.ts` | `resolveMockServerHost`/`resolveMockServerExposureWarning` (porte fiel de `resolveServerHost`/`resolveExposureWarning`, variables de entorno renombradas -- `THYROX_MOCK_SERVER_HOST`, `THYROX_MOCK_SERVER_REQUIRE_API_KEY`) + `startAnthropicMockServer` (nuevo, `node:http`, sin dependencia nueva) |
| `src/packages/provider/__tests__/anthropicMockServer.test.ts` | 11 tests TDD: el resolver de host en sus 5 ramas, el aviso de exposicion, y el servidor real (responde, se personaliza, cierra el puerto) |
| `src/packages/cli/src/entry/runLoop.ts` | `connection` se resuelve ANTES de `providerFor()` (no despues, como en T-9); `providerFor(argv, connection)` pasa `baseUrl`/`apiKey` cuando `--provider http` |
| `src/packages/cli/__tests__/bin.test.ts` | nuevo bloque T-10: arranca el servidor mock, persiste una conexion con `endpoint`+`auth.key` apuntando a el, corre el binario real con `--provider http --connection <id>`, confirma que el servidor LOCAL (no `https://api.anthropic.com`) recibio la peticion |
| `probes/probe-endpoint-sync-vs-async.ts` | el guion que diagnostico el interbloqueo (ver abajo), en sus dos modos |
| `outputs/ejecucion-spawnSync-deadlock.log`, `outputs/ejecucion-spawn-async-exito.log` | la evidencia de los dos modos, capturada real |

## Los resultados

**El aviso `HOSTNAME=0.0.0.0` del encargo, honrado y acotado.** Portado
`resolveServerHost` verbatim: sin nada declarado, el default sigue siendo
`0.0.0.0` (`resolveMockServerHost({}, ...)` -> `'0.0.0.0'`), igual que la
fuente. La variable que lo override es `THYROX_MOCK_SERVER_HOST` (no
`HOSTNAME` a secas -- ese nombre sigue siendo, como en la fuente, el
respaldo LEGADO de win32 cuando difiere del nombre real de la maquina).
**Ningun test bindea de verdad a `0.0.0.0`**: los tests usan `127.0.0.1`
explicito -- exponer un puerto real en `0.0.0.0` durante una suite de
pruebas (CI, contenedores compartidos) es el riesgo exacto que
`resolveMockServerExposureWarning` (porte de `resolveExposureWarning`)
existe para señalar, y su prueba en `anthropicMockServer.test.ts` lo
confirma sin necesitar exponerse de verdad para probarlo.

**El interbloqueo real, encontrado escribiendo el test, no leyendo la
fuente.** La primera version del test T-10 usaba `Bun.spawnSync` --el mismo
patron que TODOS los tests anteriores de `bin.test.ts`-- y colgaba 5 s
hasta que `bun test` lo mataba, con el servidor mock reportando 0
peticiones recibidas. Causa: `Bun.spawnSync` bloquea SINCRONICAMENTE el
event loop del proceso PADRE hasta que el hijo termina; el servidor mock
corre en ESE MISMO hilo/proceso (vive en la memoria del test), asi que
mientras el padre esta bloqueado esperando al hijo, el servidor no puede
procesar la conexion entrante del hijo -- ninguno de los dos puede avanzar.
Reproducido aparte, con temporizador externo (`probe-endpoint-sync-vs-async.ts`):
modo `sync` nunca imprime `exitCode=` ni `duracion_ms=` -- el propio
`Bun.spawnSync` nunca retorna -- y muere a los 8 s por el `timeout` externo
(`exit_del_timeout=124`). Modo `async` (`Bun.spawn` + `await p.exited`, que
NO bloquea el event loop) termina en 181 ms, `exitCode=0`, el servidor
reporta exactamente 1 peticion recibida.

**Fix del test:** el bloque T-10 de `bin.test.ts` usa `Bun.spawn` (async) +
`await p.exited`, no `Bun.spawnSync` -- los demas bloques de `bin.test.ts`
pueden seguir usando `spawnSync` porque ninguno de ellos necesita que el
proceso padre siga respondiendo peticiones de red mientras el hijo corre.

**Control de anulacion sobre el fix de produccion:** revertido
`providerFor` a `new AnthropicHttpProvider()` sin argumentos (comentado con
`sed`, no editado a mano), corren las 20 pruebas de `bin.test.ts` y cae
**exactamente 1**: la nueva de T-10 (`exitCode` esperado 0, recibido 2 --
`AnthropicHttpProvider` revienta por falta de `ANTHROPIC_API_KEY`, porque
sin la conexion cableada no tiene de donde sacar la llave). Las otras 19,
incluida la hermana "sin --connection sigue fallando igual que antes",
sobreviven intactas. Restaurado con `cp` desde el backup, `diff` confirma
cero cambios netos.

**Bloqueador de commit real, no del cambio en si:** al escribir el test con
`const env = {...process.env, HOME: home}` y luego `delete env.ANTHROPIC_API_KEY`,
`tsc -p tsconfig.tests.json` fallo: TypeScript infiere el tipo de un
`{...process.env, X}` SIN el indice generico de `NodeJS.ProcessEnv` --sólo
conserva las propiedades NOMBRADAS (`NODE_ENV`, `TZ`)--, asi que borrar una
clave que sólo vive en el indice (`ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`)
no tipa. Arreglo: anotar `env: Record<string, string | undefined>`
explicitamente en esa declaracion. `check-harness-typecheck.sh`
(`src/verify/`) SOLO mide el paquete `cli` (hardcodeado, `PAQUETE_REL="src/packages/cli"`)
-- por eso los 61 errores PRE-EXISTENTES de `provider` (medidos aparte, en
`proxy.ts`, `runtimeHelpers.ts`, `openai/*`, y en `shell`/`storage` via
referencias de proyecto) no bloquean este commit: el gate estructuralmente
no los ve. El unico error real que SI aparecio en `anthropicMockServer.ts`
(`AddressInfo` sin `import type`) se corrigio -- ese si era mio.

*Metrica:* peticiones HTTP realmente recibidas por un servidor `node:http`
real en `127.0.0.1` con puerto efimero, mas el texto que vuelve por el
stream de eventos del binario real -- no una llamada directa a
`AnthropicHttpProvider`/`runLoop()` con un `fetchImpl` inyectado (que es
como el resto de la suite de `provider` ya probaba el contrato, sin tocar
un socket).
*Ciega a:* el comportamiento real contra `https://api.anthropic.com` --
este contenedor no tiene credencial (401 medido en pases anteriores) y no
se puede cerrar esa brecha aqui; y a OAuth (`auth.type==='oauth'`), que
`providerFor()` sigue sin alimentar en `apiKey` -- declarado en su
docstring, no una omision silenciosa.

## Suite completa (cierre de bloque)

Lanzada en segundo plano (`bg.sh start suite-full-t10 -- bash tests/run.sh`,
`.claude/jobs/suite-full-t10-20260913T075149/`), por `alcance-de-la-suite.md`:
se cierra el bloque de T-10 con `runLoop.ts`/`anthropicMockServer.ts` tocando
dos paquetes. Resultado real:

```
TypeScript: 549 archivo(s), en verde
Python: 123 suite(s), 18 en rojo
shell: 82 suite(s), 22 en rojo, 0 sin medir
FALLA: 2 lengua(s) en rojo
```

**El rojo es preexistente y ajeno a este cambio.** Las 40 suites en rojo son
Python (`tests/verify/`, `tests/agents/`) y shell (`tests/session/`,
`tests/corpus/`, etc.) -- ninguna vive en `src/packages/cli` ni
`src/packages/provider`, que es donde este pase escribio. La mitad
TypeScript -- la unica que este cambio podia haber roto -- esta **entera en
verde**, 549 archivos. Ese rojo es del Task #5 (`Workbench: diagnosticar y
arreglar todos los tests en RED de thyrox`, `in_progress`, sin tocar aqui).

*Metrica:* el conteo por lengua que `tests/run.sh` publica al correr, no
transcrito de memoria.
*Ciega a:* si alguna de las 40 suites rojas depende TRANSITIVAMENTE de
`@thyrox/provider`/`@thyrox/cli` sin que su nombre lo delate -- no se
audito symbol por symbol; la evidencia es que la mitad TypeScript, que SI
mide esa dependencia por compilacion, esta limpia.
