/**
 * El modo de compañero se CONGELA al arrancar la sesión, y no se relee.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/teammateModeSnapshot.ts`
 * (87 líneas, 6 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * POR QUÉ CONGELARLO. Una sesión que ya lanzó compañeros en un modo no puede
 * pasar a otro a mitad de camino: los que arrancó quedarían huérfanos, porque
 * quien los supervisa busca en el sitio del modo nuevo. Leer la configuración
 * en cada uso convertiría un cambio del usuario en una sesión partida en dos.
 *
 * LA PRECEDENCIA: el override de línea de comandos gana a la configuración. Es
 * lo esperable — el que escribe una bandera está diciendo «esta vez, así».
 *
 * DIVERGENCIA DECLARADA: se añade `_test_resetTeammateModeSnapshot`, que la
 * fuente no tiene. El estado vive en variables de módulo y el corredor de
 * pruebas comparte el módulo entre casos del mismo proceso; sin un reseteo, el
 * primer caso que capture decide el veredicto de todos los demás — y entonces
 * la suite mediría el orden de los casos, no la conducta del módulo.
 */
import {
  getGlobalConfig,
  logError,
  logForDebugging,
} from '../adapters/appRuntime.js'

export type TeammateMode = 'auto' | 'tmux' | 'in-process'

/** El modo capturado al arrancar. `null` significa «todavía no se capturó». */
let initialTeammateMode: TeammateMode | null = null

/** El override de línea de comandos, si lo hubo. */
let cliTeammateModeOverride: TeammateMode | null = null

/**
 * Declara el override de línea de comandos.
 *
 * Se llama ANTES de capturar: después ya no tendría efecto sobre el modo de
 * esta sesión, que es justo lo que el congelado garantiza.
 */
export function setCliTeammateModeOverride(mode: TeammateMode): void {
  cliTeammateModeOverride = mode
}

/** El override vigente, o `null` si nadie lo declaró. */
export function getCliTeammateModeOverride(): TeammateMode | null {
  return cliTeammateModeOverride
}

/**
 * Retira el override y fija el modo nuevo.
 *
 * Se llama cuando el usuario cambia el ajuste desde la interfaz: su elección
 * debe tomar efecto pese al congelado, porque la hizo a sabiendas.
 *
 * El modo nuevo llega POR ARGUMENTO y no releyendo la configuración: entre que
 * el usuario la escribe y este código la leería cabe otra escritura, y
 * entonces se aplicaría una elección que nadie hizo.
 */
export function clearCliTeammateModeOverride(newMode: TeammateMode): void {
  cliTeammateModeOverride = null
  initialTeammateMode = newMode
  logForDebugging(
    `[TeammateModeSnapshot] CLI override cleared, new mode: ${newMode}`,
  )
}

/**
 * Captura el modo de esta sesión. Se llama una vez, temprano, tras analizar
 * los argumentos de la línea de comandos.
 */
export function captureTeammateModeSnapshot(): void {
  if (cliTeammateModeOverride) {
    initialTeammateMode = cliTeammateModeOverride
    logForDebugging(
      `[TeammateModeSnapshot] Captured from CLI override: ${initialTeammateMode}`,
    )
    return
  }
  const config = getGlobalConfig()
  initialTeammateMode = config.teammateMode ?? 'auto'
  logForDebugging(
    `[TeammateModeSnapshot] Captured from config: ${initialTeammateMode}`,
  )
}

/**
 * El modo de esta sesión, ignorando cualquier cambio posterior de la
 * configuración.
 *
 * Llegar aquí sin haber capturado es un defecto de orden de arranque, y se
 * registra como tal — pero se captura y se devuelve un modo válido igualmente:
 * derribar la sesión por el orden en que se inicializó sería peor que el
 * defecto que denuncia.
 */
export function getTeammateModeFromSnapshot(): TeammateMode {
  if (initialTeammateMode === null) {
    logError(
      new Error(
        'getTeammateModeFromSnapshot called before capture - this indicates an initialization bug',
      ),
    )
    captureTeammateModeSnapshot()
  }
  return initialTeammateMode ?? 'auto'
}

/** Devuelve el módulo a su estado sin capturar. Sólo para pruebas. */
export function _test_resetTeammateModeSnapshot(): void {
  initialTeammateMode = null
  cliTeammateModeOverride = null
}
