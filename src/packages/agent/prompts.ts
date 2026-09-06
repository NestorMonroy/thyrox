/**
 * Informacion de entorno del system prompt — porte PARCIAL DECLARADO de
 * `ccnmt: packages/agent/prompts.ts` (994 lineas, 11 simbolos exportados).
 *
 * La fuente construye TODO el system prompt (secciones estaticas y
 * dinamicas, guia de sesion, instrucciones de scratchpad, MCP, skills, ...)
 * y arrastra mas de veinte imports de paquetes hermanos ausentes en este
 * arbol (`@claude-code-how-works/{config,storage,app-host,swarm,
 * tool-registry,command-runtime,mcp-runtime,permission,memory,provider}`).
 *
 * Se portan aqui SOLO los DOS simbolos que
 * `__tests__/promptsModelIdLeak.test.ts` ejercita —
 * `computeEnvInfo` y `computeSimpleEnvInfo`— con los helpers que ambos
 * consumen directamente (`getUnameSR`, `prependBullets`). El resto de la
 * fuente (`getSystemPrompt`, `getSessionSpecificGuidanceSection`,
 * `enhanceSystemPromptWithEnvDetails`, `getScratchpadInstructions`,
 * `CLAUDE_CODE_DOCS_MAP_URL`, `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`,
 * `DEFAULT_AGENT_PROMPT`) queda fuera: ninguno tiene consumidor en este
 * cierre y cada uno arrastra su propio arbol de paquetes hermanos.
 *
 * EL CONTRATO QUE EL TEST FIJA (H-CCNMT: fuga de `<connId>:<modelId>` al
 * prompt): el id de modelo que llega empaquetado con su prefijo de conexion
 * de enrutamiento (`conn_xxxx:claude-opus-4-7`) se DESEMPAQUETA antes de
 * interpolarse en cualquier cadena visible para el usuario o el modelo. El
 * prefijo es un artefacto de enrutamiento interno; nunca debe aparecer en
 * lo que el LLM lee de si mismo.
 *
 * DIVERGENCIA DE MECANISMO, declarada. La fuente resuelve el nombre de
 * mercadeo y el corte de conocimiento con dos cadenas de `if
 * canonical.includes(...)` sobre un mapeo hardcodeado
 * (`getMarketingNameForModel`/`getKnowledgeCutoff` de
 * `@claude-code-how-works/provider/model.js`, paquete hermano ausente).
 * Aqui se consulta en su lugar el CATALOGO VENDORIZADO REAL de este arbol
 * (`./models.ts`, derivado del binario) por id exacto —
 * `MODELS[modelId].display_name` / `.knowledge_cutoff`— que es mas preciso
 * que duplicar la logica de canonicalizacion de la fuente y evita que las
 * dos tablas diverjan con el tiempo.
 *
 * DIVERGENCIA DE ALCANCE, declarada, en los helpers de entorno que la
 * fuente importa de paquetes hermanos ausentes — ninguno tiene
 * comportamiento observable por este test:
 * - `getIsGit()` (`storage/git.js`): aqui busca un `.git` en el cwd o sus
 *   ancestros con `fs.existsSync`, en vez del `git rev-parse` real.
 * - `getCwd()` (`app-host/bootstrap/cwd.js`): aqui es `process.cwd()`.
 * - `getCurrentWorktreeSession()` (`swarm`): stub que siempre da `null` —
 *   no hay seguimiento de worktree portado en este cierre.
 * - `isUndercover()` (`tool-registry/undercover.js`): stub que siempre da
 *   `false` — el modo "undercover" (ocultar nombres de modelo en repos
 *   internos de Anthropic) no aplica a este arbol, que no es ese build.
 * - `readEnv`/`isEnvTruthy` (`config/env/utils`): wrappers triviales sobre
 *   `process.env`, mismo criterio que `context.ts` ya declara en este
 *   paquete para su propio recorte.
 */
import { release as osRelease, type as osType, version as osVersion } from 'node:os'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { MODELS } from './models.js'

/** Wrapper trivial sobre `process.env` — mismo contrato que el de config/env/utils. */
function readEnv(name: string): string | undefined {
  return process.env[name]
}

/** Normaliza a booleano un valor de variable de entorno. */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

/** Directorio de trabajo actual — stub de `app-host/bootstrap/cwd.js`. */
function getCwd(): string {
  return process.cwd()
}

