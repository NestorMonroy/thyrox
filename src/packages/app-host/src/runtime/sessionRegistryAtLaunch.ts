/**
 * El alta de la sesión en el registro, cableada de verdad: compone
 * `registerAtLaunch` (2.1.283, `chunk-bdv29443.js`) con las piezas que ya
 * estaban portadas —`startSessionRegistration`/`processRegistrationDeps`
 * (`@thyrox/local-observability/uds/sessionRegistration.js`),
 * `runStartupNaming`/`restoreSessionName`
 * (`@thyrox/local-observability/uds/sessionRename.js`), el nombre derivado
 * (`derivedSessionName`, `@thyrox/tool-registry/words.js`) y el título de
 * sesión (`cacheSessionTitle`/`getCurrentSessionTitle`,
 * `@thyrox/storage/sessionStorage.js`)— pero que tenían CERO llamadores de
 * producción: ninguna sesión de `bin/cli` publicaba `sessions/<pid>.json`, y
 * otra sesión no podía verla.
 *
 * `registerSessionAtLaunch` es el único punto de entrada: arma las
 * dependencias reales de `registerAtLaunch` y lo corre. `runLoop.ts` y
 * `print.ts` (los dos caminos de `bin/cli`, REPL y `-p`) lo llaman al
 * arrancar; ninguno construye sus propias dependencias.
 *
 * Sin almacenamiento remoto: `bin/cli` no tiene un backend de KV para el
 * registro de sesiones, así que el `storage` de `sessionRegistration.ts` y
 * `sessionRename.ts` viaja como `undefined` en cada punto de esta
 * composición — el mismo valor con que sus propios tests por omisión los
 * ejercitan — y las funciones caen a su lectura/escritura por sistema de
 * archivos (`<config home>/sessions/<pid>.json`, vía `defaultSessionsDir`).
 *
 * DOS DIVERGENCIAS DECLARADAS de TASK-THYROX-0503, porque sus piezas de
 * origen no tienen porte en este árbol (`git grep` sin resultados fuera de
 * este docstring y del tipo que las declara):
 *
 *   - `isSpareParked` (`OA` de la referencia): no hay sesión de reserva
 *     portada que pueda estar «aparcada» en `bin/cli` — el concepto entero
 *     vive del lado del daemon/spare, fuera del alcance de este ítem. Se
 *     cablea `() => false`: el registro nunca se salta por esa causa, que
 *     es el comportamiento de una sesión que nunca nace de reserva.
 *   - `setAgentName` (`Jve` de la referencia): el nombre de agente del
 *     banner de la UI vive en ink/el REPL, que no son dependencias de
 *     `@thyrox/app-host`. Se cablea como no-op: el nombre persistido para
 *     OTRAS sesiones lo sigue publicando `setTitle`/`cacheSessionTitle`; lo
 *     que falta es sólo el reflejo cosmético en el banner de ESTA sesión.
 *
 * TASK-THYROX-0504 — latido, sesión de reserva y barrido, medidos contra
 * 2.1.283 antes de cablear nada (`_references/claude-code-bin/2.1.283/
 * bunfs-root/`), no asumidos desde la prosa del ítem:
 *
 *   - **El barrido queda cableado.** `countLiveSessions` ya no llama a
 *     `listAllLiveSessions().length` (una sustituta emparentada, pero
 *     distinta) — llama a `sweepSessionRegistryAtLaunch`, que reenvía a
 *     `sweepRegistry` (`xut`/`registrySweep.ts`), la MISMA función que la
 *     referencia invoca en este punto exacto: `chunk-bdv29443.js`, dentro
 *     del `.then` que sigue a `KNt(E)` (`startSessionRegistration`):
 *     `xut(E).then((T)=>{if(T>=2)i("tengu_concurrent_sessions",
 *     {num_sessions:T})})`. `sweepRegistry` YA tenía un llamador de
 *     producción distinto (`@thyrox/repl/tips/tipRegistry.ts`, la
 *     relevancia del tip `color-when-multi-clauding` — porte fiel de la
 *     MISMA `xut` que usa la referencia para ese tip, `chunk-30gw5pmc.js`),
 *     así que lo que faltaba no era la función sino ESTE llamador. Cerrarlo
 *     de verdad exigió además una segunda pieza, sin la cual el barrido
 *     nunca borra nada: `SessionRegistryState`'s `probeRegistrySweep` no
 *     estaba cableado a `probeRegistrySweepPermitted` en
 *     `sessionRegistryState.ts`'s `processSessionRegistryDeps` —
 *     `isRegistrySweepPermitted()` resolvía SIEMPRE `false`
 *     (`?? Promise.resolve(false)`), así que ningún registro muerto se
 *     retiraba en producción aunque el entorno lo permitiera. Ya wired.
 *   - **La sesión de reserva YA tenía llamador de producción, sin tocar
 *     nada.** `startSpareClaimPoll` (`spareSession.ts`) ya se invoca desde
 *     `registerSession` (`sessionRegistration.ts`: `if (announcesSpare)
 *     startSpareClaimPoll(storage, deps)`), y `registerSession` es lo que
 *     `startSessionRegistration` —ya compuesto aquí como `deps.register`—
 *     ejecuta. La condición (`announcesSpare`, que exige `kind === 'bg'` y
 *     `THYROX_BG_SOURCE=spare`) rara vez se cumple en una sesión de
 *     `bin/cli` corriente, pero el cableado existe y corre por este mismo
 *     camino; no había nada que cablear de nuevo.
 *   - **El latido NO se cablea aquí, y es una divergencia medida, no una
 *     omisión.** En la referencia, `touchFleetViewHeartbeat`/
 *     `clearFleetViewHeartbeat` (`jNr`/`WNr`, `fleetHeartbeat.ts`) tienen
 *     UN solo llamador: el `load()`/cierre del store de FleetView
 *     (`chunk-9d5amed5.js` — `load=async()=>{if(Ws()&&
 *     x("tengu_fleetview_peers",!1))this.#e.touchFleetViewHeartbeat(...)`,
 *     y `clearFleetViewHeartbeat` en el método de cierre del store), NO el
 *     arranque de una sesión de `bin/cli`. Ese latido significa «el tablero
 *     de FleetView está abierto y mirando» —lo consume `isWatchedFromFile`/
 *     `isWatchedFromStorage`, que hoy no tienen NINGÚN llamador de
 *     producción en este árbol (`git grep` sin resultados fuera de sus
 *     propios tests): la función entera «fleetview peers» —su bandera
 *     `tengu_fleetview_peers`, el chequeo `Ws()` y el consumidor— no está
 *     portada. Tocarlo aquí marcaría CADA sesión lanzada como «siendo
 *     observada», invirtiendo la semántica que el latido existe para
 *     señalar. Su lugar, cuando se porte, es
 *     `@thyrox/repl/screens/agentFleet/hooks/useFleetPolling.ts` (el poll
 *     de FleetView ya portado, que hoy NO toca el latido) — fuera del
 *     alcance de `@thyrox/app-host` y de este ítem.
 *
 * `adoptLoopSessionId` resuelve la otra mitad del ítem: el registro nace con
 * el `sessionId` que trae `@thyrox/app-host/bootstrap/state.js` al arrancar
 * (un id nuevo, aún sin relación con el bucle), y el bucle
 * (`@thyrox/agent/loop`) abre su PROPIO id en `session.ts:38`
 * (`opts.resume ?? randomUUID()`). En vez de forzar ese id como si fuera un
 * `--resume` —que dispararía la reconciliación de `session.ts` sobre un
 * transcript que no existe—, el llamador escucha el evento `session_start`
 * del generador y adopta el id con `switchSession`: el registro ya
 * publicado se actualiza in-place (el oyente de
 * `sessionRegistration.ts::registerSession` reescribe `sessionId` en el pid
 * file), sin reabrir el registro ni tocar el flujo del bucle.
 */
