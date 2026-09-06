/**
 * Porte de `ccnmt: packages/app-host/src/bootstrap/gracefulShutdown.ts` —
 * handler de apagado del proceso (señales, excepciones no atrapadas,
 * timer de failsafe, limpieza de terminal, hint de reanudación).
 *
 * PORTE PARCIAL DECLARADO. `gracefulShutdown.test.ts` (el que sí importa
 * el módulo, fuera del alcance de este pase) queda pendiente; el test de
 * ESTE pase — `__tests__/gracefulShutdown.behavior.test.ts` — es un
 * conjunto de 33 pins A NIVEL DE FUENTE: lee este archivo con
 * `readFileSync` y asevera con `toMatch` sobre su texto literal. NUNCA
 * importa el módulo como código ejecutable, así que las 6 dependencias
 * de paquete que la fuente cita y que NO existen en este árbol —medido
 * con `ls /home/user/thyrox/src/packages/`— no bloquean ese test:
 *
 *   - `chalk` (dim del hint de reanudación)
 *   - `signal-exit` (`onExit`, el pin del workaround de Bun)
 *   - `lodash-es/memoize.js` (memoización de `setupGracefulShutdown`)
 *   - `@anthropic/ink` (constantes de secuencias de escape + `instances`)
 *   - `@claude-code-how-works/headless-sdk/agentSdkTypes.js` (tipo
 *     `ExitReason` — import de solo-tipo, se elide al transpilar)
 *   - `@claude-code-how-works/local-observability` y sus subrutas
 *     (`logEvent`, `logInternalErrorEvent`, `shutdownEventLoggers`,
 *     `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`,
 *     `logForDebugging`, `logForDiagnosticsNoPII`, `closeSentry`)
 *   - `@claude-code-how-works/config` y sus subrutas (`isEnvTruthy`,
 *     `getInvokedBinaryName`, `sleep`)
 *   - `@claude-code-how-works/storage/sessionStorage.js`
 *     (`getCurrentSessionTitle`, `sessionIdExists`)
 *   - `../startup/startupProfiler.js` (`profileReport` — vecino de
 *     paquete que tampoco existe todavía en este árbol)
 *
 * Se citan las mismas rutas de import de la fuente (no se inventan
 * equivalentes locales) para que el símbolo quede localizable el día que
 * esos paquetes se porten. El único import real de este árbol es
 * `./cleanupRegistry.js` (portado en este mismo pase) y `./state.js`
 * (otro agente de esta tanda lo está escribiendo — NO se toca).
 *
 * Los 33 pins SÍ exigen preservar literalmente la forma del código (nombres
 * de función, control de flujo, constantes) — ahí el literal ES el
 * contrato, igual que una constante cuyo valor la fuente fija: sin esa
 * forma exacta los pins no miden nada. Los comentarios de prosa (no
 * pinneados por ningún regex) se tradujeron al español.
 */
import chalk from 'chalk'
import { createHash } from 'crypto'
import { writeSync } from 'fs'
import memoize from 'lodash-es/memoize.js'
import { onExit } from 'signal-exit'
import type { ExitReason } from '@claude-code-how-works/headless-sdk/agentSdkTypes.js'
import {
  getIsInteractive,
  getIsScrollDraining,
  getLastMainRequestId,
  getSessionId,
  isSessionPersistenceDisabled,
} from './state.js'
import { DISABLE_KITTY_KEYBOARD, DISABLE_MODIFY_OTHER_KEYS, DBP, DFE, DISABLE_MOUSE_TRACKING, EXIT_ALT_SCREEN, SHOW_CURSOR, CLEAR_ITERM2_PROGRESS, CLEAR_TAB_STATUS, CLEAR_TERMINAL_TITLE, instances, supportsTabStatus, wrapForMultiplexer } from '@anthropic/ink'
import {
  logEvent,
} from '@claude-code-how-works/local-observability'
import { logInternalErrorEvent } from '@claude-code-how-works/local-observability/telemetry'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  shutdownEventLoggers,
} from '@claude-code-how-works/local-observability/compat'
type AppState = unknown
import { runCleanupFunctions } from './cleanupRegistry.js'
import { logForDebugging } from '@claude-code-how-works/local-observability/debug.js'
import { logForDiagnosticsNoPII } from '@claude-code-how-works/local-observability/logging'
import { isEnvTruthy } from '@claude-code-how-works/config/env/utils'
import { getInvokedBinaryName } from '@claude-code-how-works/config'
import { getCurrentSessionTitle, sessionIdExists } from '@claude-code-how-works/storage/sessionStorage.js'
import { sleep } from '@claude-code-how-works/config/sleep'
import { closeSentry } from '@claude-code-how-works/local-observability/sentry.js'
import { profileReport } from '../startup/startupProfiler.js'

