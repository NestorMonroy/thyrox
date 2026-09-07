/**
 * Puerto de `ccnmt: packages/memory/src/memoryFileDetection.ts`, con tres
 * ajustes declarados:
 *
 * 1. El `require()` perezoso de `teamMemPaths.js` (guardado por
 *    `feature('TEAMMEM')`) se porta como import estático — sin ciclo en
 *    este grafo.
 * 2. `getClaudeConfigHomeDir` viene del sustituto local
 *    `./internal/pendingCrossPackageDeps.js` (`config/env/utils`'s versión
 *    no está portada en `@thyrox/config`).
 * 3. **Hallazgo corregido** — la fuente llama tres veces
 *    `teamMemPaths!.isTeamMemFile(filePath)`, pero `teamMemPaths.ts` NUNCA
 *    exporta `isTeamMemFile` — solo `isTeamMemPath`. Bajo
 *    `feature('TEAMMEM') === false` (el caso normal en `bun test`, sin el
 *    flag de build) la rama es código muerto y la fuente nunca lo
 *    ejercita, así que el defecto es invisible en tiempo de ejecución pero
 *    rompería la compilación con TypeScript estricto y con
 *    `feature('TEAMMEM')` real en producción. Se usa aquí `isTeamMemPath`
 *    (incluida la doc de `memoryScopeForPath`, que la nombra por su
 *    nombre real). Ver
 *    `docs: pm/docs/iniciativas/actualizar-agentic-ai-thyrox/hallazgos/`.
 */
import { feature } from 'bun:bundle'
import { normalize, posix, win32 } from 'node:path'
import {
  getAutoMemPath,
  getMemoryBaseDir,
  isAutoMemoryEnabled,
  isAutoMemPath,
} from './paths.js'
import { isAgentMemoryPath } from './agentMemory.js'
import { getClaudeConfigHomeDir } from './internal/pendingCrossPackageDeps.js'
import * as teamMemPathsModule from './teamMemPaths.js'

const teamMemPaths = feature('TEAMMEM') ? teamMemPathsModule : null

// Inlineado desde src/utils/windowsPaths.ts — helpers puros de forma de
// ruta, sin dependencias. La memoización se descarta porque el original
// usaba una LRU custom.
function windowsPathToPosixPath(windowsPath: string): string {
  if (windowsPath.startsWith('\\\\')) return windowsPath.replace(/\\/g, '/')
  const match = windowsPath.match(/^([A-Za-z]):[/\\]/)
  if (match) {
    const driveLetter = match[1]!.toLowerCase()
    return '/' + driveLetter + windowsPath.slice(2).replace(/\\/g, '/')
  }
  return windowsPath.replace(/\\/g, '/')
}

