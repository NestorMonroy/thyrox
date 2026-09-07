/**
 * Puerto de `ccnmt: packages/config/outputStyles.ts` (358 líneas fuente).
 * Los cuatro output styles integrados (default, Proactive, Explanatory,
 * Learning) más la carga de estilos personalizados desde markdown y de
 * plugins, y la resolución del estilo activo. Reimplementación fiel — los
 * prompts de los cuatro estilos se reproducen verbatim porque SON el
 * comportamiento (no hay forma de "reimplementar" un prompt sin cambiar lo
 * que Claude hace bajo ese estilo).
 *
 * `basename` de `path` es built-in. Repuntados vía `require()` diferido
 * (`./internal/pendingCrossPackageDeps.ts`, ya existentes en su paquete):
 * `getCwd` (app-host/bootstrap/cwd.js), `logForDebugging` (local-observability/debug.js),
 * `coerceDescriptionToString` (agent/frontmatterParser), `logError`
 * (local-observability/logging).
 *
 * `figures` (npm) — no instalado; sólo se usan `figures.star` y
 * `figures.bullet`, sustituidos por `figuresSubset` local (los mismos dos
 * glifos Unicode).
 *
 * `memoize` — `lodash-es` no instalado; sustituto local con el mismo
 * contrato (llave = primer argumento), igual que en `platform.ts`.
 *
 * BLOQUEADOS — el `require()` lanzará si se invoca:
 * - `extractDescriptionFromMarkdown`, `loadMarkdownFilesForSubdir` — de
 *   `@claude-code-how-works/tool-registry/markdownConfigLoader.js`. El
 *   paquete `tool-registry` NO EXISTE EN ABSOLUTO en este árbol (verificado
 *   con `ls src/packages/`) — no hay `@thyrox/tool-registry` que portar
 *   parcialmente. `getOutputStyleDirStyles` (el único llamador) queda
 *   bloqueado en consecuencia.
 * - `clearPluginOutputStyleCache`, `loadPluginOutputStyles` — de
 *   `./plugin/loadPluginOutputStyles.ts`, que no es uno de los 15 módulos
 *   del alcance.
 * - `getSettings` — de `./settings/settings.ts`, el mismo bloqueo de
 *   `managedEnv.ts` (ver su docstring: es el caso `@thyrox/config/settings`
 *   del brief, sin `settings/index.ts` en la fuente).
 *
 * `type OutputStyle` — la fuente la importa de `./index.js`, que a su vez
 * la re-exporta de `./global/config.ts` (`export type OutputStyle = string`,
 * verificado). `global/config.ts` no existe en este árbol; se declara el
 * tipo localmente con el mismo valor (`string`) en vez de importar un
 * módulo ausente sólo por un alias de tipo.
 */

import { basename } from 'path'
import {
  figuresSubset,
  memoize,
  requireAgentFrontmatterParser,
  requireAppHostBootstrapCwd,
  requireLocalObservabilityDebug,
  requireLocalObservabilityLogging,
} from './internal/pendingCrossPackageDeps.js'
import type { SettingSource } from './settings/constants.js'

/** Ver docstring del módulo — `OutputStyle = string` en la fuente. */
export type OutputStyle = string

/**
 * `extractDescriptionFromMarkdown`/`loadMarkdownFilesForSubdir` —
 * `@thyrox/tool-registry` no existe en este árbol en absoluto.
 */
function requireToolRegistryMarkdownConfigLoader(): {
  extractDescriptionFromMarkdown: (content: string, fallback: string) => string
  loadMarkdownFilesForSubdir: ((
    subdir: string,
    cwd: string,
  ) => Promise<
    Array<{
      filePath: string
      frontmatter: Record<string, unknown>
      content: string
      source: SettingSource
    }>
  >) & { cache?: { clear: () => void } }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/tool-registry/markdownConfigLoader.js')
}

