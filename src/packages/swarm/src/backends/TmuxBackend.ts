/**
 * El respaldo de panel sobre tmux.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/TmuxBackend.ts` (764
 * líneas, 1 símbolo exportado). Ese árbol declara `"license": "UNLICENSED"`,
 * así que el cuerpo se **reimplementa** y no se copia.
 *
 * DOS DISPOSICIONES, y la diferencia no es cosmética:
 *
 * - **Con el líder DENTRO de tmux**: se parte su ventana. El líder se queda a
 *   la izquierda al 30 % y los compañeros se reparten el resto.
 * - **Con el líder FUERA**: se crea una sesión `claude-swarm` aparte, en su
 *   propio socket, y los compañeros se reparten en mosaico. No hay panel de
 *   líder que preservar.
 *
 * DIVERGENCIA DECLARADA: se añade `_test_resetTmuxBackendState()`. El módulo
 * lleva estado —si el primer panel externo ya se usó, la ventana del líder
 * cacheada— y en un proceso de pruebas todos los casos lo comparten. Mismo
 * criterio que `teammateModeSnapshot`.
 */
import {
  count,
  execFileNoThrow,
  logError,
  logForDebugging,
  sleep,
} from '../adapters/appRuntime.js'
import type { AgentColorName } from '../adapters/appRuntime.js'
import {
  getSwarmSocketName,
  HIDDEN_SESSION_NAME,
  SWARM_SESSION_NAME,
  SWARM_VIEW_WINDOW_NAME,
  TMUX_COMMAND,
} from '../core/constants.js'
import {
  getLeaderPaneId,
  isInsideTmux as isInsideTmuxFromDetection,
  isTmuxAvailable,
} from './detection.js'
import { registerTmuxBackend } from './registry.js'
import type { CreatePaneResult, PaneBackend, PaneId } from './types.js'

/** Si el panel inicial de la sesión externa ya alberga a un compañero. */
let firstPaneUsedForExternal = false

/** La ventana del líder, cacheada: no cambia mientras viva la sesión. */
let cachedLeaderWindowTarget: string | null = null

/**
 * La cola que serializa la creación de paneles.
 *
 * Dos compañeros engendrados a la vez consultan el número de paneles antes de
 * que el otro haya creado el suyo, y los dos se creen «el primero».
 */
let paneCreationLock: Promise<void> = Promise.resolve()

/**
 * Cuánto se espera a que el shell del panel nuevo termine de arrancar.
 *
 * 200 ms cubren las configuraciones lentas —starship, oh-my-zsh—. Sin la
 * espera, la orden se envía antes de que haya quien la lea y se pierde.
 */
const PANE_SHELL_INIT_DELAY_MS = 200

function waitForPaneShellReady(): Promise<void> {
  return sleep(PANE_SHELL_INIT_DELAY_MS)
}

function acquirePaneCreationLock(): Promise<() => void> {
  let release: () => void
  const newLock = new Promise<void>(resolve => {
    release = resolve
  })

  const previousLock = paneCreationLock
  paneCreationLock = newLock

  return previousLock.then(() => release!)
}

/**
 * El nombre del color en el vocabulario de tmux.
 *
 * Dos de los ocho no existen como nombre: pasarlos tal cual deja el borde sin
 * color y sin queja.
 */
function getTmuxColorName(color: AgentColorName): string {
  const tmuxColors: Record<AgentColorName, string> = {
    red: 'red',
    blue: 'blue',
    green: 'green',
    yellow: 'yellow',
    purple: 'magenta',
    orange: 'colour208',
    pink: 'colour205',
    cyan: 'cyan',
  }
  // El `??` es una DIVERGENCIA declarada: la fuente indexa a secas, y bajo
  // `noUncheckedIndexedAccess` eso da `string | undefined` — un color fuera de
  // la unión emitiría `fg=undefined`, que tmux rechaza. Pasar el nombre tal
  // cual al menos le da algo que tal vez conozca.
  return tmuxColors[color] ?? color
}

/** Una orden en la sesión del usuario, sin socket propio. */
function runTmuxInUserSession(
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  return execFileNoThrow(TMUX_COMMAND, args)
}

/**
 * Una orden en el socket del enjambre.
 *
 * Es lo que separa la sesión externa de la del usuario: sin `-L`, la orden va
 * a la sesión del usuario y el panel externo se queda mudo sin error visible.
 */
function runTmuxInSwarm(
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  return execFileNoThrow(TMUX_COMMAND, ['-L', getSwarmSocketName(), ...args])
}

