/**
 * Puerto de `ccnmt: packages/memory/src/memdir/memoryScan.ts`, con
 * `parseFrontmatter` y `readFileInRange` desde el sustituto local
 * `../internal/pendingCrossPackageDeps.js` — ver su docstring de
 * procedencia (ninguno de los dos paquetes de origen,
 * `@claude-code-how-works/agent` y `@claude-code-how-works/repl`, tiene
 * portados esos símbolos en `@thyrox`).
 *
 * Primitivas de escaneo de directorio de memoria. Separado de
 * findRelevantMemories.ts para que extractMemories pueda importar el
 * escaneo sin arrastrar sideQuery y la cadena del cliente de API (que
 * cerraba un ciclo por memdir.ts — #25372).
 */

import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { parseFrontmatter, readFileInRange } from '../internal/pendingCrossPackageDeps.js'
import { type MemoryType, parseMemoryType } from '../memoryTypes.js'

export type MemoryHeader = {
  filename: string
  filePath: string
  mtimeMs: number
  description: string | null
  type: MemoryType | undefined
}

const MAX_MEMORY_FILES = 200
const FRONTMATTER_MAX_LINES = 30

/**
 * Escanea un directorio de memoria en busca de archivos .md, lee su
 * frontmatter, y devuelve una lista de encabezados ordenada de más nuevo a
 * más viejo (acotada a MAX_MEMORY_FILES). Compartido por
 * findRelevantMemories (recall en tiempo de query) y extractMemories
 * (pre-inyecta el listado para que el agente de extracción no gaste un
 * turno en `ls`).
 *
 * Un solo paso: readFileInRange hace stat internamente y devuelve mtimeMs,
 * así que leemos y luego ordenamos en vez de stat-ordenar-leer. Para el
 * caso común (N ≤ 200) esto reduce a la mitad las syscalls frente a una
 * ronda de stat separada; para N grande leemos algunos archivos pequeños
 * de más pero aun así evitamos el doble-stat en los 200 sobrevivientes.
 */
export async function scanMemoryFiles(
  memoryDir: string,
  signal: AbortSignal,
): Promise<MemoryHeader[]> {
  try {
    const entries = await readdir(memoryDir, { recursive: true })
    const mdFiles = entries.filter(
      f => f.endsWith('.md') && basename(f) !== 'MEMORY.md',
    )

    const headerResults = await Promise.allSettled(
      mdFiles.map(async (relativePath): Promise<MemoryHeader> => {
        const filePath = join(memoryDir, relativePath)
        const { content, mtimeMs } = await readFileInRange(
          filePath,
          0,
          FRONTMATTER_MAX_LINES,
          undefined,
          signal,
        )
        const { frontmatter } = parseFrontmatter(content, filePath)
        return {
          filename: relativePath,
          filePath,
          mtimeMs,
          description: frontmatter.description || null,
          type: parseMemoryType(frontmatter.type),
        }
      }),
    )

    return headerResults
      .filter(
        (r): r is PromiseFulfilledResult<MemoryHeader> =>
          r.status === 'fulfilled',
      )
      .map(r => r.value)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, MAX_MEMORY_FILES)
  } catch {
    return []
  }
}

/**
 * Formatea encabezados de memoria como un manifiesto de texto: una línea
 * por archivo con [tipo] filename (timestamp): description. Lo usan tanto
 * el prompt del selector de recall como el prompt del agente de
 * extracción.
 */
export function formatMemoryManifest(memories: MemoryHeader[]): string {
  return memories
    .map(m => {
      const tag = m.type ? `[${m.type}] ` : ''
      const ts = new Date(m.mtimeMs).toISOString()
      return m.description
        ? `- ${tag}${m.filename} (${ts}): ${m.description}`
        : `- ${tag}${m.filename} (${ts})`
    })
    .join('\n')
}