/**
 * ¿El cwd (o un ancestro) es un repositorio git? Stub de `storage/git.js`:
 * busca un `.git` en el arbol de directorios en vez de invocar git.
 */
async function getIsGit(): Promise<boolean> {
  let dir = getCwd()
  for (;;) {
    if (existsSync(join(dir, '.git'))) return true
    const parent = dirname(dir)
    if (parent === dir) return false
    dir = parent
  }
}

/** Stub de `swarm.getCurrentWorktreeSession()` — sin seguimiento de worktree en este cierre. */
function getCurrentWorktreeSession(): unknown {
  return null
}

/** Stub de `tool-registry/undercover.js` — este arbol no es un build "ant". */
function isUndercover(): boolean {
  return false
}

/**
 * Separador del id compuesto `<connId>:<modelId>` — mismo valor que
 * `@claude-code-how-works/provider/connections.ts` declara.
 */
const MODEL_ID_SEPARATOR = ':'

/**
 * Desempaqueta un id compuesto `<connId>:<modelId>` en sus dos partes.
 * Devuelve el id tal cual si no lleva separador (camino legacy / solo-env).
 * Un `connId` con `/` o `.` en realidad es una ruta de modelo (p. ej.
 * `models/gemini-2.5-pro`), no un id de conexion — se rechaza el
 * desempaquetado en ese caso.
 */
function unpackModelId(value: string): {
  connectionId: string | undefined
  modelId: string
} {
  const idx = value.indexOf(MODEL_ID_SEPARATOR)
  if (idx <= 0) return { connectionId: undefined, modelId: value }
  const head = value.slice(0, idx)
  if (/[/.]/.test(head)) return { connectionId: undefined, modelId: value }
  return { connectionId: head, modelId: value.slice(idx + 1) }
}

/** Nombre de mercadeo del modelo, o `undefined` si el catalogo no lo declara. */
function getMarketingNameForModel(modelId: string): string | undefined {
  return MODELS[modelId]?.display_name
}

/** Corte de conocimiento del modelo, o `null` si el catalogo no lo declara. */
function getKnowledgeCutoff(modelId: string): string | null {
  return MODELS[modelId]?.knowledge_cutoff ?? null
}

/**
 * `os.type()` + `os.release()` — equivalente byte a byte de `uname -sr` en
 * POSIX ("Darwin 25.3.0", "Linux 6.6.4"). Windows no tiene `uname(3)`;
 * `os.version()` da el nombre amigable ("Windows 11 Pro") en su lugar.
 */
export function getUnameSR(): string {
  if (process.platform === 'win32') {
    return `${osVersion()} ${osRelease()}`
  }
  return `${osType()} ${osRelease()}`
}

function getShellInfoLine(): string {
  const shell = readEnv('SHELL') || 'unknown'
  const shellName = shell.includes('zsh')
    ? 'zsh'
    : shell.includes('bash')
      ? 'bash'
      : shell
  if (process.platform === 'win32') {
    return `Shell: ${shellName} (use Unix shell syntax, not Windows — e.g., /dev/null not NUL, forward slashes in paths)`
  }
  return `Shell: ${shellName}`
}

/** Antepone `-`/`  -` a cada item — bullets de un nivel o de dos. */
export function prependBullets(items: Array<string | string[]>): string[] {
  return items.flatMap(item =>
    Array.isArray(item)
      ? item.map(subitem => `  - ${subitem}`)
      : [` - ${item}`],
  )
}

/** Los tres ids de la familia Claude 4.X mas reciente que el bullet de fast-mode nombra. */
const CLAUDE_4_5_OR_4_6_MODEL_IDS = {
  opus: 'claude-opus-4-8',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
}

/** Nombre de mercadeo del modelo de fast-mode — Opus 4.8 por defecto, con override legacy. */
function getFastModelName(): string {
  return isEnvTruthy(readEnv('CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE'))
    ? 'Opus 4.6'
    : 'Opus 4.8'
}

/**
 * Bloque `<env>` del system prompt: cwd, si es repo git, plataforma, shell,
 * version de SO, y — el contrato que este cierre fija — el modelo y su
 * corte de conocimiento con el id YA DESEMPAQUETADO.
 */