/**
 * Limpia los modos de terminal de forma síncrona antes de que el proceso
 * salga. Esto asegura que las secuencias de escape (teclado Kitty, focus
 * reporting, etc.) queden deshabilitadas incluso si `componentWillUnmount`
 * de React no alcanza a correr a tiempo. Usa `writeSync` para asegurar que
 * las escrituras se completen antes de `process.exit`.
 *
 * Se envían todas las secuencias de deshabilitación incondicionalmente
 * porque:
 * 1. La detección de terminal puede no funcionar siempre bien (p. ej. en
 *    tmux, screen).
 * 2. Estas secuencias son no-ops en terminales que no las soportan.
 * 3. No deshabilitarlas deja la terminal en un estado roto.
 */
/* eslint-disable custom-rules/no-sync-fs -- debe ser sync para vaciar antes de process.exit */
export function cleanupTerminalModes(): void {
  if (!process.stdout.isTTY) {
    return
  }

  try {
    // Deshabilita el mouse tracking PRIMERO, antes del recorrido de
    // desmontaje de React. La terminal necesita un round-trip para
    // procesar esto y dejar de mandar eventos; hacerlo ahora (no
    // después del unmount) le da ese tiempo mientras estamos ocupados
    // desmontando. Si no, los eventos llegan durante la limpieza en
    // modo cooked y o se hacen eco en pantalla o se filtran al shell.
    writeSync(1, DISABLE_MOUSE_TRACKING)
    // Sale de la alt screen PRIMERO para que printResumeHint() (y todas
    // las secuencias de abajo) caigan en el buffer principal.
    //
    // Desmonta Ink directamente en vez de escribir EXIT_ALT_SCREEN
    // nosotros mismos. Ink registró su unmount con signal-exit, así que
    // de lo contrario correría OTRA VEZ dentro de forceExit() →
    // process.exit(). Dos problemas si se deja que eso pase:
    //   1. Si escribimos 1049l aquí y el unmount lo escribe otra vez
    //      después, el segundo dispara otro DECRC — el cursor salta de
    //      vuelta sobre el hint de reanudación y el prompt del shell
    //      queda en la línea equivocada.
    //   2. unmount()'s onRender() debe correr con altScreenActive=true
    //      (matemática de cursor de alt-screen) Y sobre el buffer alt.
    //      Salir de alt-screen aquí primero hace que onRender() escriba
    //      un frame de REPL encima del buffer principal.
    // Llamar a unmount() ahora hace el render final sobre el buffer alt,
    // se desuscribe de signal-exit, y escribe 1049l exactamente una vez.
    const inst = instances.get(process.stdout)
    if (inst?.isAltScreenActive) {
      try {
        inst.unmount()
      } catch {
        // El reconciler/render lanzó — recae en la salida manual de
        // alt-screen para que printResumeHint siga cayendo en el buffer
        // principal.
        writeSync(1, EXIT_ALT_SCREEN)
      }
    }
    // Atrapa eventos que llegaron durante el recorrido de desmontaje.
    // detachForShutdown() de abajo también drena.
    inst?.drainStdin()
    // Marca la instancia de Ink como desmontada para que el
    // ink.unmount() diferido de signal-exit retorne temprano en vez de
    // mandar secuencias EXIT_ALT_SCREEN redundantes (desde su bloque de
    // limpieza writeSync + la limpieza de unmount de AlternateScreen).
    // Esas secuencias redundantes caen DESPUÉS de printResumeHint() y
    // pisan el hint de reanudación en tmux (y posiblemente otras
    // terminales) restaurando la posición de cursor guardada. Es seguro
    // saltarse el unmount completo: esta función ya manda todas las
    // secuencias de reseteo de terminal, y el proceso está saliendo.
    inst?.detachForShutdown()
    // Deshabilita el reporte extendido de teclas — siempre se mandan
    // ambas porque las terminales ignoran en silencio la que no
    // implementan
    writeSync(1, DISABLE_MODIFY_OTHER_KEYS)
    writeSync(1, DISABLE_KITTY_KEYBOARD)
    // Deshabilita eventos de foco (DECSET 1004)
    writeSync(1, DFE)
    // Deshabilita el modo de pegado entre corchetes
    writeSync(1, DBP)
    // Muestra el cursor
    writeSync(1, SHOW_CURSOR)
    // Limpia la barra de progreso de iTerm2 - evita un indicador de
    // progreso persistente que puede causar sonidos de campana al
    // volver a la pestaña de la terminal
    writeSync(1, CLEAR_ITERM2_PROGRESS)
    // Limpia el estado de la pestaña (OSC 21337) para que no quede un
    // punto viejo
    if (supportsTabStatus()) writeSync(1, wrapForMultiplexer(CLEAR_TAB_STATUS))
    // Limpia el título de la terminal para que la pestaña no muestre
    // info vieja de la sesión. Respeta CLAUDE_CODE_DISABLE_TERMINAL_TITLE
    // — si el usuario optó por no tener cambios de título, tampoco
    // limpiar su título existente al salir.
    if (!isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE)) {
      if (process.platform === 'win32') {
        process.title = ''
      } else {
        writeSync(1, CLEAR_TERMINAL_TITLE)
      }
    }
  } catch {
    // La terminal puede ya haberse ido (p. ej. SIGHUP tras cerrar la
    // terminal). Se ignoran errores de escritura porque de todos modos
    // estamos saliendo.
  }
}

