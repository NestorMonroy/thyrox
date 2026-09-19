# El porte completo de sessionStorage typechequea mejor y NO CARGA

Fecha: 2026-09-19T03:45:45
Sujeto: `src/packages/storage/src/sessionStorage.ts` tras el porte por fusion
(`df481559`).
Cita durable: TASK-DOCS-0475.

## La pregunta

El porte bajo TypeScript de 6233 a 6157 errores (-76) y llevo los TS2305 de los
consumidores contra `sessionStorage.js` de 134 a 0. Esa medicion es correcta y
**no mide si el modulo carga**.

## La medicion que faltaba: conducta, no typecheck

Subconjunto derivado con el comando que `alcance-de-la-suite.md` prescribe:

```bash
grep -rlE "sessionStorage" src/packages/storage/src/__tests__ tests/
```

Cinco archivos. Corridos contra las dos versiones del mismo arbol:

| Version | pass | fail | error | tests corridos |
|---|---|---|---|---|
| `HEAD~1` (pre-porte) | 136 | 2 | 0 | **138** |
| `df481559` (porte completo) | 107 | 3 | 1 | **110** |

**29 tests dejaron de correr.** No fallan: no se recogen. El modulo lanza al
importarse, asi que `sessionStorageHelpers.test.ts` ni siquiera colecta.

Los **2 fail son pre-existentes** y estan en las dos mitades: son los de
`tests/smoke/resume-smoke.test.ts`, por `@thyrox/app-host/runtime/bootstrap.js`.
No los introdujo el porte.

## La causa: cinco imports que no resuelven

El porte trajo 27 imports externos nuevos. Cinco no resuelven desde el paquete:

| Specifier | Por que |
|---|---|
| `lodash-es/memoize.js` | **el que lanza**: no esta instalado en NINGUN `node_modules` del arbol |
| `@thyrox/command-runtime/runtime` | subpath no declarado en su `exports` |
| `@thyrox/command-runtime/xml.js` | idem |
| `@thyrox/agent/file-history` | idem |
| `bun:bundle` | builtin de Bun; divergencia ya declarada en el docstring |

## Lo que el instrumento de typecheck no podia ver

`tsc --noEmit` reporta TS2307 por specifier no resuelto, y el arbol ya tenia
**787**. El agregado bajo de 6233 a 6157, asi que cinco TS2307 nuevos quedaron
dentro del ruido: la cifra mejoro mientras el modulo dejaba de cargar.

*Metrica:* conteo agregado de diagnosticos de `tsc --noEmit` sobre el workspace.
*Ciega a:* si un modulo concreto **carga en tiempo de ejecucion**. Un TS2307 es
un diagnostico entre miles; un import que no resuelve es un fallo total del
modulo. El agregado no distingue los dos, y la conclusion «el porte mejoro» se
emitio sobre el eje equivocado.

## El control que SI discrimina

No es el typecheck: es correr el subconjunto derivado contra **las dos
versiones**. Sin la comparacion, 107 pass se lee como verde.

## `lodash-es` NO es culpa del porte — es fiel, y el arbol ya estaba roto

Medido: **8 paquetes declaran `lodash-es`** en su `package.json` y **cero**
lo tienen instalado (solo vive en `node_modules/.old_modules-*`).
`src/packages/repl/src/projectOnboardingState.ts` ya llevaba **el mismo
import** y falla igual:

```
repl FALLA: Cannot find module 'lodash-es/memoize.js'
```

Control de la resolucion: **desde el scratchpad SI resuelve** —
`/root/.bun/install/cache/lodash-es@4.18.1@@@1/memoize.js` — porque ahi `bunx`
cae a su cache global. Dentro del workspace no hay cache al que caer. O sea:
el import es el idioma del arbol; lo que falta es la instalacion, que es la
tarea **TASK-THYROX-0098** ya abierta («izar las dependencias a la raiz del
workspace»).

**Pero la regresion es real igual**: esos 29 tests pasaban antes del porte y
ahora no corren. Que la causa sea heredada no la convierte en aceptable.