export class TmuxBackend implements PaneBackend {
  readonly type = 'tmux' as const
  readonly displayName = 'tmux'
  readonly supportsHideShow = true

  async isAvailable(): Promise<boolean> {
    return isTmuxAvailable()
  }

  async isRunningInside(): Promise<boolean> {
    return isInsideTmuxFromDetection()
  }

  async createTeammatePaneInSwarmView(
    name: string,
    color: AgentColorName,
  ): Promise<CreatePaneResult> {
    const releaseLock = await acquirePaneCreationLock()

    try {
      const insideTmux = await this.isRunningInside()

      if (insideTmux) {
        return await this.createTeammatePaneWithLeader(name, color)
      }

      return await this.createTeammatePaneExternal(name, color)
    } finally {
      releaseLock()
    }
  }

  async sendCommandToPane(
    paneId: PaneId,
    command: string,
    useExternalSession = false,
  ): Promise<void> {
    const runTmux = useExternalSession ? runTmuxInSwarm : runTmuxInUserSession
    const result = await runTmux(['send-keys', '-t', paneId, command, 'Enter'])

    if (result.code !== 0) {
      throw new Error(
        `Failed to send command to pane ${paneId}: ${result.stderr}`,
      )
    }
  }

  async setPaneBorderColor(
    paneId: PaneId,
    color: AgentColorName,
    useExternalSession = false,
  ): Promise<void> {
    const tmuxColor = getTmuxColorName(color)
    const runTmux = useExternalSession ? runTmuxInSwarm : runTmuxInUserSession

    // Las tres órdenes son distintas: el estilo del panel, el del borde
    // inactivo y el del activo. Fijar sólo una deja el color a medias según
    // dónde esté el foco.
    await runTmux([
      'select-pane',
      '-t',
      paneId,
      '-P',
      `bg=default,fg=${tmuxColor}`,
    ])

    await runTmux([
      'set-option',
      '-p',
      '-t',
      paneId,
      'pane-border-style',
      `fg=${tmuxColor}`,
    ])

    await runTmux([
      'set-option',
      '-p',
      '-t',
      paneId,
      'pane-active-border-style',
      `fg=${tmuxColor}`,
    ])
  }

  async setPaneTitle(
    paneId: PaneId,
    name: string,
    color: AgentColorName,
    useExternalSession = false,
  ): Promise<void> {
    const tmuxColor = getTmuxColorName(color)
    const runTmux = useExternalSession ? runTmuxInSwarm : runTmuxInUserSession

    await runTmux(['select-pane', '-t', paneId, '-T', name])

    await runTmux([
      'set-option',
      '-p',
      '-t',
      paneId,
      'pane-border-format',
      `#[fg=${tmuxColor},bold] #{pane_title} #[default]`,
    ])
  }

  async enablePaneBorderStatus(
    windowTarget?: string,
    useExternalSession = false,
  ): Promise<void> {
    const target = windowTarget || (await this.getCurrentWindowTarget())
    if (!target) {
      return
    }

    const runTmux = useExternalSession ? runTmuxInSwarm : runTmuxInUserSession
    await runTmux([
      'set-option',
      '-w',
      '-t',
      target,
      'pane-border-status',
      'top',
    ])
  }

  async rebalancePanes(
    windowTarget: string,
    hasLeader: boolean,
  ): Promise<void> {
    if (hasLeader) {
      await this.rebalancePanesWithLeader(windowTarget)
    } else {
      await this.rebalancePanesTiled(windowTarget)
    }
  }

  async killPane(paneId: PaneId, useExternalSession = false): Promise<boolean> {
    const runTmux = useExternalSession ? runTmuxInSwarm : runTmuxInUserSession
    const result = await runTmux(['kill-pane', '-t', paneId])
    return result.code === 0
  }

  /**
   * Esconde un panel llevándolo a una sesión desprendida.
   *
   * La sesión oculta se crea antes de mover nada: `break-pane` necesita un
   * destino que exista.
   */
  async hidePane(paneId: PaneId, useExternalSession = false): Promise<boolean> {
    const runTmux = useExternalSession ? runTmuxInSwarm : runTmuxInUserSession

    await runTmux(['new-session', '-d', '-s', HIDDEN_SESSION_NAME])

    const result = await runTmux([
      'break-pane',
      '-d',
      '-s',
      paneId,
      '-t',
      `${HIDDEN_SESSION_NAME}:`,
    ])

    if (result.code === 0) {
      logForDebugging(`[TmuxBackend] Hidden pane ${paneId}`)
    } else {
      logForDebugging(
        `[TmuxBackend] Failed to hide pane ${paneId}: ${result.stderr}`,
      )
    }

    return result.code === 0
  }

