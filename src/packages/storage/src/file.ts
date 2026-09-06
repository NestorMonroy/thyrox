/**
 * Porte PARCIAL, declarado, de `ccnmt: packages/storage/src/file.ts`.
 *
 * La fuente tiene 24 símbolos exportados (`pathExists`, `MAX_OUTPUT_SIZE`,
 * `readFileSafe`, `getFileModificationTime`,
 * `getFileModificationTimeAsync`, `writeTextContent`,
 * `detectFileEncoding` re-exportado, `detectLineEndings`,
 * `convertLeadingTabsToSpaces`, `getAbsoluteAndRelativePaths`,
 * `getDisplayPath`, `findSimilarFile`, `FILE_NOT_FOUND_CWD_NOTE`,
 * `suggestPathUnderCwd`, `isCompactLinePrefixEnabled`, `addLineNumbers`,
 * `stripLineNumberPrefix`, `isDirEmpty`, `readFileSyncCached`,
 * `writeFileSyncAndFlush`, `atomicWriteFile`, `getDesktopPath`,
 * `isFileWithinReadSizeLimit`, `normalizePathForComparison`,
 * `pathsEqual`) y una decena de imports de paquetes hermanos ausentes
 * en este árbol (`@claude-code-how-works/local-observability`,
 * `@claude-code-how-works/config/feature-flags`,
 * `@claude-code-how-works/app-host/bootstrap/cwd.js`,
 * `@claude-code-how-works/config/platform`) más vecinos de este mismo
 * paquete que ningún test de este pase ejercita (`./fileRead.js`,
 * `./fileReadCache.js`, `./fsOperations.js`, `./path.js`,
 * `./fileEncoding.js`).
 *
 * `__tests__/atomicWriteFile.test.ts` (el único de este pase que importa
 * `../file.js`) ejercita **1 de 24**: `atomicWriteFile`. Se porta sólo
 * ésa — el resto queda sin portar, declarado aquí, no en silencio. La
 * función en sí es autocontenida en la fuente (sólo usa `randomUUID` de
 * `node:crypto` y un `import('fs/promises')` dinámico), así que no
 * arrastra ninguna de las dependencias de paquete hermano de arriba.
 */
import { randomUUID } from 'crypto'

/**
 * Async crash-safe file write — temp+rename. If the process dies mid-write,
 * the destination retains its previous contents (the temp file is the only
 * one corrupted, and gets cleaned up by the next caller).
 *
 * Use this for state files (mailbox, team config, lock files) where a
 * partial write would silently lose data on next read.
 *
 * Async sibling of writeFileSyncAndFlush. Same atomicity guarantees but
 * non-blocking, suitable for hot paths.
 */
export async function atomicWriteFile(
  filePath: string,
  content: string,
): Promise<void> {
  const fsp = await import('fs/promises')
  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}.${randomUUID()}`
  try {
    await fsp.writeFile(tempPath, content, 'utf-8')
    await fsp.rename(tempPath, filePath)
  } catch (e) {
    // Clean up orphan temp file; ignore cleanup errors so we surface the
    // original write/rename failure to the caller.
    await fsp.unlink(tempPath).catch(() => {
      /* temp-file cleanup is best-effort; surface the original error instead */
    })
    throw e
  }
}
