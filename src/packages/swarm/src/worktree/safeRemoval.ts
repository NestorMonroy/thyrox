/**
 * Limpieza segura de reparse points de Windows antes de eliminar un
 * worktree — porte de
 * `ccnmt: packages/swarm/src/worktree/safeRemoval.ts`.
 *
 * Porte VERBATIM: sólo depende de `node:fs/promises` y `node:path`.
 */
import { lstat, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Desenlaza junctions/symlinks de Windows antes de que git elimine
 * recursivamente un worktree.
 */
export async function unlinkWindowsReparsePoints(root: string): Promise<void> {
  if (process.platform !== 'win32') return
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  await Promise.all(
    entries.map(async entry => {
      const path = join(root, entry.name)
      const info = await lstat(path).catch(() => null)
      if (!info) return
      if (info.isSymbolicLink()) {
        await unlink(path).catch(() => {})
      } else if (info.isDirectory()) {
        await unlinkWindowsReparsePoints(path)
      }
    }),
  )
}
