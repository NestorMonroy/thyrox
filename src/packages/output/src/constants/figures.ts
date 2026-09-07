/**
 * Puerto de `ccnmt: packages/output/src/constants/figures.ts` (verbatim —
 * sin imports en la fuente). Glifos/indicadores unicode que el resto del
 * paquete (y del REPL, cuando se porte) usa para pintar estado en la
 * terminal.
 */

// El primero se ve mejor alineado verticalmente, pero no suele soportarse
// en Windows/Linux
export const BLACK_CIRCLE = process.platform === 'darwin' ? '⏺' : '●'
export const BULLET_OPERATOR = '∙'
export const TEARDROP_ASTERISK = '✻'
export const UP_ARROW = '↑' // ↑ - usado en el aviso de merge de opus 1m
export const DOWN_ARROW = '↓' // ↓ - usado como hint de scroll
export const LIGHTNING_BOLT = '↯' // ↯ - usado en el indicador de fast mode
export const EFFORT_LOW = '○' // ○ - nivel de esfuerzo: low
export const EFFORT_MEDIUM = '◐' // ◐ - nivel de esfuerzo: medium
export const EFFORT_HIGH = '●' // ● - nivel de esfuerzo: high
export const EFFORT_MAX = '◉' // ◉ - nivel de esfuerzo: max (solo Opus 4.7/4.6)

// Glifo indicador de goal — ant `UC_` (U+25CE CIRCLED BULLET). Lo usan el
// footer pill de `/goal active` y el titulo del panel "Goal active".
// Distinto de BLACK_CIRCLE para que el usuario distinga un indicador de
// goal de un punto de turno del asistente de un vistazo.
export const CIRCLED_BULLET = '◎' // ◎

// Indicadores de estado de media/trigger
export const PLAY_ICON = '▶' // ▶
export const PAUSE_ICON = '⏸' // ⏸

// Indicadores de suscripcion MCP
export const REFRESH_ARROW = '↻' // ↻ - indicador de actualizacion de recurso
export const CHANNEL_ARROW = '←' // ← - indicador de mensaje de canal entrante
export const INJECTED_ARROW = '→' // → - indicador de mensaje inyectado cross-session
export const FORK_GLYPH = '⑂' // ⑂ - indicador de directiva de fork

// Indicadores de estado de revision (estados diamante de ultrareview)
export const DIAMOND_OPEN = '◇' // ◇ - corriendo
export const DIAMOND_FILLED = '◆' // ◆ - completado/fallido
export const REFERENCE_MARK = '※' // ※ - komejirushi, marcador de recap away-summary

// Indicador de flag de issue
export const FLAG_ICON = '⚑' // ⚑ - usado en el banner de flag de issue

// Indicador de blockquote
export const BLOCKQUOTE_BAR = '▎' // ▎ - bloque de un cuarto izquierdo, prefijo de linea de blockquote
export const HEAVY_HORIZONTAL = '━' // ━ - horizontal pesado de box-drawing

// Indicadores de estado de bridge
export const BRIDGE_SPINNER_FRAMES = [
  '·|·',
  '·/·',
  '·—·',
  '·\\·',
]
export const BRIDGE_READY_INDICATOR = '·✔︎·'
export const BRIDGE_FAILED_INDICATOR = '×'