import { asSessionId } from '@thyrox/agent/idTypes'
import { registerCleanup } from '../bootstrap/cleanupRegistry.ts'
import { getIsNonInteractiveSession, getSessionId, onOriginalCwdChange, onSessionSwitch, switchSession } from '../bootstrap/state.ts'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { registerAtLaunch, type LaunchRegistrationDeps } from '@thyrox/local-observability/uds/launchRegistration.js'
import { listAllLiveSessions } from '@thyrox/local-observability/uds/liveSessionRegistry.js'
import { setSessionName, type PidFileStorage } from '@thyrox/local-observability/uds/pidFileRecord.js'
import { sessionKind } from '@thyrox/local-observability/uds/sessionKind.js'
import { sessionNameState } from '@thyrox/local-observability/uds/sessionNameState.js'
import { processRegistrationDeps, startSessionRegistration } from '@thyrox/local-observability/uds/sessionRegistration.js'
import { registeredSessionName, sessionRegistryState, stableAddressEnabled, whenSessionRegistered } from '@thyrox/local-observability/uds/sessionRegistryState.js'
import { sweepRegistry, type RegistrySweepDeps } from '@thyrox/local-observability/uds/registrySweep.js'
import { notifyCorrespondentsOfRename, type RenameNoticeDeps } from '@thyrox/local-observability/uds/renameNotice.js'
import {
  restoreSessionName as restoreSessionNamePorted,
  runStartupNaming as runStartupNamingPorted,
  sanitizeSessionName,
  type RegisteredName,
  type RenameContext,
} from '@thyrox/local-observability/uds/sessionRename.js'
import { cacheSessionTitle, getCurrentSessionTitle } from '@thyrox/storage/sessionStorage.js'
import { generateShortWordSlug, isShortWordSlug, derivedSessionName } from '@thyrox/tool-registry/words.js'