  /** Devuelve un panel escondido a su ventana y rehace la disposición. */
  async showPane(
    paneId: PaneId,
    targetWindowOrPane: string,
    useExternalSession = false,
  ): Promise<boolean> {
    const runTmux = useExternalSession ? runTmuxInSwarm : runTmuxInUserSession

    const result = await runTmux([
      'join-pane',
      '-h',
      '-s',
      paneId,
      '-t',
      targetWindowOrPane,
    ])

    if (result.code !== 0) {
      logForDebugging(
        `[TmuxBackend] Failed to show pane ${paneId}: ${result.stderr}`,
      )
      return false
    }

    logForDebugging(
      `[TmuxBackend] Showed pane ${paneId} in ${targetWindowOrPane}`,
    )

    await runTmux(['select-layout', '-t', targetWindowOrPane, 'main-vertical'])

    const panesResult = await runTmux([
      'list-panes',
      '-t',
      targetWindowOrPane,
      '-F',
      '#{pane_id}',
    ])

    // El PRIMERO de la lista es el líder: redimensionar otro lo dejaría
    // ocupando la mitad de la ventana.
    const panes = panesResult.stdout.trim().split('\n').filter(Boolean)
    if (panes[0]) {
      await runTmux(['resize-pane', '-t', panes[0], '-x', '30%'])
    }

    return true
  }

  /**
   * El panel del líder.
   *
   * Sale de la variable capturada al arrancar, no de preguntarle a tmux: el
   * usuario puede haber cambiado de panel, y entonces la consulta devolvería
   * el suyo actual en vez del del líder.
   */
  private async getCurrentPaneId(): Promise<string | null> {
    const leaderPane = getLeaderPaneId()
    if (leaderPane) {
      return leaderPane
    }

    const result = await execFileNoThrow(TMUX_COMMAND, [
      'display-message',
      '-p',
      '#{pane_id}',
    ])

    if (result.code !== 0) {
      logForDebugging(
        `[TmuxBackend] Failed to get current pane ID (exit ${result.code}): ${result.stderr}`,
      )
      return null
    }

    return result.stdout.trim()
  }

  /** La ventana del líder, en forma `sesión:índice`. Se cachea. */
  private async getCurrentWindowTarget(): Promise<string | null> {
    if (cachedLeaderWindowTarget) {
      return cachedLeaderWindowTarget
    }

    const leaderPane = getLeaderPaneId()
    const args = ['display-message']
    if (leaderPane) {
      args.push('-t', leaderPane)
    }
    args.push('-p', '#{session_name}:#{window_index}')

    const result = await execFileNoThrow(TMUX_COMMAND, args)

    if (result.code !== 0) {
      logForDebugging(
        `[TmuxBackend] Failed to get current window target (exit ${result.code}): ${result.stderr}`,
      )
      return null
    }

    cachedLeaderWindowTarget = result.stdout.trim()
    return cachedLeaderWindowTarget
  }

  /** Cuántos paneles hay en una ventana. */
  private async getCurrentWindowPaneCount(
    windowTarget?: string,
    useSwarmSocket = false,
  ): Promise<number | null> {
    const target = windowTarget || (await this.getCurrentWindowTarget())
    if (!target) {
      return null
    }

    const args = ['list-panes', '-t', target, '-F', '#{pane_id}']
    const result = useSwarmSocket
      ? await runTmuxInSwarm(args)
      : await runTmuxInUserSession(args)

    if (result.code !== 0) {
      logError(
        new Error(
          `[TmuxBackend] Failed to get pane count for ${target} (exit ${result.code}): ${result.stderr}`,
        ),
      )
      return null
    }

    return count(result.stdout.trim().split('\n'), Boolean)
  }

  private async hasSessionInSwarm(sessionName: string): Promise<boolean> {
    const result = await runTmuxInSwarm(['has-session', '-t', sessionName])
    return result.code === 0
  }

