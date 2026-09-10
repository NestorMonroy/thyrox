/**
 * Porte PARCIAL, declarado, de `ccnmt: packages/storage/src/claudemd.ts`
 * (48 248 bytes fuente).
 *
 * La fuente descubre y carga jerarquías completas de CLAUDE.md (Managed →
 * User → Project → Local, con directivas `@include`, frontmatter `paths:`
 * y truncado de `MEMORY.md`) y expone ~20 símbolos. Los tests de este pase
 * (`claudemd.behavior.test.ts`, `claudemdHelpers.test.ts`) ejercitan **7**:
 * los dos constantes (`MAX_MEMORY_CHARACTER_COUNT`,
 * `POLICY_HELPER_CLAUDE_MD_SENTINEL`), el tipo `MemoryFileInfo`/`MemoryType`,
 * y las cuatro funciones puras `stripHtmlComments`, `isMemoryFilePath`,
 * `getLargeMemoryFiles`, `filterInjectedMemoryFiles`. El resto —descubrimiento
 * de archivos, `@include`, frontmatter, truncado de MEMORY.md, y las ~13
 * funciones que dependen de I/O y de paquetes hermanos ausentes en este árbol
 * (`@claude-code-how-works/{app-host,memory,config}`)— **no se porta**, y
 * queda declarado aquí, no en silencio.
 *
 * Dos divergencias, ambas por ausencia de dependencia externa:
 *
 * - `stripHtmlComments` — la fuente usa el `Lexer` de `marked` (CommonMark)
 *   para distinguir comentarios a nivel de bloque de los que van dentro de
 *   un bloque de código cercado/indentado. `marked` no está instalado en
 *   este monorepo y la regla del proyecto prohíbe instalar dependencias
 *   externas sin decisión del ejecutor. Se reimplementa aquí con una
 *   máquina de estados propia línea a línea que reconoce cercas ``` / ~~~,
 *   código indentado (≥4 espacios o tab) y comentarios de bloque que
 *   empiezan tras ≤3 espacios de indentación — el mismo contrato que exige
 *   la CASO comparable de CommonMark para un HTML block tipo 2, y suficiente
 *   para las 12 formas que los tests ejercitan (bloque simple, multilínea,
 *   dos comentarios, residuo tras `-->`, comentario inline en párrafo,
 *   dentro de cerca, dentro de indentado, sin cerrar, vacío, sólo comentario,
 *   CRLF sin comentario). No cubre casos fuera de esas 12 formas (p. ej.
 *   comentarios que empiezan a media línea tras texto NO trivial antes del
 *   `<!--`, que la fuente tampoco trataría como bloque).
 * - `filterInjectedMemoryFiles` — la fuente lee la bandera
 *   `tengu_moth_copse` vía `getFeatureValue_CACHED_MAY_BE_STALE` de
 *   `@claude-code-how-works/config/feature-flags`, ausente aquí. Se sustituye
 *   por una función local que siempre devuelve el valor por defecto (`false`)
 *   — el mismo comportamiento que el test fija ("es un no-op cuando la
 *   bandera es false, el default").
 */

/** Subconjunto de tipos de memoria que este porte necesita declarar. */
export type MemoryType = 'User' | 'Project' | 'Local' | 'Managed' | 'AutoMem' | 'TeamMem'

// Recommended max character count for a memory file
export const MAX_MEMORY_CHARACTER_COUNT = 40000

/**
 * Sentinel "path" usado para la entrada Managed sintética que viene del
 * campo `claudeMd` del envelope de policyHelper. Puerto fiel de
 * `ant H6H = "<policyHelper>"` (0687.js). Empieza con `<` para que el
 * código de manejo de rutas río abajo (que sólo se preocupa de rutas de
 * filesystem reales) la trate como un marcador no-archivo.
 */
export const POLICY_HELPER_CLAUDE_MD_SENTINEL = '<policyHelper>'

export type MemoryFileInfo = {
  path: string
  type: MemoryType
  content: string
  parent?: string
  globs?: string[]
  contentDiffersFromDisk?: boolean
  rawContent?: string
}

