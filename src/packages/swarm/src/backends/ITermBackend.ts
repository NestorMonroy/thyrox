/**
 * El respaldo de panel sobre los paneles nativos de iTerm2, vía `it2`.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/ITermBackend.ts` (370
 * líneas, 1 símbolo exportado). Ese árbol declara `"license": "UNLICENSED"`,
 * así que el cuerpo se **reimplementa** y no se copia.
 *
 * LA DISPOSICIÓN: el líder a la izquierda y los compañeros apilados a su
 * derecha. El primer corte sale de la sesión del líder; los siguientes, del
 * ÚLTIMO compañero — cortar siempre desde el líder los repartiría por la
 * ventana en vez de dejarlos en columna.
 *
 * CINCO OPERACIONES SON NO-OP a propósito, y no por pereza: cada llamada a
 * `it2` levanta un proceso de Python y habla con la API del terminal, así que
 * el color y el título del panel —que iTerm2 ya muestra en la pestaña— no
 * valen su coste. Esconder y mostrar directamente no existen: iTerm2 no tiene
 * equivalente de `break-pane`.
 *
 * DIVERGENCIA DECLARADA: se añade `_test_resetITermBackendState()`, por la
 * misma razón que en `TmuxBackend`.
 */
import {
  execFileNoThrow,
  logForDebugging,
} from '../adapters/appRuntime.js'
import type { AgentColorName } from '../adapters/appRuntime.js'
import { IT2_COMMAND, isInITerm2, isIt2CliAvailable } from './detection.js'
import { registerITermBackend } from './registry.js'
import type { CreatePaneResult, PaneBackend, PaneId } from './types.js'

/** Las sesiones de los compañeros vivos, en orden de creación. */
const teammateSessionIds: string[] = []

/** Si el primer compañero ya tiene su panel. */
let firstPaneUsed = false

/** La cola que serializa la creación de paneles. */
let paneCreationLock: Promise<void> = Promise.resolve()

function acquirePaneCreationLock(): Promise<() => void> {
  let release: () => void
  const newLock = new Promise<void>(resolve => {
    release = resolve
  })

  const previousLock = paneCreationLock
  paneCreationLock = newLock

  return previousLock.then(() => release!)
}

function runIt2(
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  return execFileNoThrow(IT2_COMMAND, args)
}

/**
 * La sesión que `it2 session split` acaba de crear.
 *
 * El identificador sólo es válido cuando el corte se pidió con `-s` sobre una
 * sesión concreta: cortando desde «la activa», el panel puede acabar en otra
 * ventana y el identificador no alcanzarlo.
 */
function parseSplitOutput(output: string): string {
  const match = output.match(/Created new pane:\s*(.+)/)
  if (match && match[1]) {
    return match[1].trim()
  }
  return ''
}

/**
 * La sesión del líder, de la variable que iTerm2 pone en el entorno.
 *
 * Su forma es `ventana:sesión`, y sólo la mitad de después de los dos puntos
 * nombra una sesión: pasarla entera nombra algo que no existe y el corte sale
 * en el sitio equivocado.
 */
function getLeaderSessionId(): string | null {
  const itermSessionId = process.env.ITERM_SESSION_ID
  if (!itermSessionId) {
    return null
  }
  const colonIndex = itermSessionId.indexOf(':')
  if (colonIndex === -1) {
    return null
  }
  return itermSessionId.slice(colonIndex + 1)
}

export class ITermBackend implements PaneBackend {
  readonly type = 'iterm2' as const
  readonly displayName = 'iTerm2'
  readonly supportsHideShow = false

  async isAvailable(): Promise<boolean> {
    const inITerm2 = isInITerm2()
    logForDebugging(`[ITermBackend] isAvailable check: inITerm2=${inITerm2}`)
    // Fuera de iTerm2 no se pregunta por `it2`: la respuesta no cambiaría el
    // veredicto y cuesta un subproceso.
    if (!inITerm2) {
      logForDebugging('[ITermBackend] isAvailable: false (not in iTerm2)')
      return false
    }
    const it2Available = await isIt2CliAvailable()
    logForDebugging(
      `[ITermBackend] isAvailable: ${it2Available} (it2 CLI ${it2Available ? 'found' : 'not found'})`,
    )
    return it2Available
  }

