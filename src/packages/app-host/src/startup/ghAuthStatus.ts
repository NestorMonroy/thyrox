// Adaptación de @claude-code-how-works/app-host: src/startup/ghAuthStatus.ts.
// Capa 1 (con cita a `Bun.which`/`Bun.spawn`, globales del runtime Bun —
// no son paquete hermano).
//
// Divergencia declarada: la fuente usa `execa` (dependencia npm ausente
// en este árbol; instalarla está prohibido por la tarea) más
// `@claude-code-how-works/shell/which.js` — un módulo hermano que a su vez
// resuelve a `Bun.which` cuando corre bajo Bun (ver
// `ccnmt: packages/shell/src/which.ts:58-61`). Como este harness YA corre
// bajo Bun, se cita `Bun.which`/`Bun.spawn` directamente — es la misma ruta
// rápida que la fuente toma en el caso común, sin el paquete intermedio.

export type GhAuthStatus = 'authenticated' | 'not_authenticated' | 'not_installed'

/**
 * Estado de instalación + autenticación de `gh` CLI, para telemetría.
 *
 * Usa `Bun.which` primero (sin subproceso) para detectar la instalación,
 * y el código de salida de `gh auth token` para detectar la autenticación.
 * Se usa `auth token` en vez de `auth status` porque éste último hace una
 * petición de red a la API de GitHub, mientras que `auth token` sólo lee
 * config/keyring local. El stdout se ignora — el token nunca entra a este
 * proceso.
 */
export async function getGhAuthStatus(): Promise<GhAuthStatus> {
  const ghPath = Bun.which('gh')
  if (!ghPath) {
    return 'not_installed'
  }
  const proc = Bun.spawn(['gh', 'auth', 'token'], {
    stdout: 'ignore',
    stderr: 'ignore',
    signal: AbortSignal.timeout(5000),
  })
  const exitCode = await proc.exited
  return exitCode === 0 ? 'authenticated' : 'not_authenticated'
}