/** El contexto de renombre único de este proceso: mismo estado en cada llamada, como `wS()`. */
export function buildRenameContext(): RenameContext {
  return {
    state: sessionNameState(),
    registry: {
      whenRegistered: () => whenSessionRegistered(),
      listLive: () => listAllLiveSessions(),
    },
    registeredName: () => registeredSessionName(),
    registration: () => sessionRegistryState(),
    writeName: (name, target, source) => setSessionName(name, target as PidFileStorage | undefined, source),
    isShortWordSlug,
    slug: generateShortWordSlug,
    uniquenessEnabled: () => getFeatureValue_CACHED_MAY_BE_STALE('tengu_session_name_uniqueness', false),
    pid: process.pid,
    log: (message, level) => logForDebugging(message, { level }),
  }
}

/**
 * `xut`: el barrido que la referencia corre justo tras un registro exitoso
 * (`chunk-bdv29443.js`, dentro del `.then` de `KNt(E)`:
 * `xut(E).then((T)=>{if(T>=2)i("tengu_concurrent_sessions",{num_sessions:T})})`).
 * Envuelto para que `countLiveSessions` lo cite por identidad y una prueba
 * pueda inyectarle `RegistrySweepDeps` —`sweepRegistry()` a secas no admite
 * eso porque su segundo parámetro es opcional y aquí se reenvía.
 */
export function sweepSessionRegistryAtLaunch(deps?: RegistrySweepDeps): Promise<number> {
  return sweepRegistry(undefined, deps)
}

/**
 * Da de alta esta sesión de `bin/cli` en el registro y le fija su nombre.
 * `sessionNameArg` es `--name` (si la CLI lo admite) o `THYROX_CODE_SESSION_NAME`.
 */
