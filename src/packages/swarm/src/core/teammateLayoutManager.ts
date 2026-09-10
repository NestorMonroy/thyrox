/**
 * La fachada de disposición: pedir un panel sin saber qué respaldo lo sirve.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/teammateLayoutManager.ts` (77
 * líneas, 6 símbolos exportados —tres de ellos reexportados—). Ese árbol
 * declara `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y
 * no se copia.
 *
 * No decide nada: `detectAndGetBackend()` ya eligió, y aquí sólo se delega.
 * Su valor es que el llamador no tenga que hablar con el registro.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import type { AgentColorName } from '../adapters/appRuntime.js'
import { detectAndGetBackend } from '../backends/registry.js'
import type { PaneBackend } from '../backends/types.js'

// La asignación de color se mudó a `./teammateColors.ts` porque cerraba un
// ciclo de tres archivos: `PaneBackendExecutor` → este módulo → el registro.
// Se reexporta por compatibilidad: hay código externo que la importa de aquí.
export {
  assignTeammateColor,
  clearTeammateColors,
  getTeammateColor,
} from './teammateColors.js'

/** El respaldo elegido. `detectAndGetBackend()` ya cachea; no se recachea. */
async function getBackend(): Promise<PaneBackend> {
  return (await detectAndGetBackend()).backend
}

/**
 * Si esta sesión arrancó dentro de tmux.
 *
 * La importación es diferida a propósito: `detection.ts` es barato pero este
 * módulo ya arrastra al registro, y no hace falta encadenarlos.
 */
export async function isInsideTmux(): Promise<boolean> {
  const { isInsideTmux: checkTmux } = await import('../backends/detection.js')
  return checkTmux()
}

/** Crea el panel del compañero en el respaldo que la detección eligió. */
export async function createTeammatePaneInSwarmView(
  teammateName: string,
  teammateColor: AgentColorName,
): Promise<{ paneId: string; isFirstTeammate: boolean }> {
  const backend = await getBackend()
  return backend.createTeammatePaneInSwarmView(teammateName, teammateColor)
}

/** Enciende el borde con estado de la ventana. */
export async function enablePaneBorderStatus(
  windowTarget?: string,
  useSwarmSocket = false,
): Promise<void> {
  const backend = await getBackend()
  return backend.enablePaneBorderStatus(windowTarget, useSwarmSocket)
}

/** Manda una orden a un panel. */
export async function sendCommandToPane(
  paneId: string,
  command: string,
  useSwarmSocket = false,
): Promise<void> {
  const backend = await getBackend()
  return backend.sendCommandToPane(paneId, command, useSwarmSocket)
}