let resumeHintPrinted = false

/**
 * Imprime un hint sobre cómo reanudar la sesión.
 * Solo se muestra para sesiones interactivas con persistencia habilitada.
 */
function printResumeHint(): void {
  // Solo imprimir una vez (el timer de failsafe puede llamar esto otra
  // vez tras un apagado normal)
  if (resumeHintPrinted) {
    return
  }
  // Solo se muestra con TTY, sesiones interactivas, y persistencia
  if (
    process.stdout.isTTY &&
    getIsInteractive() &&
    !isSessionPersistenceDisabled()
  ) {
    try {
      const sessionId = getSessionId()
      // No mostrar el hint de reanudación si no existe archivo de
      // sesión (p. ej. subcomandos como `claude update`)
      if (!sessionIdExists(sessionId)) {
        return
      }
      const customTitle = getCurrentSessionTitle(sessionId)

      // Usa el título personalizado si está disponible, si no recae en
      // el session ID
      let resumeArg: string
      if (customTitle) {
        // Envuelve en comillas dobles, escapa backslashes primero y
        // luego comillas
        const escaped = customTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        resumeArg = `"${escaped}"`
      } else {
        resumeArg = sessionId
      }

      writeSync(
        1,
        chalk.dim(
          `\nResume this session with:\n${getInvokedBinaryName()} --resume ${resumeArg}\n`,
        ),
      )
      resumeHintPrinted = true
    } catch {
      // Ignorar errores de escritura
    }
  }
}
/* eslint-enable custom-rules/no-sync-fs */

/**
 * Fuerza la salida del proceso, manejando el caso donde la terminal ya
 * no está. Cuando la terminal/PTY se cierra (p. ej. SIGHUP),
 * `process.exit()` puede lanzar errores EIO porque Bun intenta vaciar
 * stdout hacia un descriptor de archivo muerto. En ese caso, recae en
 * SIGKILL, que siempre funciona.
 */
