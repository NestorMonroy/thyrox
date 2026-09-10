/**
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgeUI.ts` (530 líneas
 * fuente, 100% portado — `createBridgeLogger` y todos sus 20 métodos del
 * objeto `BridgeLogger` devuelto).
 *
 * Logger de estado en terminal del bridge: banner de arranque, código QR,
 * línea de estado con spinner/reconexión/fallo, lista de sesiones en modo
 * multi-sesión, y el log verbose de eventos de sesión.
 *
 * `qrcode` y `chalk` son dependencias npm reales, ya declaradas en
 * `package.json`. `stringWidth`, `logForDebugging`, `getMacroVersion` y las
 * tres constantes `BRIDGE_*` de figuras son PUNTOS DE INYECCIÓN /
 * REIMPLEMENTACIÓN FIEL ya existentes (o añadidos en este pase) en
 * `./internal/pendingCrossPackageDeps.ts` — ver ahí la cita completa.
 * `bridgeStatusUtil.js` y `types.js` son hermanos DENTRO del mismo paquete,
 * ya portados.
 */

import chalk from 'chalk'
import { toString as qrToString } from 'qrcode'
import {
  getMacroVersion,
  logForDebugging,
  stringWidth,
  BRIDGE_FAILED_INDICATOR,
  BRIDGE_READY_INDICATOR,
  BRIDGE_SPINNER_FRAMES,
} from './internal/pendingCrossPackageDeps.js'
import {
  buildActiveFooterText,
  buildBridgeConnectUrl,
  buildBridgeSessionUrl,
  buildIdleFooterText,
  FAILED_FOOTER_TEXT,
  formatDuration,
  type StatusState,
  TOOL_DISPLAY_EXPIRY_MS,
  timestamp,
  truncatePrompt,
  wrapWithOsc8Link,
} from './bridgeStatusUtil.js'
import type {
  BridgeConfig,
  BridgeLogger,
  SessionActivity,
  SpawnMode,
} from './types.js'

const QR_OPTIONS = {
  type: 'utf8' as const,
  errorCorrectionLevel: 'L' as const,
  small: true,
}

/** Genera un código QR y devuelve sus líneas. */
async function generateQr(url: string): Promise<string[]> {
  const qr = await qrToString(url, QR_OPTIONS)
  return qr.split('\n').filter((line: string) => line.length > 0)
}