/** `./plugin/loadPluginOutputStyles.ts` no es uno de los 15 del alcance. */
function requirePluginLoadPluginOutputStyles(): {
  loadPluginOutputStyles: () => Promise<OutputStyleConfig[]>
  clearPluginOutputStyleCache: () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./plugin/loadPluginOutputStyles.js')
}

/** `./settings/settings.ts` — ver docstring del módulo. */
function requireSettingsSettings(): {
  getSettings: () => { outputStyle?: string } | null
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./settings/settings.js')
}

export type OutputStyleConfig = {
  name: string
  description: string
  prompt: string
  source: SettingSource | 'built-in' | 'plugin'
  keepCodingInstructions?: boolean
  /**
   * ant v2.1.139 4096.js MYH — recordatorio corto reinyectado en cada turno
   * para que el comportamiento del estilo no derive en conversaciones
   * largas. Hoy lo usa el estilo Proactive.
   */
  turnReminder?: string
  /**
   * Si es `true`, este output style se aplica automáticamente cuando el
   * plugin está habilitado. Sólo aplica a output styles de plugin. Cuando
   * varios plugins fuerzan output styles, sólo se elige uno (se registra
   * vía debug).
   */
  forceForPlugin?: boolean
}

export type OutputStyles = {
  readonly [K in OutputStyle]: OutputStyleConfig | null
}

// Se usa en los modos Explanatory y Learning.
//
// Regla de alcance: las explicaciones educativas viven DENTRO del bloque
// Insight. El resto de la respuesta sigue las reglas de "eficiencia de
// salida" del prompt principal (conciso, encabeza con la acción). El
// bloque es la válvula de escape dedicada — fuera de él, sin relajación de
// longitud.
//
// Regla de disparo: produce un Insight cuando escribiste código con una
// decisión de diseño no obvia, usaste un patrón específico del proyecto, o
// arreglaste un bug cuya causa raíz importa. Se omite en ediciones
// triviales (rename, typo, formato). Calidad > frecuencia.
const EXPLANATORY_FEATURE_PROMPT = `
## Insights
When you write code involving a non-obvious design choice, a project-specific pattern, or a bug whose root cause is worth explaining, surface it in a dedicated Insight block (with backticks):

"\`${figuresSubset.star} Insight ─────────────────────────────────────\`
[2-3 educational points, codebase-specific where possible]
\`─────────────────────────────────────────────────\`"

Rules:
- The Insight block is the only place length relaxation applies. Everything else in your response still obeys the main concise-output rules — lead with the action, skip filler, do not narrate.
- Skip the Insight block for trivial edits (rename, typo, formatting, mechanical refactor).
- Prefer insights that are specific to this codebase / the change you just made over generic programming concepts.
- Insights go in the conversation, not as comments in the codebase.`

export const DEFAULT_OUTPUT_STYLE_NAME = 'default'

// ant v2.1.139 4095.js (hh8) — cuerpo del estilo Proactive: lista de
// directivas que reemplaza el "pregunta primero" de Default por "ejecuta,
// minimiza interrupciones, prefiere acción sobre planificación".
const PROACTIVE_FEATURE_PROMPT = `The user chose continuous, autonomous execution. You should:

1. **Execute immediately** — Start implementing right away. Make reasonable assumptions and proceed on low-risk work.
2. **Minimize interruptions** — Prefer making reasonable assumptions over asking questions for routine decisions.
3. **Prefer action over planning** — Do not enter plan mode unless the user explicitly asks. When in doubt, start coding.
4. **Expect course corrections** — The user may provide suggestions or course corrections at any point; treat those as normal input.
5. **Do not take overly destructive actions** — This is not a license to destroy. Anything that deletes data or modifies shared or production systems still needs explicit user confirmation. If you reach such a decision point, ask and wait, or course correct to a safer method instead.
6. **Avoid data exfiltration** — Post even routine messages to chat platforms or work tickets only if the user has directed you to. You must not share secrets (e.g. credentials, internal documentation) unless the user has explicitly authorized both that specific secret and its destination.`

