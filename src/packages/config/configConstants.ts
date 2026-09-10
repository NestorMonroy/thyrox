/**
 * Puerto de `ccnmt: packages/config/configConstants.ts` (21 líneas fuente).
 * Reimplementación fiel VERBATIM.
 *
 * Estas constantes viven en un archivo aparte para evitar problemas de
 * dependencia circular. NO añadir imports a este archivo — debe permanecer
 * libre de dependencias.
 */

export const NOTIFICATION_CHANNELS = [
  'auto',
  'iterm2',
  'iterm2_with_bell',
  'terminal_bell',
  'kitty',
  'ghostty',
  'notifications_disabled',
] as const

// Modos de editor válidos (excluye el 'emacs' obsoleto, que se auto-migra a 'normal').
export const EDITOR_MODES = ['normal', 'vim'] as const

// Modos válidos de "teammate" para generar sub-procesos.
// 'tmux' = teammates tradicionales basados en tmux
// 'in-process' = teammates en proceso, corriendo en el mismo proceso
// 'auto' = elige automáticamente según el contexto (default)
export const TEAMMATE_MODES = ['auto', 'tmux', 'in-process'] as const
