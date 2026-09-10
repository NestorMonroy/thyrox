/**
 * Puerto de `ccnmt: packages/config/global/constants.ts` (48 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * Las tres constantes (`NOTIFICATION_CHANNELS`, `EDITOR_MODES`,
 * `TEAMMATE_MODES`) están DUPLICADAS a propósito respecto de
 * `../configConstants.ts` (ya portado en este mismo pase) — mismo criterio
 * de duplicación deliberada que `internal/signal.ts` frente a
 * `../signal.ts`: la fuente evita dependencias circulares repitiendo estas
 * tres constantes en dos archivos en vez de que uno importe al otro.
 *
 * El literal `'ccb'` de `getInvokedBinaryName()` es el nombre de fallback
 * de la propia fuente (su fork de Claude Code se distribuye como binario
 * `ccb`) — se conserva tal cual porque describe el comportamiento de
 * fallback de LA FUENTE, no un nombre inventado para este árbol.
 */

// Estas constantes viven en un archivo aparte para evitar problemas de
// dependencia circular. NO añadir imports a este archivo — debe permanecer
// libre de dependencias.

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

/**
 * Devuelve el nombre con el que el usuario invocó el CLI (p. ej. "ccb", "claude").
 *
 * Se usa para cadenas de cara al usuario tipo "Resume this session with:
 * <name> --resume". Las cadenas decompiladas de ant tienen "claude"
 * hardcodeado; ccb se distribuye como `ccb`.
 *
 * Orden de preferencia:
 *  1. `process.argv0` — lo que vio la shell (coincide con el symlink que
 *     el usuario tecleó). Para binarios standalone de `bun build --compile`
 *     esto es "ccb".
 *  2. basename de `process.argv[1]` — fallback de script-bun y modo dev.
 *  3. Fallback duro "ccb" — esto es un fork de ccb; cosmético, no load-bearing.
 *
 * Se descartan: nombres de runner de bun ("bun", "node"), nombres de
 * archivo de entrada TypeScript ("cli.tsx") — no son nombres de invocación
 * de cara al usuario.
 */
export function getInvokedBinaryName(): string {
  const candidates = [process.argv0, process.argv[1]]
  for (const raw of candidates) {
    if (!raw) continue
    const base = raw.split('/').pop()?.replace(/\.(tsx?|jsx?|exe)$/, '') ?? ''
    if (!base) continue
    if (base === 'bun' || base === 'node' || base === 'cli') continue
    return base
  }
  return 'ccb'
}