---

## Segunda medicion (2026-09-19T03:51:41): tres de los cinco cerrados, y el cuarto es deuda ajena

`Bun.resolveSync` da la lista de UN nivel; el modulo aborta en el **primero**
que no resuelve. El instrumento de iteracion es el import real:

```bash
timeout 60 bunx bun -e "import('./src/packages/storage/src/sessionStorage.ts').then(()=>console.log('CARGA')).catch(e=>console.log('FALLA:',e.message))"
```

| Bloqueo | Desenlace |
|---|---|
| `@thyrox/agent/file-history` | **specifier equivocado del porte**: `FileHistorySnapshot` se exporta de `agent/fileHistory.ts`. Repuntado a `@thyrox/agent/fileHistory.js` |
| `@thyrox/command-runtime/runtime` | **no era el subpath**: su `exports` tiene catch-all `./*` -> `./src/*.ts` y `runtime.ts` existe. Faltaba el **enlace de workspace** en `storage/node_modules/@thyrox/`, hecho a mano como sus nueve hermanos |
| `lodash-es/memoize.js` | declarado en `storage/package.json` (`^4.18.1`, el rango de sus 8 hermanos) + `bun install`. Aterrizo en `node_modules/.bun/lodash-es@4.18.1` |
| `bun:bundle` | **la divergencia declarada era CORRECTA**, medido por conducta: `import('bun:bundle')` da `Cannot find package 'bundle'` en este Bun |

## Lo que queda NO es del porte: es deuda de `app-host`, pre-existente

Tras los tres arreglos el modulo aborta en `chalk`, desde
`app-host/src/bootstrap/gracefulShutdown.ts`. Medido por conducta:

```
import('./src/packages/app-host/src/bootstrap/gracefulShutdown.ts')
  -> FALLA: Cannot find package 'chalk'
```

**Ese modulo no cargaba ya antes del porte**, y **ocho paquetes lo importaban**
en `HEAD~1` (cli x5, bridge, @ant/computer-use-mcp). El porte no creo la deuda:
la hizo alcanzable desde storage.

### El cierre transitivo, medido con un recorrido de imports

337 archivos recorridos desde `sessionStorage.ts`, **15 specifiers rotos**:

| Specifier | Lo pide |
|---|---|
| `chalk`, `signal-exit`, `lodash-es/memoize.js` | `app-host/bootstrap/gracefulShutdown` |
| `@opentelemetry/{api,api-logs,sdk-logs,sdk-metrics,sdk-trace-base}` | `app-host/bootstrap/state` |
| `type-fest`, `semver`, `code-excerpt`, `stack-utils` | `@ant/ink` |
| `@claude-code-how-works/local-observability` | `@ant/ink` — **rezago de TASK-THYROX-0169**, el renombre de alcance que no alcanzo a `@ant/` |
| `bun:bundle` | divergencia declarada |

**`app-host` declara 21 hermanos de workspace y UN externo (`react`)**, e
importa ocho que no declara. Es TASK-THYROX-0099 un paquete mas alla.

*Metrica:* recorrido del grafo de imports estaticos desde `sessionStorage.ts`,
resolviendo cada specifier con `Bun.resolveSync` desde el directorio del
archivo que lo pide; no sigue lo que no resuelve.
*Ciega a:* el import dinamico (`await import(x)` con `x` variable), el
`require` y el specifier compuesto en tiempo de ejecucion — el recorrido es
lexico sobre la forma `from '...'`.

Y una cuarta, que hace de los **15 una COTA SUPERIOR y no la lista de
bloqueos**: el recorrido no separa `import type` de `import`. Bun **borra** el
`import type` al transpilar, asi que un specifier que solo viaja como tipo no
impide que el modulo cargue. El instrumento que decide un bloqueo real es el
`import()` de verdad, que aborta en el PRIMERO que no resuelve y lo nombra; el
recorrido sirve para acotar el universo, no para cerrar el veredicto.