export async function registerSessionAtLaunch(sessionNameArg?: string): Promise<void> {
  const renameContext = buildRenameContext()
  const registrationDeps = processRegistrationDeps({
    derivedName: (cwd, sessionId) => derivedSessionName(cwd, sessionId, stableAddressEnabled()),
    registerCleanup,
    onSessionSwitch,
    onOriginalCwdChange,
  })
  const launchDeps: LaunchRegistrationDeps = {
    isSpareParked: () => false,
    installRestoreSetAsideName: restore => {
      sessionRegistryState().restoreSetAsideName = restore
    },
    restoreSessionName: (name, options) => {
      void restoreSessionNamePorted(name, undefined, options, renameContext)
    },
    register: () => startSessionRegistration(undefined, registrationDeps),
    currentSessionId: () => getSessionId(),
    sessionNameArg,
    peerSessionKind: () => sessionKind(),
    nonInteractive: () => getIsNonInteractiveSession(),
    runStartupNaming: options => runStartupNamingPorted(options, renameContext),
    writeRegisteredName: (name, source, givenAtLaunch) => setSessionName(name, undefined, source, givenAtLaunch),
    registeredName: () => registeredSessionName(),
    currentTitle: sessionId => getCurrentSessionTitle(asSessionId(sessionId)),
    setTitle: title => cacheSessionTitle(title),
    setAgentName: () => {},
    countLiveSessions: () => sweepSessionRegistryAtLaunch(),
    emit: (event, data) => logEvent(event, data),
  }
  await registerAtLaunch(launchDeps)
}

/**
 * Adopta `sessionId` (el que acaba de abrir `@thyrox/agent/loop` en su
 * evento `session_start`) como la sesión viva de este proceso, para que el
 * registro ya publicado por `registerSessionAtLaunch` quede con el mismo id
 * que el transcript. `resumed` es si el arranque llevó `--resume`.
 */
export function adoptLoopSessionId(sessionId: string, resumed: boolean): void {
  switchSession(asSessionId(sessionId), resumed ? 'resume' : 'startup_custom_id')
}

/**
 * `RenameNoticeDeps` sin correspondiente real: en `bin/cli` no hay envío de
 * mensajes entre sesiones por UDS (`git grep -l sendPeerMessage -- src/`
 * sin resultados fuera del propio tipo) — `messagingEnabled` queda en
 * `() => false` a propósito, la misma forma que `isSpareParked`/
 * `setAgentName` de arriba: `notifyCorrespondentsOfRename` corta en su
 * primera línea (`!deps.messagingEnabled()`) antes de tocar `ownSocket`,
 * `listLive` o `send`, así que esas tres quedan con una implementación
 * mínima que nunca corre.
 */
function buildRenameNoticeDeps(context: RenameContext): RenameNoticeDeps {
  return {
    state: context.state,
    uniquenessEnabled: context.uniquenessEnabled,
    messagingEnabled: () => false,
    ownSocket: () => undefined,
    listLive: () => context.registry.listLive(),
    send: async () => undefined,
    log: message => context.log(message, 'info'),
  }
}