export async function computeEnvInfo(
  modelId: string,
  additionalWorkingDirectories?: string[],
): Promise<string> {
  const [isGit, unameSR] = await Promise.all([getIsGit(), getUnameSR()])
  // Desempaqueta el prefijo `<connId>:` — nunca visible para el usuario/modelo.
  modelId = unpackModelId(modelId).modelId

  let modelDescription = ''
  if (process.env.USER_TYPE === 'ant' && isUndercover()) {
    // suprimido — build "ant" en modo undercover.
  } else {
    const marketingName = getMarketingNameForModel(modelId)
    modelDescription = marketingName
      ? `You are powered by the model named ${marketingName}. The exact model ID is ${modelId}.`
      : `You are powered by the model ${modelId}.`
  }

  const additionalDirsInfo =
    additionalWorkingDirectories && additionalWorkingDirectories.length > 0
      ? `Additional working directories: ${additionalWorkingDirectories.join(', ')}\n`
      : ''

  const cutoff = getKnowledgeCutoff(modelId)
  const knowledgeCutoffMessage = cutoff
    ? `\n\nAssistant knowledge cutoff is ${cutoff}.`
    : ''

  return `Here is useful information about the environment you are running in:
<env>
Working directory: ${getCwd()}
Is directory a git repo: ${isGit ? 'Yes' : 'No'}
${additionalDirsInfo}Platform: ${process.platform}
${getShellInfoLine()}
OS Version: ${unameSR}
</env>
${modelDescription}${knowledgeCutoffMessage}`
}

/**
 * Variante en vinetas del bloque de entorno — misma resolucion de modelo
 * que `computeEnvInfo`, con el mismo contrato de desempaquetado.
 */
export async function computeSimpleEnvInfo(
  modelId: string,
  additionalWorkingDirectories?: string[],
): Promise<string> {
  const [isGit, unameSR] = await Promise.all([getIsGit(), getUnameSR()])
  modelId = unpackModelId(modelId).modelId

  let modelDescription: string | null = null
  if (process.env.USER_TYPE === 'ant' && isUndercover()) {
    // suprimido — ver computeEnvInfo.
  } else {
    const marketingName = getMarketingNameForModel(modelId)
    modelDescription = marketingName
      ? `You are powered by the model named ${marketingName}. The exact model ID is ${modelId}.`
      : `You are powered by the model ${modelId}.`
  }

  const cutoff = getKnowledgeCutoff(modelId)
  const knowledgeCutoffMessage = cutoff
    ? `Assistant knowledge cutoff is ${cutoff}.`
    : null

  const cwd = getCwd()
  const isWorktree = getCurrentWorktreeSession() !== null

  const envItems = [
    `Primary working directory: ${cwd}`,
    isWorktree
      ? `This is a git worktree — an isolated copy of the repository. Run all commands from this directory. Do NOT \`cd\` to the original repository root.`
      : null,
    [`Is a git repository: ${isGit}`],
    additionalWorkingDirectories && additionalWorkingDirectories.length > 0
      ? `Additional working directories:`
      : null,
    additionalWorkingDirectories && additionalWorkingDirectories.length > 0
      ? additionalWorkingDirectories
      : null,
    `Platform: ${process.platform}`,
    getShellInfoLine(),
    `OS Version: ${unameSR}`,
    modelDescription,
    knowledgeCutoffMessage,
    process.env.USER_TYPE === 'ant' && isUndercover()
      ? null
      : `The most recent Claude model family is Claude 4.X. Model IDs — Opus 4.8: '${CLAUDE_4_5_OR_4_6_MODEL_IDS.opus}', Sonnet 4.6: '${CLAUDE_4_5_OR_4_6_MODEL_IDS.sonnet}', Haiku 4.5: '${CLAUDE_4_5_OR_4_6_MODEL_IDS.haiku}'. When building AI applications, default to the latest and most capable Claude models.`,
    process.env.USER_TYPE === 'ant' && isUndercover()
      ? null
      : `Claude Code is available as a CLI in the terminal, desktop app (Mac/Windows), web app (claude.ai/code), and IDE extensions (VS Code, JetBrains).`,
    process.env.USER_TYPE === 'ant' && isUndercover()
      ? null
      : `Fast mode for Claude Code uses Claude ${getFastModelName()} with faster output (it does not downgrade to a smaller model). It can be toggled with /fast and is only available on ${getFastModelName()}.`,
  ].filter((item): item is string | string[] => item !== null)

  return [
    `# Environment`,
    `You have been invoked in the following environment: `,
    ...prependBullets(envItems),
  ].join(`\n`)
}