---

## Tercera medicion (2026-09-19T04:01:59): la cadena era de OCHO eslabones, no de uno

El instrumento de iteracion es el import real. Cada ronda cuesta ~2 s y nombra
**un** bloqueo: el primero que no resuelve. Ocho rondas, ocho desenlaces:

| # | Bloqueo | Clase | Desenlace |
|---|---|---|---|
| 1 | `lodash-es/memoize.js` | manifiesto | declarado en `storage/package.json` + install |
| 2 | `chalk` (app-host) | manifiesto **ajeno** | ocho externos declarados en `app-host/package.json` — **TASK-THYROX-0208** |
| 3 | `semver` (@ant/ink) | manifiesto **ajeno** | cuatro externos declarados en `@ant/ink/package.json` |
| 4 | `@claude-code-how-works/local-observability` | **alcance** | 9 imports en 6 archivos repuntados — **TASK-THYROX-0209** |
| 5 | `getInvokedBinaryName` | **barril incompleto** | `config/index.ts` no pasaba `global/constants.ts`, con 3 consumidores ya importandolo |
| 6 | `sortLogs` | **porte parcial** | `agent/logsTypes.ts` 2 de 26 -> **26 de 26** |
| 7 | `LITE_READ_BUF_SIZE` | **porte parcial** | `storage/sessionStoragePortable.ts` 7 de 18 -> **18 de 18** |
| 8 | `isCompactBoundaryMessage` | **porte parcial** | `agent/messages.ts` **40 de 106**, 808 de 5690 lineas — ABIERTO |

Mas cinco modulos de storage fusionados en el mismo pase por ser subconjunto
estricto: `projectPurge` 7->9, `editor` 1->3, `pdfUtils` 3->4, `path` 4->6,
`glob` 1->2.

### Los dos bloqueos que `logsTypes` declaraba eran FALSOS

Su docstring decia que `TranscriptMessage`/`Entry`/`LogOption` arrastran
`ContentReplacementRecord` desde «un paquete hermano que este arbol no tiene»,
y que `FileHistorySnapshotMessage` «tampoco tiene consumidor». Medido:
`storage/src/toolResultStorage.ts` existe y exporta el simbolo (6 hits), y
`agent/fileHistory.ts` exporta `FileHistorySnapshot` — cuyo consumidor es
justo `sessionStorage.ts`, que aborta sin el. Lo que la frase describia era el
**alcance viejo**, no la ausencia del paquete.

Es la **tercera** vez en este pase que un bloqueo declarado resulta falso al
medirlo: primero el de `sessionStorage.ts`, luego los dos de `logsTypes.ts`.
Un bloqueo escrito una vez y nunca re-medido envejece hacia la falsedad
mientras el arbol crece a su alrededor.

## El censo que lo mide, y su propio defecto

```bash
bash censo-porte.sh src/packages/agent /home/user/claude-code-nestor-monroy-tools/packages/agent
```

| Paquete | parciales | de | exports ausentes |
|---|---|---|---|
| `agent` | **20** | 86 modulos con contraparte | **253** |
| `storage` | **2** | 48 | — |

**La primera version del censo publico 3 parciales en agent, no 20.** Llevaba
`set -euo pipefail`, y un `grep` sin coincidencias sale **1**: el bucle
abortaba en el primer modulo sin exports y la salida truncada se leia como
censo completo. Es el defecto que el tablero ya tiene abierto como #148
(«rechazar `grep -q` sobre variable bajo pipefail»), cometido aqui con el
censo como sujeto.

*Metrica:* exports declarados con `^export <kw>? <nombre>` en cada modulo
nuestro contra su homonimo en la fuente, por nombre.
*Ciega a:* el **re-export** (`export { a, b } from '...'`), que no declara
nombre propio en esa forma — asi que un modulo cuya superficie sea toda
re-exportada aparece con 0 exports. Y ciega al cuerpo: dos modulos con los
mismos nombres pueden divergir entero.