/**
 * Strip block-level HTML comments (<!-- ... -->) from markdown content.
 *
 * Reconoce comentarios a nivel de bloque (línea que empieza, tras ≤3
 * espacios, con `<!--`), que pueden extenderse por varias líneas hasta el
 * primer `-->`. Preserva: comentarios inline dentro de un párrafo (el `<!--`
 * no está al inicio de línea), comentarios dentro de bloques de código
 * cercados (``` / ~~~) o indentados (≥4 espacios / tab), y comentarios sin
 * cerrar (se dejan intactos, `stripped` queda `false` para ese tramo).
 */
export function stripHtmlComments(content: string): {
  content: string
  stripped: boolean
} {
  if (!content.includes('<!--')) {
    return { content, stripped: false }
  }

  const lines = content.split(/(?<=\n)/)
  const out: string[] = []
  let stripped = false
  let inFence = false
  let fenceChar = ''
  let fenceLen = 0

  const fenceOpenRe = /^ {0,3}(`{3,}|~{3,})/
  const indentedRe = /^(?: {4,}|\t)/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string

    if (inFence) {
      out.push(line)
      const closeMatch = line.match(fenceOpenRe)
      if (
        closeMatch &&
        closeMatch[1]?.[0] === fenceChar &&
        closeMatch[1].length >= fenceLen
      ) {
        inFence = false
      }
      continue
    }

    const fenceOpenMatch = line.match(fenceOpenRe)
    if (fenceOpenMatch?.[1]) {
      inFence = true
      fenceChar = fenceOpenMatch[1][0] as string
      fenceLen = fenceOpenMatch[1].length
      out.push(line)
      continue
    }

    if (indentedRe.test(line)) {
      out.push(line)
      continue
    }

    const trimmedStart = line.replace(/^ {0,3}/, '')
    if (trimmedStart.startsWith('<!--')) {
      let span = line
      let j = i
      let closeIdx = span.indexOf('-->', span.indexOf('<!--') + 4)
      while (closeIdx === -1 && j + 1 < lines.length) {
        j++
        const nextLine = lines[j] as string
        span += nextLine
        closeIdx = span.indexOf('-->', span.length - nextLine.length)
      }

      if (closeIdx === -1) {
        // Unclosed: a typo doesn't silently swallow the rest of the file —
        // leave everything from here to the end untouched.
        for (let k = i; k < lines.length; k++) out.push(lines[k] as string)
        break
      }

      const startIdx = span.indexOf('<!--')
      const endIdx = closeIdx + 3
      const residue = span.slice(endIdx)
      stripped = true
      if (residue.trim().length > 0) {
        out.push(residue)
      }
      void startIdx // el prefijo antes de "<!--" es sólo indentación (≤3 espacios); se descarta
      i = j
      continue
    }

    out.push(line)
  }

  return { content: out.join(''), stripped }
}

/**
 * Check if a file path is a memory file (CLAUDE.md, CLAUDE.local.md, or
 * .claude/rules/*.md).
 */
export function isMemoryFilePath(filePath: string): boolean {
  if (!filePath) return false
  const name = filePath.split(/[\\/]/).pop() ?? ''

  if (name === 'CLAUDE.md' || name === 'CLAUDE.local.md') {
    return true
  }

  if (
    name.endsWith('.md') &&
    (filePath.includes('/.claude/rules/') || filePath.includes('\\.claude\\rules\\'))
  ) {
    return true
  }

  return false
}

export function getLargeMemoryFiles(files: MemoryFileInfo[]): MemoryFileInfo[] {
  return files.filter(f => f.content.length > MAX_MEMORY_CHARACTER_COUNT)
}

/**
 * Sustituto local de `getFeatureValue_CACHED_MAY_BE_STALE` — este árbol no
 * tiene el sistema real de feature-flags de la fuente, así que siempre
 * devuelve el valor por defecto que pasa el llamador.
 */
function getFeatureValueDefaultOnly<T>(_key: string, fallback: T): T {
  return fallback
}

/**
 * When tengu_moth_copse is on, the findRelevantMemories prefetch surfaces
 * memory files via attachments, so the MEMORY.md index is no longer
 * injected into the system prompt. Callsites that care about "what's
 * actually in context" should filter through this.
 */
export function filterInjectedMemoryFiles(
  files: MemoryFileInfo[],
): MemoryFileInfo[] {
  const skipMemoryIndex = getFeatureValueDefaultOnly('tengu_moth_copse', false)
  if (!skipMemoryIndex) return files
  return files.filter(f => f.type !== 'AutoMem' && f.type !== 'TeamMem')
}