  /** Crea —o encuentra— la sesión externa y su ventana de enjambre. */
  private async createExternalSwarmSession(): Promise<{
    windowTarget: string
    paneId: string
  }> {
    const sessionExists = await this.hasSessionInSwarm(SWARM_SESSION_NAME)
    const windowTarget = `${SWARM_SESSION_NAME}:${SWARM_VIEW_WINDOW_NAME}`

    if (!sessionExists) {
      const result = await runTmuxInSwarm([
        'new-session',
        '-d',
        '-s',
        SWARM_SESSION_NAME,
        '-n',
        SWARM_VIEW_WINDOW_NAME,
        '-P',
        '-F',
        '#{pane_id}',
      ])

      if (result.code !== 0) {
        throw new Error(
          `Failed to create swarm session: ${result.stderr || 'Unknown error'}`,
        )
      }

      const paneId = result.stdout.trim()

      logForDebugging(
        `[TmuxBackend] Created external swarm session with window ${windowTarget}, pane ${paneId}`,
      )

      return { windowTarget, paneId }
    }

    const listResult = await runTmuxInSwarm([
      'list-windows',
      '-t',
      SWARM_SESSION_NAME,
      '-F',
      '#{window_name}',
    ])

    const windows = listResult.stdout.trim().split('\n').filter(Boolean)

    if (windows.includes(SWARM_VIEW_WINDOW_NAME)) {
      const paneResult = await runTmuxInSwarm([
        'list-panes',
        '-t',
        windowTarget,
        '-F',
        '#{pane_id}',
      ])

      const panes = paneResult.stdout.trim().split('\n').filter(Boolean)
      return { windowTarget, paneId: panes[0] || '' }
    }

    const createResult = await runTmuxInSwarm([
      'new-window',
      '-t',
      SWARM_SESSION_NAME,
      '-n',
      SWARM_VIEW_WINDOW_NAME,
      '-P',
      '-F',
      '#{pane_id}',
    ])

    if (createResult.code !== 0) {
      throw new Error(
        `Failed to create swarm-view window: ${createResult.stderr || 'Unknown error'}`,
      )
    }

    return { windowTarget, paneId: createResult.stdout.trim() }
  }

  /** Crea el panel del compañero partiendo la ventana del líder. */
  private async createTeammatePaneWithLeader(
    teammateName: string,
    teammateColor: AgentColorName,
  ): Promise<CreatePaneResult> {
    const currentPaneId = await this.getCurrentPaneId()
    const windowTarget = await this.getCurrentWindowTarget()

    if (!currentPaneId || !windowTarget) {
      throw new Error('Could not determine current tmux pane/window')
    }

    const paneCount = await this.getCurrentWindowPaneCount(windowTarget)
    if (paneCount === null) {
      throw new Error('Could not determine pane count for current window')
    }
    const isFirstTeammate = paneCount === 1

    let splitResult
    if (isFirstTeammate) {
      splitResult = await execFileNoThrow(TMUX_COMMAND, [
        'split-window',
        '-t',
        currentPaneId,
        '-h',
        '-l',
        '70%',
        '-P',
        '-F',
        '#{pane_id}',
      ])
    } else {
      const listResult = await execFileNoThrow(TMUX_COMMAND, [
        'list-panes',
        '-t',
        windowTarget,
        '-F',
        '#{pane_id}',
      ])

      // El primero es el líder: los compañeros son el resto, y el corte
      // alterna vertical y horizontal para que la rejilla crezca pareja.
      const panes = listResult.stdout.trim().split('\n').filter(Boolean)
      const teammatePanes = panes.slice(1)
      const teammateCount = teammatePanes.length

      const splitVertically = teammateCount % 2 === 1
      const targetPaneIndex = Math.floor((teammateCount - 1) / 2)
      const targetPane =
        teammatePanes[targetPaneIndex] ||
        teammatePanes[teammatePanes.length - 1]

      splitResult = await execFileNoThrow(TMUX_COMMAND, [
        'split-window',
        '-t',
        targetPane!,
        splitVertically ? '-v' : '-h',
        '-P',
        '-F',
        '#{pane_id}',
      ])
    }

    if (splitResult.code !== 0) {
      throw new Error(`Failed to create teammate pane: ${splitResult.stderr}`)
    }

    const paneId = splitResult.stdout.trim()
    logForDebugging(
      `[TmuxBackend] Created teammate pane for ${teammateName}: ${paneId}`,
    )

    await this.setPaneBorderColor(paneId, teammateColor)
    await this.setPaneTitle(paneId, teammateName, teammateColor)
    await this.rebalancePanesWithLeader(windowTarget)

    await waitForPaneShellReady()

    return { paneId, isFirstTeammate }
  }

