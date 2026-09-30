// Only TEAM_LEAD_NAME is consumed via this barrel; the other 5 exports
// from '../types/constants.js' had no callers and were dropped 2026-04-29.
// Importers that want the dropped constants should reach into
// '../types/constants.js' directly.
export { TEAM_LEAD_NAME } from '../types/constants.js'

// Constantes del swarm de `chunk-q8a07cv0.js` (2.1.283). La variable del
// comando del compañero lleva el prefijo THYROX_ en lugar de CLAUDE_.

/** `uJ`: la sesión de tmux que aloja el swarm. */
export const SWARM_SESSION_NAME = 'claude-swarm'
/** `sFt`: la ventana de vista del swarm dentro de esa sesión. */
export const SWARM_VIEW_WINDOW_NAME = 'swarm-view'
/** `pJ`: el ejecutable de tmux. */
export const TMUX_COMMAND = 'tmux'
/**
 * `vFe`: la orden que ocupa un panel recién creado. La referencia la pasa tras
 * `--` en `new-session` y `new-window`, de modo que el panel no abre un shell.
 */
export const SWARM_PANE_PLACEHOLDER_COMMAND = 'cat'
export const HIDDEN_SESSION_NAME = 'claude-hidden'

/** `iFt`: el socket de tmux propio de este proceso. */
export function getSwarmSocketName(): string {
  return `${SWARM_SESSION_NAME}-${process.pid}`
}

/** `iLo`: la variable que sustituye la orden con que se lanza un compañero. */
export const TEAMMATE_COMMAND_ENV_VAR = 'THYROX_CODE_TEAMMATE_COMMAND'
/** `sLo`: el nombre de un compañero, direccionable por SendMessage. */
export const TEAMMATE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
export const TEAMMATE_COLOR_ENV_VAR = 'THYROX_CODE_AGENT_COLOR'
export const PLAN_MODE_REQUIRED_ENV_VAR = 'THYROX_CODE_PLAN_MODE_REQUIRED'