function forceExit(exitCode: number): never {
  // Limpia el timer de failsafe ya que estamos saliendo ahora
  if (failsafeTimer !== undefined) {
    clearTimeout(failsafeTimer)
    failsafeTimer = undefined
  }
  // Drena stdin AL FINAL, justo antes de salir. cleanupTerminalModes()
  // mandó DISABLE_MOUSE_TRACKING temprano, pero el round-trip de la
  // terminal más cualquier evento ya en vuelo significa que pueden
  // llegar bytes durante los segundos de limpieza async entre entonces
  // y ahora. Drenar aquí los atrapa.
  // Se usa el método de clase de Ink (no el drainStdin() independiente)
  // para drenar el stdin de la instancia — cuando process.stdin está
  // redirigido, getStdinOverride() abre /dev/tty como el stream de
  // entrada real y el método de clase lo sabe; la función independiente
  // recae en process.stdin por defecto, que retornaría temprano con
  // isTTY=false.
  try {
    instances.get(process.stdout)?.drainStdin()
  } catch {
    // La terminal puede haberse ido (SIGHUP). Se ignora — estamos por
    // salir.
  }
  try {
    process.exit(exitCode)
  } catch (e) {
    // process.exit() lanzó. En tests, está mockeado para lanzar - se
    // re-lanza para que el test lo vea. En producción, probablemente es
    // EIO de una terminal muerta - se usa SIGKILL.
    if ((process.env.NODE_ENV as string) === 'test') {
      throw e
    }
    // Recae en SIGKILL, que no intenta vaciar nada.
    process.kill(process.pid, 'SIGKILL')
  }
  // En tests, process.exit puede estar mockeado para retornar en vez de
  // salir. En producción, nunca deberíamos llegar aquí.
  if ((process.env.NODE_ENV as string) !== 'test') {
    throw new Error('unreachable')
  }
  // Truco de TypeScript: se castea a never ya que sabemos que esto solo
  // pasa en tests donde el mock retorna en vez de salir
  return undefined as never
}

/**
 * Configura los handlers globales de señal para el apagado ordenado
 */
