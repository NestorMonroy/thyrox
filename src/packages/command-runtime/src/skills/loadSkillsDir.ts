import { homedir } from 'os'
import { join } from 'path'
import { getManagedFilePath } from './managedPath.js'

/**
 * Porte PARCIAL de `ccnmt: packages/command-runtime/src/skills/loadSkillsDir.ts`
 * (1086 líneas) — sólo dos símbolos: `getSkillsPath` y
 * `estimateSkillFrontmatterTokens`, más sus dependencias directas. El resto
 * del archivo (descubrimiento de directorios, deduplicación por
 * `realpath`, hooks de settings, registro de skills MCP) no se porta: no
 * hay test que lo ejerza en este pase, y su alcance excede lo que este
 * porte declara cubrir.
 *
 * Dependencias sustituidas, ninguna con hogar en este árbol (DEC-04):
 *
 * - `SettingSource` — de `@claude-code-how-works/config/constants`. Ya
 *   existe como tipo real en `@thyrox/config`, pero ese paquete no está
 *   enlazado como workspace aquí (ningún paquete de este árbol importa
 *   otro `@thyrox/*` por nombre todavía) — se redeclara localmente con
 *   los mismos cinco valores.
 * - `getClaudeConfigHomeDir` — de `@claude-code-how-works/config/env/utils`.
 *   Porte fiel salvo la memoización: sin `lodash-es/memoize` disponible
 *   (0 dependencias en el `package.json` de este paquete), se sustituye
 *   por una memoización manual keyed por el propio valor de
 *   `CLAUDE_CONFIG_DIR`, igual que hace la fuente con su resolver.
 * - `roughTokenCountEstimation` — de `@claude-code-how-works/agent/tokenEstimation.js`.
 *   Ese símbolo SÍ existe portado en `@thyrox/agent/tokenEstimation.ts`,
 *   pero `command-runtime` no puede importarlo: la dependencia va en el
 *   sentido contrario (`agent` depende de `command-runtime`, no al
 *   revés), así que importarlo aquí crearía un ciclo. Se porta una
 *   segunda vez, fiel a la fuente.
 * - `Command` (el tipo del parámetro de `estimateSkillFrontmatterTokens`)
 *   — de `@claude-code-how-works/agent/command.js`, una unión grande
 *   (`CommandBase & (PromptCommand | LocalCommand | LocalJSXCommand)`).
 *   Se sustituye por `SkillFrontmatter`, el subconjunto estructural que
 *   la función realmente lee (`name`, `description`, `whenToUse`).
 */

export type SettingSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'flagSettings'
  | 'policySettings'

// Memoizado, keyed por el propio valor de CLAUDE_CONFIG_DIR — igual que el
// resolver de `lodash-es/memoize` de la fuente, sin la dependencia.
let cachedHomeDirKey: string | undefined
let cachedHomeDir: string | undefined

function getClaudeConfigHomeDir(): string {
  const key = process.env.CLAUDE_CONFIG_DIR
  if (cachedHomeDirKey !== key) {
    cachedHomeDirKey = key
    cachedHomeDir = (key ?? join(homedir(), '.claude')).normalize('NFC')
  }
  return cachedHomeDir!
}

/**
 * Returns a claude config directory path for a given source.
 */
export function getSkillsPath(
  source: SettingSource | 'plugin',
  dir: 'skills' | 'commands',
): string {
  switch (source) {
    case 'policySettings':
      return join(getManagedFilePath(), '.claude', dir)
    case 'userSettings':
      return join(getClaudeConfigHomeDir(), dir)
    case 'projectSettings':
      return `.claude/${dir}`
    case 'plugin':
      return 'plugin'
    default:
      return ''
  }
}

// CJK Unified Ideographs + extensions + compatibility blocks + punctuation
// Each CJK character is 1 JS string unit but ~1.5 BPE tokens on average,
// making the standard /4 formula underestimate by 4-8x for Chinese/Japanese.
const CJK_REGEX =
  /[\u2e80-\u2eff\u2f00-\u2fdf\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f]/g

function roughTokenCountEstimation(
  content: string,
  bytesPerToken: number = 4,
): number {
  const cjkMatches = content.match(CJK_REGEX)
  if (!cjkMatches || cjkMatches.length === 0) {
    return Math.round(content.length / bytesPerToken)
  }
  const cjkCount = cjkMatches.length
  const nonCjkLength = content.length - cjkCount
  // CJK chars: ~1.5 tokens each; non-CJK: use caller-supplied ratio
  return Math.round(nonCjkLength / bytesPerToken + cjkCount * 1.5)
}

/** El subconjunto estructural de `Command` que la función lee — ver cabecera. */
export type SkillFrontmatter = {
  name: string
  description: string
  whenToUse?: string
}

/**
 * Estimates token count for a skill based on frontmatter only
 * (name, description, whenToUse) since full content is only loaded on invocation.
 */
export function estimateSkillFrontmatterTokens(
  skill: SkillFrontmatter,
): number {
  const frontmatterText = [skill.name, skill.description, skill.whenToUse]
    .filter(Boolean)
    .join(' ')
  return roughTokenCountEstimation(frontmatterText)
}
