/**
 * Puerto de `ccnmt: packages/memory/src/agentMemory.ts`, con el mismo
 * ajuste que `paths.ts`: `readEnv(...)` se guarda en una constante local
 * antes de reusarse, en vez de llamarse dos veces con el mismo argumento
 * (la fuente lo hace así; bajo TypeScript estricto la segunda llamada no
 * hereda el estrechamiento de tipo de la primera).
 */
import { join, normalize, sep } from 'node:path'
import { readEnv } from '@thyrox/config/env/utils'
import { buildMemoryPrompt, ensureMemoryDirExists } from './memdir.js'
import { getMemoryBaseDir } from './paths.js'
import { getMemoryHostBindings } from './host.js'
import { sanitizePath } from './internalUtils.js'

// Alcance de memoria persistente de agente: 'user' (~/.claude/agent-memory/),
// 'project' (.claude/agent-memory/), o 'local' (.claude/agent-memory-local/).
export type AgentMemoryScope = 'user' | 'project' | 'local'

/**
 * Sanitiza un nombre de tipo de agente para usarlo como nombre de
 * directorio. Reemplaza los dos-puntos (inválidos en Windows, usados en
 * tipos de agente con namespace de plugin como "my-plugin:my-agent") por
 * guiones.
 */
function sanitizeAgentTypeForPath(agentType: string): string {
  return agentType.replace(/:/g, '-')
}

/**
 * Devuelve el directorio de memoria de agente local, que es específico del
 * proyecto y no se registra en VCS. Cuando `CLAUDE_CODE_REMOTE_MEMORY_DIR`
 * está fijado, persiste en el mount con namespacing por proyecto. Si no,
 * usa `<cwd>/.claude/agent-memory-local/<agentType>/`.
 */
function getLocalAgentMemoryDir(dirName: string): string {
  const bindings = getMemoryHostBindings()
  const remoteMemoryDir = readEnv('CLAUDE_CODE_REMOTE_MEMORY_DIR')
  if (remoteMemoryDir) {
    const projectRoot = bindings.getProjectRoot?.() ?? process.cwd()
    return (
      join(
        remoteMemoryDir,
        'projects',
        sanitizePath(
          bindings.findCanonicalGitRoot?.(projectRoot) ?? projectRoot,
        ),
        'agent-memory-local',
        dirName,
      ) + sep
    )
  }
  const cwd = bindings.getCwd?.() ?? process.cwd()
  return join(cwd, '.claude', 'agent-memory-local', dirName) + sep
}

/**
 * Devuelve el directorio de memoria de agente para un tipo de agente y
 * alcance dados.
 * - alcance 'user': `<memoryBase>/agent-memory/<agentType>/`
 * - alcance 'project': `<cwd>/.claude/agent-memory/<agentType>/`
 * - alcance 'local': ver getLocalAgentMemoryDir()
 */
export function getAgentMemoryDir(
  agentType: string,
  scope: AgentMemoryScope,
): string {
  const dirName = sanitizeAgentTypeForPath(agentType)
  const bindings = getMemoryHostBindings()
  switch (scope) {
    case 'project': {
      const cwd = bindings.getCwd?.() ?? process.cwd()
      return join(cwd, '.claude', 'agent-memory', dirName) + sep
    }
    case 'local':
      return getLocalAgentMemoryDir(dirName)
    case 'user':
      return join(getMemoryBaseDir(), 'agent-memory', dirName) + sep
  }
}

// Verifica si un archivo está dentro de un directorio de memoria de agente
// (cualquier alcance).
export function isAgentMemoryPath(absolutePath: string): boolean {
  // SEGURIDAD: normalizar para prevenir bypasses de path traversal vía
  // segmentos `..`.
  const normalizedPath = normalize(absolutePath)
  const memoryBase = getMemoryBaseDir()
  const bindings = getMemoryHostBindings()
  const cwd = bindings.getCwd?.() ?? process.cwd()

  // Alcance 'user': verifica la base de memoria (puede ser un dir custom o
  // el home de config).
  if (normalizedPath.startsWith(join(memoryBase, 'agent-memory') + sep)) {
    return true
  }

  // Alcance 'project': siempre basado en cwd (no se redirige).
  if (
    normalizedPath.startsWith(join(cwd, '.claude', 'agent-memory') + sep)
  ) {
    return true
  }

  // Alcance 'local': persiste en el mount cuando
  // CLAUDE_CODE_REMOTE_MEMORY_DIR está fijado, si no basado en cwd.
  const remoteMemoryDir = readEnv('CLAUDE_CODE_REMOTE_MEMORY_DIR')
  if (remoteMemoryDir) {
    if (
      normalizedPath.includes(sep + 'agent-memory-local' + sep) &&
      normalizedPath.startsWith(join(remoteMemoryDir, 'projects') + sep)
    ) {
      return true
    }
  } else if (
    normalizedPath.startsWith(
      join(cwd, '.claude', 'agent-memory-local') + sep,
    )
  ) {
    return true
  }

  return false
}

/**
 * Devuelve la ruta del archivo de memoria de agente para un tipo de agente
 * y alcance dados.
 */
export function getAgentMemoryEntrypoint(
  agentType: string,
  scope: AgentMemoryScope,
): string {
  return join(getAgentMemoryDir(agentType, scope), 'MEMORY.md')
}

export function getMemoryScopeDisplay(
  memory: AgentMemoryScope | undefined,
): string {
  switch (memory) {
    case 'user':
      return `User (${join(getMemoryBaseDir(), 'agent-memory')}/)`
    case 'project':
      return 'Project (.claude/agent-memory/)'
    case 'local':
      return `Local (${getLocalAgentMemoryDir('...')})`
    default:
      return 'None'
  }
}

/**
 * Carga la memoria persistente de un agente con memoria habilitada. Crea el
 * directorio de memoria si hace falta y devuelve un prompt con el contenido
 * de la memoria.
 *
 * @param agentType El nombre de tipo del agente (se usa como nombre de directorio).
 * @param scope 'user' para ~/.claude/agent-memory/ o 'project' para .claude/agent-memory/.
 */
export function loadAgentMemoryPrompt(
  agentType: string,
  scope: AgentMemoryScope,
): string {
  let scopeNote: string
  switch (scope) {
    case 'user':
      scopeNote =
        '- Since this memory is user-scope, keep learnings general since they apply across all projects'
      break
    case 'project':
      scopeNote =
        '- Since this memory is project-scope and shared with your team via version control, tailor your memories to this project'
      break
    case 'local':
      scopeNote =
        '- Since this memory is local-scope (not checked into version control), tailor your memories to this project and machine'
      break
  }

  const memoryDir = getAgentMemoryDir(agentType, scope)

  // Fire-and-forget: esto corre en tiempo de arranque del agente, dentro de
  // un callback síncrono getSystemPrompt() (llamado desde el render de React
  // en AgentDetail.tsx, así que no puede ser async). El agente lanzado no
  // intentará escribir hasta después de un round-trip completo de API,
  // momento para el cual mkdir ya habrá terminado. Aunque no lo haya,
  // FileWriteTool hace su propio mkdir del directorio padre.
  void ensureMemoryDirExists(memoryDir)

  const coworkExtraGuidelines = readEnv('CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES')
  return buildMemoryPrompt({
    displayName: 'Persistent Agent Memory',
    memoryDir,
    extraGuidelines:
      coworkExtraGuidelines && coworkExtraGuidelines.trim().length > 0
        ? [scopeNote, coworkExtraGuidelines]
        : [scopeNote],
  })
}