function posixPathToWindowsPath(posixPath: string): string {
  if (posixPath.startsWith('//')) return posixPath.replace(/\//g, '\\')
  const cygdriveMatch = posixPath.match(/^\/cygdrive\/([A-Za-z])(\/|$)/)
  if (cygdriveMatch) {
    const driveLetter = cygdriveMatch[1]!.toUpperCase()
    const rest = posixPath.slice(('/cygdrive/' + cygdriveMatch[1]).length)
    return driveLetter + ':' + (rest || '\\').replace(/\//g, '\\')
  }
  const driveMatch = posixPath.match(/^\/([A-Za-z])(\/|$)/)
  if (driveMatch) {
    const driveLetter = driveMatch[1]!.toUpperCase()
    const rest = posixPath.slice(2)
    return driveLetter + ':' + (rest || '\\').replace(/\//g, '\\')
  }
  return posixPath.replace(/\//g, '\\')
}

const IS_WINDOWS = process.platform === 'win32'

// Normaliza separadores de ruta a posix (/). NO traduce codificación de
// unidad de disco.
function toPosix(p: string): string {
  return p.split(win32.sep).join(posix.sep)
}

// Convierte una ruta a una forma estable comparable como cadena: separada
// por slash, y en Windows, en minúsculas (los filesystems de Windows son
// case-insensitive).
function toComparable(p: string): string {
  const posixForm = toPosix(p)
  return IS_WINDOWS ? posixForm.toLowerCase() : posixForm
}

/**
 * Detecta si una ruta de archivo es un archivo relacionado con sesión bajo
 * ~/.claude. Devuelve el tipo de archivo de sesión, o null si no lo es.
 */
export function detectSessionFileType(
  filePath: string,
): 'session_memory' | 'session_transcript' | null {
  const configDir = getClaudeConfigHomeDir()
  // Compara en forma con slash; en Windows también normaliza mayúsculas.
  // El llamador (isShellCommandTargetingMemory) convierte MinGW /c/... →
  // nativo antes de llegar aquí, así que solo hace falta normalizar
  // separador + mayúsculas.
  const normalized = toComparable(filePath)
  const configDirCmp = toComparable(configDir)
  if (!normalized.startsWith(configDirCmp)) {
    return null
  }
  if (normalized.includes('/session-memory/') && normalized.endsWith('.md')) {
    return 'session_memory'
  }
  if (normalized.includes('/projects/') && normalized.endsWith('.jsonl')) {
    return 'session_transcript'
  }
  return null
}

/**
 * Verifica si una cadena de glob/patrón indica intención de acceso a
 * archivo de sesión. Se usa para herramientas Grep/Glob donde se
 * verifican patrones, no rutas de archivo reales.
 */
export function detectSessionPatternType(
  pattern: string,
): 'session_memory' | 'session_transcript' | null {
  const normalized = pattern.split(win32.sep).join(posix.sep)
  if (
    normalized.includes('session-memory') &&
    (normalized.includes('.md') || normalized.endsWith('*'))
  ) {
    return 'session_memory'
  }
  if (
    normalized.includes('.jsonl') ||
    (normalized.includes('projects') && normalized.includes('*.jsonl'))
  ) {
    return 'session_transcript'
  }
  return null
}

/**
 * Verifica si una ruta de archivo está dentro del directorio de memdir.
 */
export function isAutoMemFile(filePath: string): boolean {
  if (isAutoMemoryEnabled()) {
    return isAutoMemPath(filePath)
  }
  return false
}

export type MemoryScope = 'personal' | 'team'

/**
 * Determina a qué almacén de memoria (si alguno) pertenece una ruta.
 *
 * El dir de equipo es un subdirectorio de memdir (getTeamMemPath =
 * join(getAutoMemPath, 'team')), así que una ruta de equipo coincide tanto
 * con isTeamMemPath como con isAutoMemFile. Se verifica equipo primero.
 *
 * Usar esto para telemetría con clave de alcance donde un único nombre de
 * evento distingue por campo scope — la jerarquía existente de nombres de
 * evento tengu_memdir_* / tengu_team_mem_* maneja el solape de otra forma
 * (las escrituras de equipo intencionalmente disparan ambas).
 */
export function memoryScopeForPath(filePath: string): MemoryScope | null {
  if (feature('TEAMMEM') && teamMemPaths!.isTeamMemPath(filePath)) {
    return 'team'
  }
  if (isAutoMemFile(filePath)) {
    return 'personal'
  }
  return null
}

/**
 * Verifica si una ruta de archivo está dentro de un directorio de memoria
 * de agente.
 */
function isAgentMemFile(filePath: string): boolean {
  if (isAutoMemoryEnabled()) {
    return isAgentMemoryPath(filePath)
  }
  return false
}

/**
 * Verifica si un archivo es un archivo de memoria gestionado por Claude
 * (NO archivos de instrucciones gestionados por el usuario). Incluye:
 * auto-memoria (memdir), memoria de agente, memoria/transcripts de sesión.
 * Excluye: CLAUDE.md, CLAUDE.local.md, .claude/rules/*.md (gestionados por
 * el usuario).
 *
 * Usar esto para la lógica de colapsar/badge donde los archivos
 * gestionados por el usuario deben mostrar diffs completos.
 */
export function isAutoManagedMemoryFile(filePath: string): boolean {
  if (isAutoMemFile(filePath)) {
    return true
  }
  if (feature('TEAMMEM') && teamMemPaths!.isTeamMemPath(filePath)) {
    return true
  }
  if (detectSessionFileType(filePath) !== null) {
    return true
  }
  if (isAgentMemFile(filePath)) {
    return true
  }
  return false
}

// Verifica si una ruta de directorio es un directorio relacionado con
// memoria. Usado por Grep/Glob, que reciben un `path` de directorio en vez
// de un archivo específico. Verifica tanto configDir como memoryBaseDir
// para manejar rutas de memoria custom.
export function isMemoryDirectory(dirPath: string): boolean {
  // SEGURIDAD: normalizar para prevenir bypasses de path traversal vía
  // segmentos `..`. En Windows esto produce backslashes; toComparable los
  // vuelve a girar para la comparación de cadenas. Las rutas MinGW
  // /c/... se convierten a nativas antes de llegar aquí (en tiempo de
  // extracción, en isShellCommandTargetingMemory), así que normalize()
  // nunca las ve.
  const normalizedPath = normalize(dirPath)
  const normalizedCmp = toComparable(normalizedPath)
  // Los directorios de memoria de agente pueden estar bajo cwd (alcance
  // proyecto), configDir, o memoryBaseDir.
  if (
    isAutoMemoryEnabled() &&
    (normalizedCmp.includes('/agent-memory/') ||
      normalizedCmp.includes('/agent-memory-local/'))
  ) {
    return true
  }
  // Los directorios de memoria de equipo viven bajo <autoMemPath>/team/.
  if (
    feature('TEAMMEM') &&
    teamMemPaths!.isTeamMemoryEnabled() &&
    teamMemPaths!.isTeamMemPath(normalizedPath)
  ) {
    return true
  }
  // Verifica el override de ruta de auto-memoria
  // (CLAUDE_COWORK_MEMORY_PATH_OVERRIDE).
  if (isAutoMemoryEnabled()) {
    const autoMemPath = getAutoMemPath()
    const autoMemDirCmp = toComparable(autoMemPath.replace(/[/\\]+$/, ''))
    const autoMemPathCmp = toComparable(autoMemPath)
    if (
      normalizedCmp === autoMemDirCmp ||
      normalizedCmp.startsWith(autoMemPathCmp)
    ) {
      return true
    }
  }

  const configDirCmp = toComparable(getClaudeConfigHomeDir())
  const memoryBaseCmp = toComparable(getMemoryBaseDir())
  const underConfig = normalizedCmp.startsWith(configDirCmp)
  const underMemoryBase = normalizedCmp.startsWith(memoryBaseCmp)

  if (!underConfig && !underMemoryBase) {
    return false
  }
  if (normalizedCmp.includes('/session-memory/')) {
    return true
  }
  if (underConfig && normalizedCmp.includes('/projects/')) {
    return true
  }
  if (isAutoMemoryEnabled() && normalizedCmp.includes('/memory/')) {
    return true
  }
  return false
}

/**
 * Verifica si una cadena de comando de shell (Bash o PowerShell) apunta a
 * archivos de memoria, extrayendo tokens de ruta absoluta y verificándolos
 * contra las funciones de detección de memoria. Se usa para comandos
 * Bash/PowerShell de grep/búsqueda en la lógica de colapso.
 */
export function isShellCommandTargetingMemory(command: string): boolean {
  const configDir = getClaudeConfigHomeDir()
  const memoryBase = getMemoryBaseDir()
  const autoMemDir = isAutoMemoryEnabled()
    ? getAutoMemPath().replace(/[/\\]+$/, '')
    : ''

  // Chequeo rápido: ¿el comando menciona el config, la memory base, o el
  // dir de auto-mem? Compara en forma con slash (PowerShell en Windows
  // puede usar cualquier separador mientras que configDir usa el nativo
  // de la plataforma). En Windows también verifica la forma MinGW
  // (/c/...) ya que BashTool corre bajo Git Bash, que emite esa
  // codificación. En Linux/Mac, configDir ya es posix así que solo hay una
  // forma que verificar — y crucialmente, windowsPathToPosixPath NO se
  // llama, así que rutas Linux como /m/foo no se malinterpretan como
  // MinGW.
  const commandCmp = toComparable(command)
  const dirs = [configDir, memoryBase, autoMemDir].filter(Boolean)
  const matchesAnyDir = dirs.some(d => {
    if (commandCmp.includes(toComparable(d))) return true
    if (IS_WINDOWS) {
      // BashTool en Windows (Git Bash) emite /c/Users/... — verificar
      // también la forma MinGW.
      return commandCmp.includes(windowsPathToPosixPath(d).toLowerCase())
    }
    return false
  })
  if (!matchesAnyDir) {
    return false
  }

  // Extrae tokens con forma de ruta absoluta. Coincide con rutas Unix
  // absolutas (/foo/bar), rutas con letra de unidad de Windows (C:\foo,
  // C:/foo), y rutas MinGW (/c/foo — ya empiezan con /, así que el regex
  // ya las captura). Los tokens de backslash suelto (\foo) se excluyen a
  // propósito — aparecen en patrones regex/grep y causarían falsos
  // positivos de clasificación de memoria tras la normalización que
  // invierte los backslashes a forward slashes.
  const matches = command.match(/(?:[A-Za-z]:[/\\]|\/)[^\s'"]+/g)
  if (!matches) {
    return false
  }

  for (const match of matches) {
    // Elimina metacaracteres de shell finales que podrían estar
    // adyacentes a una ruta.
    const cleanPath = match.replace(/[,;|&>]+$/, '')
    // En Windows, convierte MinGW /c/... → nativo C:\... en este único
    // punto. Los predicados downstream (isAutoManagedMemoryFile,
    // isMemoryDirectory, isAutoMemPath, isAgentMemoryPath) reciben
    // entonces rutas nativas y solo necesitan toComparable() para
    // comparar. En otras plataformas, las rutas ya son nativas — sin
    // conversión, así que /m/foo etc. pasan sin modificar.
    const nativePath = IS_WINDOWS
      ? posixPathToWindowsPath(cleanPath)
      : cleanPath
    if (isAutoManagedMemoryFile(nativePath) || isMemoryDirectory(nativePath)) {
      return true
    }
  }

  return false
}

// Verifica si un glob/patrón apunta solo a archivos de memoria
// auto-gestionada. Excluye CLAUDE.md, CLAUDE.local.md, .claude/rules/
// (gestionados por el usuario). Se usa para la lógica de badge de
// colapso, donde los archivos gestionados por el usuario no deben
// contarse como operaciones de "memoria".
export function isAutoManagedMemoryPattern(pattern: string): boolean {
  if (detectSessionPatternType(pattern) !== null) {
    return true
  }
  if (
    isAutoMemoryEnabled() &&
    (pattern.replace(/\\/g, '/').includes('agent-memory/') ||
      pattern.replace(/\\/g, '/').includes('agent-memory-local/'))
  ) {
    return true
  }
  return false
}