export const OUTPUT_STYLE_CONFIG: OutputStyles = {
  [DEFAULT_OUTPUT_STYLE_NAME]: null,
  // ant v2.1.139 4096.js MYH.Proactive — 4to output style integrado. Cuando
  // el usuario setea `outputStyle: "Proactive"`, Claude pasa del modo lazy
  // por defecto a modo ejecución autónoma. `keepCodingInstructions` queda
  // en `true` para que las reglas de seguridad de uso de herramientas +
  // reglas de código del prompt por defecto sigan aplicando.
  Proactive: {
    name: 'Proactive',
    source: 'built-in',
    description:
      'Claude executes immediately, minimizes interruptions, and prefers action over planning',
    keepCodingInstructions: true,
    prompt: `You are an interactive CLI tool that helps users with software engineering tasks. You should work proactively and autonomously, executing immediately and minimizing interruptions.

# Proactive Style Active
${PROACTIVE_FEATURE_PROMPT}`,
    turnReminder:
      'Execute autonomously, minimize interruptions, prefer action over planning.',
  },
  Explanatory: {
    name: 'Explanatory',
    source: 'built-in',
    description:
      'Claude explains its implementation choices and codebase patterns',
    keepCodingInstructions: true,
    prompt: `You are an interactive CLI tool that helps users with software engineering tasks. In addition to software engineering tasks, you should surface educational insights about the codebase when they teach something non-obvious.

Behavior contract:
- Task execution still follows the main concise-output rules in the system prompt. Do not narrate every step. Do not pad explanations into the main response body.
- Use the dedicated Insight block (defined below) as the *only* outlet for educational length. Everything outside the block stays terse.
- Trigger an Insight only when the change taught you (or the user) something specific to this codebase. Skip for trivial edits.

# Explanatory Style Active
${EXPLANATORY_FEATURE_PROMPT}`,
  },
  Learning: {
    name: 'Learning',
    source: 'built-in',
    description:
      'Claude pauses and asks you to write small pieces of code for hands-on practice',
    keepCodingInstructions: true,
    prompt: `You are an interactive CLI tool that helps users with software engineering tasks. In addition to software engineering tasks, you should help users learn more about the codebase through hands-on practice and educational insights.

You should be collaborative and encouraging. Balance task completion with learning by requesting user input for meaningful design decisions while handling routine implementation yourself.

# Learning Style Active
## Requesting Human Contributions
In order to encourage learning, ask the human to contribute 2-10 line code pieces when generating 20+ lines involving:
- Design decisions (error handling, data structures)
- Business logic with multiple valid approaches
- Key algorithms or interface definitions

**TodoList Integration**: If using a TodoList for the overall task, include a specific todo item like "Request human input on [specific decision]" when planning to request human input. This ensures proper task tracking. Note: TodoList is not required for all tasks.

Example TodoList flow:
   ✓ "Set up component structure with placeholder for logic"
   ✓ "Request human collaboration on decision logic implementation"
   ✓ "Integrate contribution and complete feature"

### Request Format
\`\`\`
${figuresSubset.bullet} **Learn by Doing**
**Context:** [what's built and why this decision matters]
**Your Task:** [specific function/section in file, mention file and TODO(human) but do not include line numbers]
**Guidance:** [trade-offs and constraints to consider]
\`\`\`

### Key Guidelines
- Frame contributions as valuable design decisions, not busy work
- You must first add a TODO(human) section into the codebase with your editing tools before making the Learn by Doing request
- Make sure there is one and only one TODO(human) section in the code
- Don't take any action or output anything after the Learn by Doing request. Wait for human implementation before proceeding.

### Example Requests

**Whole Function Example:**
\`\`\`
${figuresSubset.bullet} **Learn by Doing**

**Context:** I've set up the hint feature UI with a button that triggers the hint system. The infrastructure is ready: when clicked, it calls selectHintCell() to determine which cell to hint, then highlights that cell with a yellow background and shows possible values. The hint system needs to decide which empty cell would be most helpful to reveal to the user.

**Your Task:** In sudoku.js, implement the selectHintCell(board) function. Look for TODO(human). This function should analyze the board and return {row, col} for the best cell to hint, or null if the puzzle is complete.

**Guidance:** Consider multiple strategies: prioritize cells with only one possible value (naked singles), or cells that appear in rows/columns/boxes with many filled cells. You could also consider a balanced approach that helps without making it too easy. The board parameter is a 9x9 array where 0 represents empty cells.
\`\`\`

**Partial Function Example:**
\`\`\`
${figuresSubset.bullet} **Learn by Doing**

**Context:** I've built a file upload component that validates files before accepting them. The main validation logic is complete, but it needs specific handling for different file type categories in the switch statement.

**Your Task:** In upload.js, inside the validateFile() function's switch statement, implement the 'case "document":' branch. Look for TODO(human). This should validate document files (pdf, doc, docx).

**Guidance:** Consider checking file size limits (maybe 10MB for documents?), validating the file extension matches the MIME type, and returning {valid: boolean, error?: string}. The file object has properties: name, size, type.
\`\`\`

**Debugging Example:**
\`\`\`
${figuresSubset.bullet} **Learn by Doing**

**Context:** The user reported that number inputs aren't working correctly in the calculator. I've identified the handleInput() function as the likely source, but need to understand what values are being processed.

**Your Task:** In calculator.js, inside the handleInput() function, add 2-3 console.log statements after the TODO(human) comment to help debug why number inputs fail.

**Guidance:** Consider logging: the raw input value, the parsed result, and any validation state. This will help us understand where the conversion breaks.
\`\`\`

### After Contributions
Share one insight connecting their code to broader patterns or system effects. Avoid praise or repetition.

## Insights
${EXPLANATORY_FEATURE_PROMPT}`,
  },
}