/**
 * `/rename <nombre>` del chat de `bin/cli`. Compone los primitivos ya
 * portados de `sessionRename.ts` (`tPt`/`resolveUniqueName`,
 * `Vtn`/`scheduleNameRecheck`, `li`/`sanitizeSessionName`) sobre el registro
 * de ESTA sesión, más el aviso a correspondientes (`zkr`/
 * `notifyCorrespondentsOfRename`).
 *
 * Medido contra 2.1.283 antes de cablear, `chunk-csayct82.js` (comando) y
 * `chunk-myby092r.js` (`LTn`, la función que ambas variantes —`local-jsx`
 * interactiva y `local` de thin-client— invocan):
 *
 *   var r1o={type:"local-jsx",name:"rename",aliases:["name"],
 *     description:"Rename the current conversation", …,
 *     load:()=>import("/$bunfs/root/chunk-rna068k2.js")},
 *   $Fe={type:"local",name:"rename",aliases:["name"],
 *     supportsNonInteractive:!0, …,
 *     load:()=>import("/$bunfs/root/chunk-sn2j4wz5.js")}
 *
 * `chunk-sn2j4wz5.js` (la variante `local`, la que corresponde a un CLI sin
 * Ink): `async function o(e,a){let{message:m}=await LTn(e,a,!1);return
 * {type:"text",value:m}}` — `e` es el argumento tecleado, `a` el contexto de
 * turno, y devuelve el mensaje de `LTn` como texto.
 *
 * `LTn` (`chunk-myby092r.js`): si el argumento está vacío, genera un nombre
 * con un fork del modelo (`jSt`/`f`, un `system_prompt` +
 * `outputFormat:"json_schema"` pidiendo `{name}` kebab-case); si no, usa el
 * argumento tal cual. Escribe con `ARt(n,"user",e.storageV5,…)` y arma el
 * mensaje final: `"Session renamed to: "+i` en el caso simple, con el sufijo
 * `(" + c + " is held by another live session on this machine)"` cuando
 * `s.outcome==="yielded"`, y `"That name is empty once invisible characters
 * are removed. Usage: /rename <name>"` cuando el nombre saneado queda vacío.
 *
 * DOS DIVERGENCIAS DECLARADAS (`porte-completo-no-parcial.md`):
 *
 *   - **Sin argumento, no genera nombre — muestra el actual.** `jSt`/`f`
 *     abren un fork de conversación contra el modelo en vivo (otro
 *     `querySource`, otro `system_prompt`, `outputFormat` de JSON) sólo para
 *     sugerir un nombre; nada de esa maquinaria está portado, y añadirla
 *     aquí sería una llamada al proveedor en medio del REPL, fuera del
 *     alcance de este ítem. El ítem admite explícitamente esta rama
 *     («derivar o mostrar el actual»): se muestra el nombre registrado.
 *   - **El aviso a correspondientes no reproduce el disparador exacto de
 *     `ARt`/`Bfe`.** En la referencia, `zkr` sólo se llama dentro de `Bfe`
 *     cuando `V.yieldedFrom!==void 0` — una condición de la maquinaria de
 *     escritura de registro (`ARt`/`Bfe`/`KDt`) que este árbol no porta
 *     (`sessionRename.ts` porta `tPt`/`Gkr`/`Vtn`/`VFn`/`sae`/`jkr`, no
 *     `ARt` ni `Bfe`). Aquí se llama cuando el nombre registrado cambia de
 *     verdad a causa de este comando, la composición más fiel con lo que sí
 *     está portado. Es inerte hoy de todos modos: `messagingEnabled` es
 *     `() => false` (ver `buildRenameNoticeDeps`), así que no envía nada.
 */
export async function renameCurrentSession(requestedName: string | undefined): Promise<string> {
  const context = buildRenameContext()
  const before: RegisteredName | undefined = context.registeredName()
  const trimmed = requestedName?.trim() ?? ''
  if (!trimmed) {
    return before ? `Session is named: ${before.name}. Usage: /rename <name>` : 'Usage: /rename <name>'
  }
  const sanitized = sanitizeSessionName(trimmed)
  if (!sanitized) return 'That name is empty once invisible characters are removed. Usage: /rename <name>'
  await restoreSessionNamePorted(sanitized, undefined, { source: 'user' }, context)
  const after = context.registeredName()
  const finalName = after?.name ?? sanitized
  if (before !== undefined && before.name !== finalName) {
    await notifyCorrespondentsOfRename(before.name, finalName, sanitized, undefined, buildRenameNoticeDeps(context))
  }
  return finalName === sanitized
    ? `Session renamed to: ${finalName}`
    : `Session renamed to: ${finalName} ("${sanitized}" is held by another live session on this machine)`
}