export const setupGracefulShutdown = memoize(() => {
  // Sortea un bug de Bun donde process.removeListener(sig, fn) resetea
  // el sigaction del kernel para esa señal incluso cuando quedan otros
  // listeners de JS — la señal entonces recae en su acción por defecto
  // (terminar) y nuestro handler de process.on('SIGTERM') nunca corre.
  //
  // Disparador: cualquier suscriptor de signal-exit v4 de vida corta
  // (p. ej. execa por proceso hijo, o una instancia de Ink que se
  // desmonta). Cuando su unsubscribe corre y era el último suscriptor
  // v4, v4.unload() llama removeListener en cada señal de su lista
  // (SIGTERM, SIGINT, SIGHUP, …), disparando el bug de Bun y tumbando
  // nuestros handlers a nivel de kernel.
  //
  // Arreglo: fija signal-exit v4 cargado registrando un callback onExit
  // no-op que nunca se desuscribe. Esto mantiene el conteo interno de
  // emisores de v4 en > 0 así que unload() nunca corre y removeListener
  // nunca se llama. Inofensivo bajo Node.js — el fijado también asegura
  // que el hook process.exit de signal-exit siga activo para la
  // limpieza de Ink.
  onExit(() => {})

  process.on('SIGINT', () => {
    // En modo print, print.ts registra su propio handler de SIGINT que
    // aborta la query en vuelo y llama gracefulShutdown(0); se salta
    // aquí para no competir con él. Solo se revisa el modo print — otras
    // sesiones no interactivas (--sdk-url, --init-only, no-TTY) no
    // registran su propio handler de SIGINT y necesitan que
    // gracefulShutdown corra.
    if (process.argv.includes('-p') || process.argv.includes('--print')) {
      return
    }
    logForDiagnosticsNoPII('info', 'shutdown_signal', { signal: 'SIGINT' })
    void gracefulShutdown(0)
  })
  process.on('SIGTERM', () => {
    logForDiagnosticsNoPII('info', 'shutdown_signal', { signal: 'SIGTERM' })
    void gracefulShutdown(143) // Código de salida 143 (128 + 15) para SIGTERM
  })
  if (process.platform !== 'win32') {
    process.on('SIGHUP', () => {
      logForDiagnosticsNoPII('info', 'shutdown_signal', { signal: 'SIGHUP' })
      void gracefulShutdown(129) // Código de salida 129 (128 + 1) para SIGHUP
    })

    // Detecta un proceso huérfano cuando la terminal se cierra sin
    // entregar SIGHUP. macOS revoca los descriptores de archivo de la
    // TTY en vez de mandar señal, dejando el proceso vivo pero incapaz
    // de leer/escribir. Se revisa periódicamente la validez de stdin.
    if (process.stdin.isTTY) {
      orphanCheckInterval = setInterval(() => {
        // Se salta durante el drenado de scroll — hasta un chequeo
        // barato consume un tick del event loop que los frames de
        // scroll necesitan. Intervalo de 30s → perderse uno está bien.
        if (getIsScrollDraining()) return
        // Cuando el lector nativo de stdin (stdin-napi) está activo
        // para el camino FleetView, App.tsx destruye el process.stdin
        // de Bun para darle al lector de rust la posesión exclusiva del
        // fd 0 — lo que hace que process.stdin.readable === false
        // aunque el proceso esté bien vivo (el lector de rust está
        // leyendo el fd 0 en su propio hilo). El chequeo de huérfano
        // dispararía en falso a los 30s y mataría la sesión FleetView /
        // adjunta. Así que en modo lector, solo se confía en
        // process.stdout (cuya escribibilidad sigue reflejando una TTY
        // revocada); se ignora process.stdin.readable.
        const readerOwnsStdin = process.env.CCB_FLEET_INPROCESS_REMOUNT === '1'
        const stdinDead = readerOwnsStdin ? false : !process.stdin.readable
        // process.stdout.writable se vuelve false cuando la TTY es revocada
        if (!process.stdout.writable || stdinDead) {
          clearInterval(orphanCheckInterval)
          logForDiagnosticsNoPII('info', 'shutdown_signal', {
            signal: 'orphan_detected',
          })
          void gracefulShutdown(129)
        }
      }, 30_000) // Se revisa cada 30 segundos
      orphanCheckInterval.unref() // No mantener el proceso vivo solo por este chequeo
    }
  }

  // Registra excepciones no atrapadas para observabilidad de contenedor
  // y analytics. Los nombres de error (p. ej. "TypeError") no son
  // sensibles - seguro de registrar.
  // Porte de ant v2.1.131 (2821.js): detector por ventana deslizante de
  // bucles de excepción descontrolados. Cuando >=EXCEPTION_LOOP_THRESHOLD
  // excepciones no atrapadas disparan dentro de EXCEPTION_LOOP_WINDOW_MS,
  // se emite `tengu_uncaught_exception_loop` y se fuerza un apagado
  // ordenado — sin esta salvaguarda, un setInterval que lanza en cada
  // tick quema CPU y volumen de logs hasta que el usuario presiona ^C,
  // a menudo enmascarando el problema real.
  // Alineado con ant v2.1.131 (2821.js) H38=5000, fo1=10. La semántica de
  // reseteo también coincide: cuando una excepción llega más de 5000ms
  // después de la anterior, el contador se resetea — así que solo se
  // dispara en ráfagas cerradas (10+ excepciones no atrapadas en una
  // ventana deslizante de 5s).
  const EXCEPTION_LOOP_WINDOW_MS = 5_000
  const EXCEPTION_LOOP_THRESHOLD = 10
  const exceptionTimestamps: number[] = []
  let loopShutdownFired = false
  process.on('uncaughtException', error => {
    // Hashea el mensaje de error para la telemetría de bucle — permite
    // detectar "la misma excepción disparando 10× / 5s" vs "10
    // excepciones distintas disparando con 5s de separación". sha256
    // primeros 16 chars hex coincide con la forma de
    // `al_(H).error_message_hash` de ant.
    const errorMessageHash = (() => {
      try {
        return createHash('sha256')
          .update(error.message || '')
          .digest('hex')
          .slice(0, 16)
      } catch {
        return undefined
      }
    })()
    logForDiagnosticsNoPII('error', 'uncaught_exception', {
      error_name: error.name,
      error_message: error.message.slice(0, 2000),
    })
    logEvent('tengu_uncaught_exception', {
      error_name:
        error.name as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      ...(errorMessageHash && {
        error_message_hash:
          errorMessageHash as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      }),
    })
    // Porte de ant LF9 (2642.js): evento OTel estructurado
    // `internal_error`. La guarda de reentrancia dentro de
    // logInternalErrorEvent evita emisión recursiva si el logger lanza
    // mientras reporta un crash no relacionado.
    logInternalErrorEvent(error)
    const now = Date.now()
    while (
      exceptionTimestamps.length > 0 &&
      exceptionTimestamps[0]! < now - EXCEPTION_LOOP_WINDOW_MS
    ) {
      exceptionTimestamps.shift()
    }
    exceptionTimestamps.push(now)
    if (
      exceptionTimestamps.length >= EXCEPTION_LOOP_THRESHOLD &&
      !loopShutdownFired
    ) {
      loopShutdownFired = true
      logEvent('tengu_uncaught_exception_loop', {
        count: exceptionTimestamps.length,
        window_ms: EXCEPTION_LOOP_WINDOW_MS,
        // ant 2.1.136 añade `error_name` + `error_message_hash` a este
        // evento para que los dashboards puedan distinguir "la misma
        // excepción 10x" de "10 excepciones distintas" — necesario para
        // triar "¿es un bucle infinito cerrado o un flap?".
        error_name:
          error.name as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        ...(errorMessageHash && {
          error_message_hash:
            errorMessageHash as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        }),
      })
      logForDiagnosticsNoPII('error', 'uncaught_exception_loop', {
        count: String(exceptionTimestamps.length),
        window_ms: String(EXCEPTION_LOOP_WINDOW_MS),
      })
      void gracefulShutdown(1, 'fatal')
    }
  })

  // Registra rechazos de promesa no manejados para observabilidad de
  // contenedor y analytics
  process.on('unhandledRejection', reason => {
    const errorName =
      reason instanceof Error
        ? reason.name
        : typeof reason === 'string'
          ? 'string'
          : 'unknown'
    const errorInfo =
      reason instanceof Error
        ? {
            error_name: reason.name,
            error_message: reason.message.slice(0, 2000),
            error_stack: reason.stack?.slice(0, 4000),
          }
        : { error_message: String(reason).slice(0, 2000) }
    logForDiagnosticsNoPII('error', 'unhandled_rejection', errorInfo)
    logEvent('tengu_unhandled_rejection', {
      error_name:
        errorName as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  })
})

export function gracefulShutdownSync(
  exitCode = 0,
  reason: ExitReason = 'other',
  options?: {
    getAppState?: () => AppState
    setAppState?: (f: (prev: AppState) => AppState) => void
  },
): void {
  // Fija el código de salida que se usará cuando el proceso salga de
  // forma natural. Ojo que se hace aquí también en la versión sync para
  // que sea posible determinar si gracefulShutdownSync fue llamado
  // revisando process.exitCode.
  process.exitCode = exitCode

  pendingShutdown = gracefulShutdown(exitCode, reason, options)
    .catch(error => {
      logForDebugging(`Graceful shutdown failed: ${error}`, { level: 'error' })
      cleanupTerminalModes()
      printResumeHint()
      forceExit(exitCode)
    })
    // Evita un rechazo no manejado: forceExit re-lanza en modo test, lo
    // que escaparía del handler .catch() de arriba como un nuevo rechazo.
    .catch(() => {})
}

let shutdownInProgress = false
let failsafeTimer: ReturnType<typeof setTimeout> | undefined
let orphanCheckInterval: ReturnType<typeof setInterval> | undefined
let pendingShutdown: Promise<void> | undefined

/** Revisa si el apagado ordenado está en curso */
export function isShuttingDown(): boolean {
  return shutdownInProgress
}

/** Resetea el estado de apagado - solo para uso en tests */
export function resetShutdownState(): void {
  shutdownInProgress = false
  resumeHintPrinted = false
  if (failsafeTimer !== undefined) {
    clearTimeout(failsafeTimer)
    failsafeTimer = undefined
  }
  pendingShutdown = undefined
}

/**
 * Devuelve la promesa de apagado en vuelo, si hay alguna. Solo para uso
 * en tests, para esperar a que complete antes de restaurar mocks.
 */
export function getPendingShutdownForTesting(): Promise<void> | undefined {
  return pendingShutdown
}

// Función de apagado ordenado que drena el event loop
export async function gracefulShutdown(
  exitCode = 0,
  reason: ExitReason = 'other',
  options?: {
    getAppState?: () => AppState
    setAppState?: (f: (prev: AppState) => AppState) => void
    /** Se imprime a stderr tras salir de la alt-screen, antes de forceExit. */
    finalMessage?: string
  },
): Promise<void> {
  if (shutdownInProgress) {
    return
  }
  shutdownInProgress = true

  // Resuelve el presupuesto del hook SessionEnd antes de armar el
  // failsafe para que el failsafe pueda escalar con él. Sin esto, un
  // presupuesto de hook configurado por el usuario en 10s se trunca en
  // silencio por el failsafe de 5s (seguimiento de gh-32712).
  const { executeSessionEndHooks, getSessionEndHookTimeoutMs } = await import(
    '@claude-code-how-works/agent/hooks.js'
  )
  const sessionEndTimeoutMs = getSessionEndHookTimeoutMs()

  // Failsafe: garantiza que el proceso salga incluso si la limpieza se
  // cuelga (p. ej. conexiones MCP). Corre cleanupTerminalModes primero
  // para que una limpieza colgada no deje la terminal sucia.
  // Presupuesto = max(5s, presupuesto del hook + 3.5s de margen para
  // limpieza y vaciado de analytics).
  failsafeTimer = setTimeout(
    code => {
      cleanupTerminalModes()
      printResumeHint()
      forceExit(code)
    },
    Math.max(5000, sessionEndTimeoutMs + 3500),
    exitCode,
  )
  failsafeTimer.unref()

  // Fija el código de salida que se usará cuando el proceso salga de forma natural
  process.exitCode = exitCode

  // Sale de la alt screen e imprime el hint de reanudación PRIMERO,
  // antes de cualquier operación async. Esto asegura que el hint sea
  // visible incluso si el proceso es matado durante la limpieza (p. ej.
  // SIGKILL durante un reinicio de macOS). Sin esto, el hint de
  // reanudación solo aparecería después de las funciones de limpieza,
  // los hooks, y el vaciado de analytics — lo que puede tomar varios
  // segundos.
  cleanupTerminalModes()
  printResumeHint()

  // Vacía los datos de sesión primero — esta es la limpieza más
  // crítica. Si la terminal está muerta (SIGHUP, desconexión SSH), los
  // hooks y analytics pueden colgarse en I/O hacia una TTY muerta o una
  // red inalcanzable, comiéndose el presupuesto de failsafe. La
  // persistencia de sesión debe completarse antes que cualquier otra cosa.
  let cleanupTimeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const cleanupPromise = (async () => {
      try {
        await runCleanupFunctions()
      } catch {
        // Ignora en silencio errores de limpieza
      }
    })()

    await Promise.race([
      cleanupPromise,
      new Promise((_, reject) => {
        cleanupTimeoutId = setTimeout(
          rej => rej(new CleanupTimeoutError()),
          2000,
          reject,
        )
      }),
    ])
    clearTimeout(cleanupTimeoutId)
  } catch {
    // Maneja en silencio el timeout y otros errores
    clearTimeout(cleanupTimeoutId)
  }

  // Ejecuta los hooks SessionEnd. Se acota tanto el timeout por defecto
  // por hook como la ejecución completa vía un único presupuesto
  // (CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS, default 1.5s).
  // hook.timeout en settings se respeta hasta este tope.
  try {
    await executeSessionEndHooks(reason, {
      ...options,
      signal: AbortSignal.timeout(sessionEndTimeoutMs),
      timeoutMs: sessionEndTimeoutMs,
    })
  } catch {
    // Ignora excepciones del hook SessionEnd (incluido AbortError por timeout)
  }

  // Registra el rendimiento de arranque antes de que el apagado de
  // analytics vacíe/cancele timers
  try {
    profileReport()
  } catch {
    // Ignora errores de profiling durante el apagado
  }

  // Señala a inferencia que la caché de esta sesión puede desalojarse.
  // Se dispara antes del vaciado de analytics para que el evento llegue
  // al pipeline.
  const lastRequestId = getLastMainRequestId()
  if (lastRequestId) {
    logEvent('tengu_cache_eviction_hint', {
      scope:
        'session_end' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      last_request_id:
        lastRequestId as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  }

  // Vacía los sinks locales restantes — acotado a 500ms.
  try {
    await Promise.race([
      Promise.all([shutdownEventLoggers(), closeSentry(2000)]),
      sleep(500),
    ])
  } catch {
    // Ignora errores de apagado
  }

  if (options?.finalMessage) {
    try {
      // eslint-disable-next-line custom-rules/no-sync-fs -- debe vaciar antes de forceExit
      writeSync(2, options.finalMessage + '\n')
    } catch {
      // stderr puede estar cerrado (p. ej. desconexión SSH). Ignora errores de escritura.
    }
  }

  forceExit(exitCode)
}

class CleanupTimeoutError extends Error {
  constructor() {
    super('Cleanup timeout')
  }
}