/**
 * Carga archivos markdown de los directorios `.claude/output-styles` de
 * todo el proyecto y de `~/.claude/output-styles`, y los convierte en
 * output styles.
 *
 * Cada nombre de archivo se vuelve un nombre de estilo, y el contenido del
 * archivo se vuelve el prompt del estilo. El frontmatter provee nombre y
 * descripción.
 *
 * Estructura:
 * - `.claude/output-styles/*.md` del proyecto -> estilos de proyecto
 * - `~/.claude/output-styles/*.md` de usuario -> estilos de usuario
 *   (sobreescritos por los de proyecto)
 */
export const getOutputStyleDirStyles = memoize(
  async (cwd: string): Promise<OutputStyleConfig[]> => {
    const { logError } = requireLocalObservabilityLogging()
    const { logForDebugging } = requireLocalObservabilityDebug()
    try {
      const { loadMarkdownFilesForSubdir, extractDescriptionFromMarkdown } =
        requireToolRegistryMarkdownConfigLoader()
      const markdownFiles = await loadMarkdownFilesForSubdir(
        'output-styles',
        cwd,
      )

      const styles = markdownFiles
        .map(({ filePath, frontmatter, content, source }) => {
          try {
            const fileName = basename(filePath)
            const styleName = fileName.replace(/\.md$/, '')

            const name = (frontmatter['name'] || styleName) as string
            const description =
              (requireAgentFrontmatterParser().coerceDescriptionToString(
                frontmatter['description'],
                styleName,
              ) as string | undefined) ??
              extractDescriptionFromMarkdown(
                content,
                `Custom ${styleName} output style`,
              )

            const keepCodingInstructionsRaw =
              frontmatter['keep-coding-instructions']
            const keepCodingInstructions =
              keepCodingInstructionsRaw === true ||
              keepCodingInstructionsRaw === 'true'
                ? true
                : keepCodingInstructionsRaw === false ||
                    keepCodingInstructionsRaw === 'false'
                  ? false
                  : undefined

            if (frontmatter['force-for-plugin'] !== undefined) {
              logForDebugging(
                `Output style "${name}" has force-for-plugin set, but this option only applies to plugin output styles. Ignoring.`,
                { level: 'warn' },
              )
            }

            return {
              name,
              description,
              prompt: content.trim(),
              source,
              keepCodingInstructions,
            }
          } catch (error) {
            logError(error)
            return null
          }
        })
        .filter((style) => style !== null)

      return styles
    } catch (error) {
      logError(error)
      return []
    }
  },
)