  async isRunningInside(): Promise<boolean> {
    const result = isInITerm2()
    logForDebugging(`[ITermBackend] isRunningInside: ${result}`)
    return result
  }

  /**
   * Crea el panel del compañero.
   *
   * RECUPERACIÓN AL FALLAR: si la sesión a la que se apunta está muerta —el
   * usuario cerró el panel, o el proceso se cayó— se poda y se reintenta con
   * la anterior. Es más barato que listar sesiones antes de cada engendro.
   *
   * El bucle está ACOTADO: cada reintento quita un elemento de la lista, y con
   * la lista vacía `firstPaneUsed` vuelve a false, así que la vuelta siguiente
   * ya no apunta a ningún compañero.
   */
  async createTeammatePaneInSwarmView(
    name: string,
    color: AgentColorName,
  ): Promise<CreatePaneResult> {
    logForDebugging(
      `[ITermBackend] createTeammatePaneInSwarmView called for ${name} with color ${color}`,
    )
    const releaseLock = await acquirePaneCreationLock()

    try {
      while (true) {
        const isFirstTeammate = !firstPaneUsed
        logForDebugging(
          `[ITermBackend] Creating pane: isFirstTeammate=${isFirstTeammate}, existingPanes=${teammateSessionIds.length}`,
        )

        let splitArgs: string[]
        let targetedTeammateId: string | undefined

        if (isFirstTeammate) {
          const leaderSessionId = getLeaderSessionId()
          if (leaderSessionId) {
            splitArgs = ['session', 'split', '-v', '-s', leaderSessionId]
            logForDebugging(
              `[ITermBackend] First split from leader session: ${leaderSessionId}`,
            )
          } else {
            splitArgs = ['session', 'split', '-v']
            logForDebugging(
              '[ITermBackend] First split from active session (no leader ID)',
            )
          }
        } else {
          targetedTeammateId = teammateSessionIds[teammateSessionIds.length - 1]
          if (targetedTeammateId) {
            splitArgs = ['session', 'split', '-s', targetedTeammateId]
            logForDebugging(
              `[ITermBackend] Subsequent split from teammate session: ${targetedTeammateId}`,
            )
          } else {
            splitArgs = ['session', 'split']
            logForDebugging(
              '[ITermBackend] Subsequent split from active session (no teammate ID)',
            )
          }
        }

        const splitResult = await runIt2(splitArgs)

        if (splitResult.code !== 0) {
          if (targetedTeammateId) {
            // Antes de podar hay que CONFIRMAR que la sesión murió. Un fallo
            // sistémico —API apagada, `it2` retirado, socket caído— hace
            // fallar todos los cortes, y podar por él vaciaría la lista de
            // sesiones vivas por algo que no es de ninguna de ellas.
            const listResult = await runIt2(['session', 'list'])
            if (
              listResult.code === 0 &&
              !listResult.stdout.includes(targetedTeammateId)
            ) {
              logForDebugging(
                `[ITermBackend] Split failed targeting dead session ${targetedTeammateId}, pruning and retrying: ${splitResult.stderr}`,
              )
              const idx = teammateSessionIds.indexOf(targetedTeammateId)
              if (idx !== -1) {
                teammateSessionIds.splice(idx, 1)
              }
              if (teammateSessionIds.length === 0) {
                firstPaneUsed = false
              }
              continue
            }
          }
          throw new Error(
            `Failed to create iTerm2 split pane: ${splitResult.stderr}`,
          )
        }

        if (isFirstTeammate) {
          firstPaneUsed = true
        }

        const paneId = parseSplitOutput(splitResult.stdout)

        if (!paneId) {
          throw new Error(
            `Failed to parse session ID from split output: ${splitResult.stdout}`,
          )
        }
        logForDebugging(
          `[ITermBackend] Created teammate pane for ${name}: ${paneId}`,
        )

        teammateSessionIds.push(paneId)

        return { paneId, isFirstTeammate }
      }
    } finally {
      releaseLock()
    }
  }

