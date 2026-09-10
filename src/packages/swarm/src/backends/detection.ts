/**
 * Dónde está corriendo esta sesión: tmux, iTerm2, y qué herramientas hay.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/detection.ts` (128 líneas,
 * 7 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * DOS DECISIONES QUE PARECEN DETALLES Y NO LO SON:
 *
 * 1. **La variable de tmux se captura al CARGAR el módulo y no se relee.** La
 *    capa de shell la sobrescribe cuando inicializa su propio socket, así que
 *    releerla más tarde daría un falso positivo: diría «estamos dentro de
 *    tmux» cuando lo único cierto es que nosotros arrancamos uno.
 * 2. **Estar dentro de tmux se decide SÓLO por esa variable.** Preguntarle al
 *    propio tmux —`display-message`— tiene éxito si hay CUALQUIER servidor
 *    corriendo en la máquina, no si este proceso está dentro de uno.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { env, execFileNoThrow } from '../adapters/appRuntime.js'
import { TMUX_COMMAND } from '../core/constants.js'

/** La variable de tmux tal como la puso el usuario, antes de que nadie la toque. */
const ORIGINAL_USER_TMUX = process.env.TMUX

/**
 * El panel de tmux del líder, capturado al arrancar.
 *
 * Se guarda ahora porque el usuario puede cambiar de panel después, y entonces
 * ya no habría forma de saber cuál era el suyo.
 */
const ORIGINAL_TMUX_PANE = process.env.TMUX_PANE

let isInsideTmuxCached: boolean | null = null
let isInITerm2Cached: boolean | null = null

/** Si esta sesión arrancó dentro de tmux. Versión síncrona. */
export function isInsideTmuxSync(): boolean {
  return !!ORIGINAL_USER_TMUX
}

/**
 * Si esta sesión arrancó dentro de tmux.
 *
 * El resultado se cachea: no puede cambiar durante la vida del proceso, porque
 * su insumo se congeló al cargar el módulo.
 */
export async function isInsideTmux(): Promise<boolean> {
  if (isInsideTmuxCached !== null) return isInsideTmuxCached
  isInsideTmuxCached = !!ORIGINAL_USER_TMUX
  return isInsideTmuxCached
}

/** El panel del líder, o `null` si no estamos dentro de tmux. */
export function getLeaderPaneId(): string | null {
  return ORIGINAL_TMUX_PANE || null
}

/**
 * Si tmux está instalado y alcanzable.
 *
 * Se mide EJECUTÁNDOLO: que exista un binario con ese nombre en la ruta no
 * garantiza que corra.
 */
export async function isTmuxAvailable(): Promise<boolean> {
  const result = await execFileNoThrow(TMUX_COMMAND, ['-V'])
  return result.code === 0
}

/**
 * Si estamos dentro de iTerm2.
 *
 * Tres indicadores, en OR: no todos están puestos en todas las versiones ni
 * sobreviven a todos los shells intermedios, así que exigir uno concreto daría
 * falsos negativos.
 *
 * El respaldo de iTerm2 usa AppleScript, que viene con el sistema: no hace
 * falta instalar nada aparte.
 */
export function isInITerm2(): boolean {
  if (isInITerm2Cached !== null) return isInITerm2Cached

  const termProgram = process.env.TERM_PROGRAM
  const hasItermSessionId = !!process.env.ITERM_SESSION_ID
  const terminalIsITerm = env.terminal === 'iTerm.app'

  isInITerm2Cached =
    termProgram === 'iTerm.app' || hasItermSessionId || terminalIsITerm
  return isInITerm2Cached
}

/** El nombre del comando de línea de iTerm2. */
export const IT2_COMMAND = 'it2'

/**
 * Si el comando de línea de iTerm2 está y además alcanza su API.
 *
 * Se prueba con `session list` y NO con `--version`: la versión responde
 * aunque la API esté deshabilitada en las preferencias del terminal, y
 * entonces el comando que de verdad importa —dividir un panel— falla más tarde
 * y sin plan B.
 */
export async function isIt2CliAvailable(): Promise<boolean> {
  const result = await execFileNoThrow(IT2_COMMAND, ['session', 'list'])
  return result.code === 0
}

/** Borra los resultados cacheados. Sólo para pruebas. */
export function resetDetectionCache(): void {
  isInsideTmuxCached = null
  isInITerm2Cached = null
}