export function clearOutputStyleCaches(): void {
  getOutputStyleDirStyles.cache?.clear?.()
  requireToolRegistryMarkdownConfigLoader().loadMarkdownFilesForSubdir.cache?.clear?.()
  requirePluginLoadPluginOutputStyles().clearPluginOutputStyleCache()
}

export const getAllOutputStyles = memoize(async function getAllOutputStyles(
  cwd: string,
): Promise<{ [styleName: string]: OutputStyleConfig | null }> {
  const customStyles = await getOutputStyleDirStyles(cwd)
  const pluginStyles = await requirePluginLoadPluginOutputStyles().loadPluginOutputStyles()

  const allStyles: { [styleName: string]: OutputStyleConfig | null } = {
    ...OUTPUT_STYLE_CONFIG,
  }

  const managedStyles = customStyles.filter(
    style => style.source === 'policySettings',
  )
  const userStyles = customStyles.filter(
    style => style.source === 'userSettings',
  )
  const projectStyles = customStyles.filter(
    style => style.source === 'projectSettings',
  )

  // Añade estilos en orden de prioridad (menor a mayor): built-in, plugin,
  // gestionado, usuario, proyecto.
  const styleGroups = [pluginStyles, userStyles, projectStyles, managedStyles]

  for (const styles of styleGroups) {
    for (const style of styles) {
      allStyles[style.name] = {
        name: style.name,
        description: style.description,
        prompt: style.prompt,
        source: style.source,
        keepCodingInstructions: style.keepCodingInstructions,
        forceForPlugin: style.forceForPlugin,
      }
    }
  }

  return allStyles
})

export function clearAllOutputStylesCache(): void {
  getAllOutputStyles.cache?.clear?.()
}

export async function getOutputStyleConfig(): Promise<OutputStyleConfig | null> {
  const allStyles = await getAllOutputStyles(
    requireAppHostBootstrapCwd().getCwd(),
  )

  const forcedStyles = Object.values(allStyles).filter(
    (style): style is OutputStyleConfig =>
      style !== null &&
      (style as { source?: string }).source === 'plugin' &&
      (style as { forceForPlugin?: boolean }).forceForPlugin === true,
  )

  const firstForcedStyle = forcedStyles[0]
  if (firstForcedStyle) {
    const { logForDebugging } = requireLocalObservabilityDebug()
    if (forcedStyles.length > 1) {
      logForDebugging(
        `Multiple plugins have forced output styles: ${forcedStyles.map(s => s.name).join(', ')}. Using: ${firstForcedStyle.name}`,
        { level: 'warn' },
      )
    }
    logForDebugging(
      `Using forced plugin output style: ${firstForcedStyle.name}`,
    )
    return firstForcedStyle
  }

  const settings = requireSettingsSettings().getSettings()
  const outputStyle = (settings?.outputStyle ||
    DEFAULT_OUTPUT_STYLE_NAME) as string

  return allStyles[outputStyle] ?? null
}

export function hasCustomOutputStyle(): boolean {
  const style = requireSettingsSettings().getSettings()?.outputStyle
  return style !== undefined && style !== DEFAULT_OUTPUT_STYLE_NAME
}