  /**
   * Manda una orden al panel.
   *
   * Siempre con `-s`: sin él la orden va a «la activa», que es donde el
   * usuario tenga el foco en ese instante.
   */
  async sendCommandToPane(
    paneId: PaneId,
    command: string,
    _useExternalSession?: boolean,
  ): Promise<void> {
    const args = paneId
      ? ['session', 'run', '-s', paneId, command]
      : ['session', 'run', command]

    const result = await runIt2(args)

    if (result.code !== 0) {
      throw new Error(
        `Failed to send command to iTerm2 pane ${paneId}: ${result.stderr}`,
      )
    }
  }

  /** No-op: ver la cabecera. */
  async setPaneBorderColor(
    _paneId: PaneId,
    _color: AgentColorName,
    _useExternalSession?: boolean,
  ): Promise<void> {}

  /** No-op: ver la cabecera. */
  async setPaneTitle(
    _paneId: PaneId,
    _name: string,
    _color: AgentColorName,
    _useExternalSession?: boolean,
  ): Promise<void> {}

  /** No-op: iTerm2 muestra el título en la pestaña, sin borde que encender. */
  async enablePaneBorderStatus(
    _windowTarget?: string,
    _useExternalSession?: boolean,
  ): Promise<void> {}

  /** No-op: iTerm2 reparte sus paneles solo. */
  async rebalancePanes(
    _windowTarget: string,
    _hasLeader: boolean,
  ): Promise<void> {
    logForDebugging(
      '[ITermBackend] Pane rebalancing not implemented for iTerm2',
    )
  }

  /**
   * Cierra el panel y olvida su sesión.
   *
   * `-f` es obligatorio: sin él, iTerm2 respeta su preferencia de «confirmar
   * antes de cerrar» y se queda esperando a un humano que no está mirando —el
   * shell siempre cuenta como proceso en marcha—. `kill-pane` de tmux no
   * pregunta, y por eso el defecto sólo se daba aquí.
   */
  async killPane(
    paneId: PaneId,
    _useExternalSession?: boolean,
  ): Promise<boolean> {
    const result = await runIt2(['session', 'close', '-f', '-s', paneId])

    // El estado se limpia PASE LO QUE PASE: si el panel ya no estaba —lo cerró
    // el usuario— quitar el identificador rancio es igual de correcto.
    const idx = teammateSessionIds.indexOf(paneId)
    if (idx !== -1) {
      teammateSessionIds.splice(idx, 1)
    }
    if (teammateSessionIds.length === 0) {
      firstPaneUsed = false
    }

    return result.code === 0
  }

  /** No soportado: iTerm2 no tiene equivalente de `break-pane`. */
  async hidePane(
    _paneId: PaneId,
    _useExternalSession?: boolean,
  ): Promise<boolean> {
    logForDebugging('[ITermBackend] hidePane not supported in iTerm2')
    return false
  }

  /** No soportado: iTerm2 no tiene equivalente de `join-pane`. */
  async showPane(
    _paneId: PaneId,
    _targetWindowOrPane: string,
    _useExternalSession?: boolean,
  ): Promise<boolean> {
    logForDebugging('[ITermBackend] showPane not supported in iTerm2')
    return false
  }
}

/** Borra el estado de módulo. Sólo para pruebas — ver la cabecera. */
export function _test_resetITermBackendState(): void {
  teammateSessionIds.length = 0
  firstPaneUsed = false
  paneCreationLock = Promise.resolve()
}

// Efecto de módulo DELIBERADO: ver la cabecera de `registry.ts`.
registerITermBackend(ITermBackend)