  /** Crea el panel del compañero en la sesión externa, sin líder. */
  private async createTeammatePaneExternal(
    teammateName: string,
    teammateColor: AgentColorName,
  ): Promise<CreatePaneResult> {
    const { windowTarget, paneId: firstPaneId } =
      await this.createExternalSwarmSession()

    const paneCount = await this.getCurrentWindowPaneCount(windowTarget, true)
    if (paneCount === null) {
      throw new Error('Could not determine pane count for swarm window')
    }
    const isFirstTeammate = !firstPaneUsedForExternal && paneCount === 1

    let paneId: string

    if (isFirstTeammate) {
      // El primer compañero REUSA el panel que la sesión trae de fábrica: sin
      // esto quedaría un panel con un shell vacío ocupando media ventana.
      paneId = firstPaneId
      firstPaneUsedForExternal = true
      logForDebugging(
        `[TmuxBackend] Using initial pane for first teammate ${teammateName}: ${paneId}`,
      )

      await this.enablePaneBorderStatus(windowTarget, true)
    } else {
      const listResult = await runTmuxInSwarm([
        'list-panes',
        '-t',
        windowTarget,
        '-F',
        '#{pane_id}',
      ])

      // Aquí NO hay líder que saltarse: todos los paneles son compañeros.
      const panes = listResult.stdout.trim().split('\n').filter(Boolean)
      const teammateCount = panes.length

      const splitVertically = teammateCount % 2 === 1
      const targetPaneIndex = Math.floor((teammateCount - 1) / 2)
      const targetPane = panes[targetPaneIndex] || panes[panes.length - 1]

      const splitResult = await runTmuxInSwarm([
        'split-window',
        '-t',
        targetPane!,
        splitVertically ? '-v' : '-h',
        '-P',
        '-F',
        '#{pane_id}',
      ])

      if (splitResult.code !== 0) {
        throw new Error(`Failed to create teammate pane: ${splitResult.stderr}`)
      }

      paneId = splitResult.stdout.trim()
      logForDebugging(
        `[TmuxBackend] Created teammate pane for ${teammateName}: ${paneId}`,
      )
    }

    await this.setPaneBorderColor(paneId, teammateColor, true)
    await this.setPaneTitle(paneId, teammateName, teammateColor, true)
    await this.rebalancePanesTiled(windowTarget)

    await waitForPaneShellReady()

    return { paneId, isFirstTeammate }
  }

  /** Rehace la disposición dejando al líder al 30 % de la izquierda. */
  private async rebalancePanesWithLeader(windowTarget: string): Promise<void> {
    const listResult = await runTmuxInUserSession([
      'list-panes',
      '-t',
      windowTarget,
      '-F',
      '#{pane_id}',
    ])

    // Con el líder y un solo compañero, tmux ya los deja lado a lado.
    const panes = listResult.stdout.trim().split('\n').filter(Boolean)
    if (panes.length <= 2) {
      return
    }

    await runTmuxInUserSession([
      'select-layout',
      '-t',
      windowTarget,
      'main-vertical',
    ])

    const leaderPane = panes[0]
    await runTmuxInUserSession(['resize-pane', '-t', leaderPane!, '-x', '30%'])

    logForDebugging(
      `[TmuxBackend] Rebalanced ${panes.length - 1} teammate panes with leader`,
    )
  }

  /** Rehace la disposición en mosaico, sin líder al que reservar sitio. */
  private async rebalancePanesTiled(windowTarget: string): Promise<void> {
    const listResult = await runTmuxInSwarm([
      'list-panes',
      '-t',
      windowTarget,
      '-F',
      '#{pane_id}',
    ])

    const panes = listResult.stdout.trim().split('\n').filter(Boolean)
    if (panes.length <= 1) {
      return
    }

    await runTmuxInSwarm(['select-layout', '-t', windowTarget, 'tiled'])

    logForDebugging(
      `[TmuxBackend] Rebalanced ${panes.length} teammate panes with tiled layout`,
    )
  }
}

/** Borra el estado de módulo. Sólo para pruebas — ver la cabecera. */
export function _test_resetTmuxBackendState(): void {
  firstPaneUsedForExternal = false
  cachedLeaderWindowTarget = null
  paneCreationLock = Promise.resolve()
}

// El registro al cargar es un efecto de módulo DELIBERADO: es lo que rompe la
// circularidad con el registro. Ver la cabecera de `registry.ts`.
registerTmuxBackend(TmuxBackend)