export function createBridgeLogger(options: {
  verbose: boolean
  write?: (s: string) => void
}): BridgeLogger {
  const write = options.write ?? ((s: string) => process.stdout.write(s))
  const verbose = options.verbose

  // Cuenta cuántas líneas de estado están mostradas actualmente al fondo.
  let statusLineCount = 0

  // Máquina de estados del status.
  let currentState: StatusState = 'idle'
  let currentStateText = 'Ready'
  let repoName = ''
  let branch = ''
  let debugLogPath = ''

  // URL de conexión (construida en printBanner con la base correcta
  // para staging/prod).
  let connectUrl = ''
  let cachedIngressUrl = ''
  let cachedEnvironmentId = ''
  let activeSessionUrl: string | null = null

  // Líneas del código QR para la URL actual.
  let qrLines: string[] = []
  let qrVisible = false

  // Actividad de herramienta para la segunda línea de estado.
  let lastToolSummary: string | null = null
  let lastToolTime = 0

  // Indicador de conteo de sesiones (se muestra cuando el modo
  // multi-sesión está habilitado).
  let sessionActive = 0
  let sessionMax = 1
  // Spawn mode mostrado en la línea de conteo de sesiones + gatea el hint 'w'.
  let spawnModeDisplay: 'same-dir' | 'worktree' | null = null
  let spawnMode: SpawnMode = 'single-session'

  // Info de display por sesión para la lista de viñetas multi-sesión
  // (clave: sessionId compat).
  const sessionDisplayInfo = new Map<
    string,
    { title?: string; url: string; activity?: SessionActivity }
  >()

  // Estado del spinner de conexión.
  let connectingTimer: ReturnType<typeof setInterval> | null = null
  let connectingTick = 0

  /**
   * Cuenta cuántas filas visuales de terminal ocupa una cadena, tomando en
   * cuenta el wrapping de línea. Cada `\n` es una fila, y el contenido más
   * ancho que la terminal envuelve a filas adicionales.
   */
  function countVisualLines(text: string): number {
    const cols = process.stdout.columns || 80 // contexto CLI no-React
    let count = 0
    // Divide por saltos de línea para obtener líneas lógicas.
    for (const logical of text.split('\n')) {
      if (logical.length === 0) {
        // Segmento vacío entre \n consecutivos — cuenta como 1 fila.
        count++
        continue
      }
      const width = stringWidth(logical)
      count += Math.max(1, Math.ceil(width / cols))
    }
    // El \n final en "line\n" produce un último elemento vacío — no se
    // cuenta porque el cursor queda al inicio de la siguiente línea, no en
    // una fila visual nueva.
    if (text.endsWith('\n')) {
      count--
    }
    return count
  }

  /** Escribe una línea de estado y rastrea su conteo de líneas visuales. */
  function writeStatus(text: string): void {
    write(text)
    statusLineCount += countVisualLines(text)
  }

  /** Limpia cualquier línea de estado mostrada actualmente. */
  function clearStatusLines(): void {
    if (statusLineCount <= 0) return
    logForDebugging(`[bridge:ui] clearStatusLines count=${statusLineCount}`)
    // Mueve el cursor arriba hasta el inicio del bloque de estado, luego
    // borra todo lo que sigue.
    write(`\x1b[${statusLineCount}A`) // cursor arriba N líneas
    write('\x1b[J') // borra desde el cursor hasta el final de pantalla
    statusLineCount = 0
  }

  /** Imprime una línea de log permanente, limpiando el estado antes y
   *  restaurándolo después. */
  function printLog(line: string): void {
    clearStatusLines()
    write(line)
  }

  /** Regenera el código QR con la URL dada. */
  function regenerateQr(url: string): void {
    generateQr(url)
      .then(lines => {
        qrLines = lines
        renderStatusLine()
      })
      .catch(e => {
        logForDebugging(`QR code generation failed: ${e}`)
      })
  }

  /** Dibuja la línea del spinner de conexión (se muestra antes del primer
   *  updateIdleStatus). */
  function renderConnectingLine(): void {
    clearStatusLines()

    const frame =
      BRIDGE_SPINNER_FRAMES[connectingTick % BRIDGE_SPINNER_FRAMES.length]!
    let suffix = ''
    if (repoName) {
      suffix += chalk.dim(' · ') + chalk.dim(repoName)
    }
    if (branch) {
      suffix += chalk.dim(' · ') + chalk.dim(branch)
    }
    writeStatus(
      `${chalk.yellow(frame)} ${chalk.yellow('Connecting')}${suffix}\n`,
    )
  }

  /** Arranca el spinner de conexión. Se detiene con el primer
   *  updateIdleStatus(). */
  function startConnecting(): void {
    stopConnecting()
    renderConnectingLine()
    connectingTimer = setInterval(() => {
      connectingTick++
      renderConnectingLine()
    }, 150)
  }

  /** Detiene el spinner de conexión. */
  function stopConnecting(): void {
    if (connectingTimer) {
      clearInterval(connectingTimer)
      connectingTimer = null
    }
  }

  /** Dibuja y escribe las líneas de estado actuales según el estado. */
  function renderStatusLine(): void {
    if (currentState === 'reconnecting' || currentState === 'failed') {
      // Estos estados se manejan aparte (updateReconnectingStatus /
      // updateFailedStatus). Retorna antes de limpiar para que callers
      // como toggleQr y setSpawnModeDisplay no borren el display durante
      // estos estados.
      return
    }

    clearStatusLines()

    const isIdle = currentState === 'idle'

    // Código QR arriba de la línea de estado.
    if (qrVisible) {
      for (const line of qrLines) {
        writeStatus(`${chalk.dim(line)}\n`)
      }
    }

    // Determina el indicador y colores según el estado.
    const indicator = BRIDGE_READY_INDICATOR
    const indicatorColor = isIdle ? chalk.green : chalk.cyan
    const baseColor = isIdle ? chalk.green : chalk.cyan
    const stateText = baseColor(currentStateText)

    // Arma el sufijo con repo y branch.
    let suffix = ''
    if (repoName) {
      suffix += chalk.dim(' · ') + chalk.dim(repoName)
    }
    // En modo worktree cada sesión tiene su propia branch, así que mostrar
    // la branch del bridge sería engañoso.
    if (branch && spawnMode !== 'worktree') {
      suffix += chalk.dim(' · ') + chalk.dim(branch)
    }

    if (process.env.USER_TYPE === 'ant' && debugLogPath) {
      writeStatus(
        `${chalk.yellow('[ANT-ONLY] Logs:')} ${chalk.dim(debugLogPath)}\n`,
      )
    }
    writeStatus(`${indicatorColor(indicator)} ${stateText}${suffix}\n`)

    // Conteo de sesiones y lista por sesión (sólo modo multi-sesión).
    if (sessionMax > 1) {
      const modeHint =
        spawnMode === 'worktree'
          ? 'New sessions will be created in an isolated worktree'
          : 'New sessions will be created in the current directory'
      writeStatus(
        `    ${chalk.dim(`Capacity: ${sessionActive}/${sessionMax} · ${modeHint}`)}\n`,
      )
      for (const [, info] of sessionDisplayInfo) {
        const titleText = info.title
          ? truncatePrompt(info.title, 35)
          : chalk.dim('Attached')
        const titleLinked = wrapWithOsc8Link(titleText, info.url)
        const act = info.activity
        const showAct = act && act.type !== 'result' && act.type !== 'error'
        const actText = showAct
          ? chalk.dim(` ${truncatePrompt(act.summary, 40)}`)
          : ''
        writeStatus(`    ${titleLinked}${actText}
`)
      }
    }

    // Línea de modo para spawn modes con un solo slot (o modo
    // single-session verdadero).
    if (sessionMax === 1) {
      const modeText =
        spawnMode === 'single-session'
          ? 'Single session · exits when complete'
          : spawnMode === 'worktree'
            ? `Capacity: ${sessionActive}/1 · New sessions will be created in an isolated worktree`
            : `Capacity: ${sessionActive}/1 · New sessions will be created in the current directory`
      writeStatus(`    ${chalk.dim(modeText)}\n`)
    }

    // Línea de actividad de herramienta para modo single-session.
    if (
      sessionMax === 1 &&
      !isIdle &&
      lastToolSummary &&
      Date.now() - lastToolTime < TOOL_DISPLAY_EXPIRY_MS
    ) {
      writeStatus(`  ${chalk.dim(truncatePrompt(lastToolSummary, 60))}\n`)
    }

    // Separador en blanco antes del footer.
    const url = activeSessionUrl ?? connectUrl
    if (url) {
      writeStatus('\n')
      const footerText = isIdle
        ? buildIdleFooterText(url)
        : buildActiveFooterText(url)
      const qrHint = qrVisible
        ? chalk.dim.italic('space to hide QR code')
        : chalk.dim.italic('space to show QR code')
      const toggleHint = spawnModeDisplay
        ? chalk.dim.italic(' · w to toggle spawn mode')
        : ''
      writeStatus(`${chalk.dim(footerText)}\n`)
      writeStatus(`${qrHint}${toggleHint}\n`)
    }
  }

  return {
    printBanner(config: BridgeConfig, environmentId: string): void {
      cachedIngressUrl = config.sessionIngressUrl
      cachedEnvironmentId = environmentId
      connectUrl = buildBridgeConnectUrl(environmentId, cachedIngressUrl)
      regenerateQr(connectUrl)

      if (verbose) {
        write(chalk.dim(`Remote Control`) + ` v${getMacroVersion()}\n`)
      }
      if (verbose) {
        if (config.spawnMode !== 'single-session') {
          write(chalk.dim(`Spawn mode: `) + `${config.spawnMode}\n`)
          write(
            chalk.dim(`Max concurrent sessions: `) + `${config.maxSessions}\n`,
          )
        }
        write(chalk.dim(`Environment ID: `) + `${environmentId}\n`)
      }
      if (config.sandbox) {
        write(chalk.dim(`Sandbox: `) + `${chalk.green('Enabled')}\n`)
      }
      write('\n')

      // Arranca el spinner de conexión — el primer updateIdleStatus() lo detiene.
      startConnecting()
    },

    logSessionStart(sessionId: string, prompt: string): void {
      if (verbose) {
        const short = truncatePrompt(prompt, 80)
        printLog(
          chalk.dim(`[${timestamp()}]`) +
            ` Session started: ${chalk.white(`"${short}"`)} (${chalk.dim(sessionId)})\n`,
        )
      }
    },

    logSessionComplete(sessionId: string, durationMs: number): void {
      printLog(
        chalk.dim(`[${timestamp()}]`) +
          ` Session ${chalk.green('completed')} (${formatDuration(durationMs)}) ${chalk.dim(sessionId)}\n`,
      )
    },

    logSessionFailed(sessionId: string, error: string): void {
      printLog(
        chalk.dim(`[${timestamp()}]`) +
          ` Session ${chalk.red('failed')}: ${error} ${chalk.dim(sessionId)}\n`,
      )
    },

    logStatus(message: string): void {
      printLog(chalk.dim(`[${timestamp()}]`) + ` ${message}\n`)
    },

    logVerbose(message: string): void {
      if (verbose) {
        printLog(chalk.dim(`[${timestamp()}] ${message}`) + '\n')
      }
    },

    logError(message: string): void {
      printLog(chalk.red(`[${timestamp()}] Error: ${message}`) + '\n')
    },

    logReconnected(disconnectedMs: number): void {
      printLog(
        chalk.dim(`[${timestamp()}]`) +
          ` ${chalk.green('Reconnected')} after ${formatDuration(disconnectedMs)}\n`,
      )
    },

    setRepoInfo(repo: string, branchName: string): void {
      repoName = repo
      branch = branchName
    },

    setDebugLogPath(path: string): void {
      debugLogPath = path
    },

    updateIdleStatus(): void {
      stopConnecting()

      currentState = 'idle'
      currentStateText = 'Ready'
      lastToolSummary = null
      lastToolTime = 0
      activeSessionUrl = null
      regenerateQr(connectUrl)
      renderStatusLine()
    },

    setAttached(sessionId: string): void {
      stopConnecting()
      currentState = 'attached'
      currentStateText = 'Connected'
      lastToolSummary = null
      lastToolTime = 0
      // Multi-sesión: mantiene el footer/QR en la URL de conexión del
      // ambiente para que los usuarios puedan generar más sesiones. Los
      // links por sesión están en la lista de viñetas.
      if (sessionMax <= 1) {
        activeSessionUrl = buildBridgeSessionUrl(
          sessionId,
          cachedEnvironmentId,
          cachedIngressUrl,
        )
        regenerateQr(activeSessionUrl)
      }
      renderStatusLine()
    },

    updateReconnectingStatus(delayStr: string, elapsedStr: string): void {
      stopConnecting()
      clearStatusLines()
      currentState = 'reconnecting'

      // Código QR arriba de la línea de estado.
      if (qrVisible) {
        for (const line of qrLines) {
          writeStatus(`${chalk.dim(line)}\n`)
        }
      }

      const frame =
        BRIDGE_SPINNER_FRAMES[connectingTick % BRIDGE_SPINNER_FRAMES.length]!
      connectingTick++
      writeStatus(
        `${chalk.yellow(frame)} ${chalk.yellow('Reconnecting')} ${chalk.dim('·')} ${chalk.dim(`retrying in ${delayStr}`)} ${chalk.dim('·')} ${chalk.dim(`disconnected ${elapsedStr}`)}\n`,
      )
    },

    updateFailedStatus(error: string): void {
      stopConnecting()
      clearStatusLines()
      currentState = 'failed'

      let suffix = ''
      if (repoName) {
        suffix += chalk.dim(' · ') + chalk.dim(repoName)
      }
      if (branch) {
        suffix += chalk.dim(' · ') + chalk.dim(branch)
      }

      writeStatus(
        `${chalk.red(BRIDGE_FAILED_INDICATOR)} ${chalk.red('Remote Control Failed')}${suffix}\n`,
      )
      writeStatus(`${chalk.dim(FAILED_FOOTER_TEXT)}\n`)

      if (error) {
        writeStatus(`${chalk.red(error)}\n`)
      }
    },

    updateSessionStatus(
      _sessionId: string,
      _elapsed: string,
      activity: SessionActivity,
      _trail: string[],
    ): void {
      // Cachea la actividad de herramienta para la segunda línea de estado.
      if (activity.type === 'tool_start') {
        lastToolSummary = activity.summary
        lastToolTime = Date.now()
      }
      renderStatusLine()
    },

    clearStatus(): void {
      stopConnecting()
      clearStatusLines()
    },

    toggleQr(): void {
      qrVisible = !qrVisible
      renderStatusLine()
    },

    updateSessionCount(active: number, max: number, mode: SpawnMode): void {
      if (sessionActive === active && sessionMax === max && spawnMode === mode)
        return
      sessionActive = active
      sessionMax = max
      spawnMode = mode
      // No re-dibuja aquí — el ticker de estado llama a renderStatusLine
      // en su propia cadencia, y el próximo tick recoge los valores nuevos.
    },

    setSpawnModeDisplay(mode: 'same-dir' | 'worktree' | null): void {
      if (spawnModeDisplay === mode) return
      spawnModeDisplay = mode
      // Sincroniza también el spawnMode para que el próximo render muestre
      // el hint de modo + visibilidad de branch correctos. No dibuja aquí —
      // igual que updateSessionCount: se llama antes de printBanner (setup
      // inicial) y de nuevo desde el handler de 'w' (que sigue con
      // refreshDisplay).
      if (mode) spawnMode = mode
    },

    addSession(sessionId: string, url: string): void {
      sessionDisplayInfo.set(sessionId, { url })
    },

    updateSessionActivity(sessionId: string, activity: SessionActivity): void {
      const info = sessionDisplayInfo.get(sessionId)
      if (!info) return
      info.activity = activity
    },

    setSessionTitle(sessionId: string, title: string): void {
      const info = sessionDisplayInfo.get(sessionId)
      if (!info) return
      info.title = title
      // Guarda contra reconnecting/failed — renderStatusLine limpia y
      // retorna temprano para esos estados, lo que borraría el
      // spinner/error.
      if (currentState === 'reconnecting' || currentState === 'failed') return
      if (sessionMax === 1) {
        // Single-session: muestra el título en la línea de estado
        // principal también.
        currentState = 'titled'
        currentStateText = truncatePrompt(title, 40)
      }
      renderStatusLine()
    },

    removeSession(sessionId: string): void {
      sessionDisplayInfo.delete(sessionId)
    },

    refreshDisplay(): void {
      // Salta durante reconnecting/failed — renderStatusLine limpia y
      // retorna temprano para esos estados, lo que borraría el
      // spinner/error.
      if (currentState === 'reconnecting' || currentState === 'failed') return
      renderStatusLine()
    },
  }
}
