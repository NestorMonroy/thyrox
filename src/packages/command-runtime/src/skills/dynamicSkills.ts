/**
 * Skills dinámicas: las que aparecen al tocar archivos y no al arrancar.
 *
 * Porte del contrato de Claude Code 2.1.275 (`chunk-q2gh92k2.js` del
 * bundle, `_references/claude-code-bin/2.1.275/bunfs-root/`); los nombres
 * minificados van entre paréntesis para rastrearlos:
 *
 * - estado (`T3n`/`RT`/`iue`): directorios ya vistos, skills dinámicas por
 *   clave, skills condicionales pendientes y los nombres ya activados;
 * - `dynamicSkillKey` (`BFe`): `skillRoot` + NUL + nombre;
 * - `addSkillDirectories` (`Spt`), `getDynamicSkills` (`zUt`),
 *   `getConditionalSkills` (`GUt`), `activateConditionalSkillsForPaths`
 *   (`Ajn`), `discoverSkillDirsForPaths` (`lfs`), `onDynamicSkillsLoaded`
 *   (`J$r`) y el vaciado que `clearSkillCaches` hace (`Q$r`).
 *
 * DIVERGENCIAS DECLARADAS:
 * - El binario guarda un estado por clave de sesión (`sue()`); aquí hay uno
 *   por proceso. El único consumidor de este árbol es la sesión en curso.
 * - El cargador de un directorio de skills (`Kz`: leer `SKILL.md`, parsear
 *   el frontmatter, construir el comando) es una costura
 *   (`setSkillDirectoryLoader`). `loadSkillsDir.ts` lo inyecta al cargar el
 *   módulo con su `loadSkillsFromSkillsDir` y la compuerta de política; sin
 *   ese módulo cargado —o con el cargador puesto a `null` por una suite—,
 *   `addSkillDirectories` no añade skills.
 * - `discoverSkillDirsForPaths` no aplica los prefijos que el almacenamiento
 *   v5 declara propios (`syncOwnedPrefixes`) ni la regla de nombres cortos
 *   8.3 de Windows: los dos dependen de piezas ausentes aquí.
 * - `mee` descarta y reporta patrones inválidos antes de pasarlos a
 *   `ignore`; aquí se pasan tal cual.
 * - `lfs` devuelve `[]` cuando la sesión arrancó con una raíz de
 *   configuración de proyecto explícita (`So()`, que es
 *   `host.launchOptions.projectConfigRoot()`, en `chunk-4qqe0nh4.js`); este
 *   árbol no tiene esa opción de arranque, así que la guarda no aplica.
 *   Verificado con el extractor por parser, no por subcadena:
 *   `.claude/workbench/verificar-porte-2-1-275-*`.
 * - Las compuertas de política (`zr('skills')`, `Tr('projectSettings')`,
 *   `Ic('skills')`) y la telemetría (`tengu_dynamic_skills_changed`) no
 *   tienen contraparte en este paquete.
 */
import { execFile } from 'child_process'
import { stat } from 'fs/promises'
import ignore from 'ignore'
import { dirname, isAbsolute, join, relative, sep } from 'path'

/** El subconjunto de un comando de tipo prompt que este módulo lee. */
export type DynamicPromptSkill = {
  type: 'prompt'
  name: string
  source: string
  skillRoot?: string
  paths?: string[]
  [key: string]: unknown
}

export type LoadedSkill = { skill: DynamicPromptSkill; filePath: string }
export type SkillDirectoryLoader = (dir: string) => Promise<LoadedSkill[]>

type DynamicSkillState = {
  dynamicSkillDirs: Set<string>
  dynamicSkills: Map<string, DynamicPromptSkill>
  conditionalSkills: Map<string, DynamicPromptSkill>
  activatedConditionalSkillNames: Set<string>
}

function newState(): DynamicSkillState {
  return {
    dynamicSkillDirs: new Set(),
    dynamicSkills: new Map(),
    conditionalSkills: new Map(),
    activatedConditionalSkillNames: new Set(),
  }
}

let state: DynamicSkillState = newState()
let loader: SkillDirectoryLoader | null = null
const listeners = new Set<() => void>()

function emitLoaded(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // El binario registra el error y sigue: un oyente roto no calla a los demás.
    }
  }
}

export function setSkillDirectoryLoader(next: SkillDirectoryLoader | null): void {
  loader = next
}

export function dynamicSkillKey(skill: DynamicPromptSkill): string {
  return `${skill.type === 'prompt' ? (skill.skillRoot ?? '') : ''}\u0000${skill.name}`
}

/** Guarda una skill condicional hasta que un archivo tocado case sus `paths`. */
export function registerConditionalSkill(skill: DynamicPromptSkill): void {
  if (!state.activatedConditionalSkillNames.has(skill.name)) {
    state.conditionalSkills.set(skill.name, skill)
  }
}

export function onDynamicSkillsLoaded(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getDynamicSkills(): DynamicPromptSkill[] {
  return [...state.dynamicSkills.entries()]
    .sort(([ka, a], [kb, b]) => (a.name === b.name ? ka.localeCompare(kb) : a.name.localeCompare(b.name)))
    .map(([, skill]) => skill)
}

export function getConditionalSkills(): DynamicPromptSkill[] {
  return [...state.conditionalSkills.values()]
}

/**
 * Si una condicional ya se activó en esta sesión. El cargador de arranque lo
 * consulta para devolverla como incondicional en vez de volver a apartarla —
 * la fuente lee `activatedConditionalSkillNames` directamente; aquí el
 * estado vive en este módulo y se pregunta por esta costura.
 */
export function isConditionalSkillActivated(name: string): boolean {
  return state.activatedConditionalSkillNames.has(name)
}

export function activateConditionalSkillsForPaths(filePaths: string[], cwd: string): string[] {
  if (state.conditionalSkills.size === 0) return []
  const activated: string[] = []
  for (const [name, skill] of state.conditionalSkills) {
    if (skill.type !== 'prompt' || !skill.paths || skill.paths.length === 0) continue
    const matcher = ignore().add(skill.paths)
    for (const filePath of filePaths) {
      const rel = isAbsolute(filePath) ? relative(cwd, filePath) : filePath
      if (!rel || rel.startsWith('..') || isAbsolute(rel)) continue
      if (matcher.ignores(rel)) {
        state.dynamicSkills.set(dynamicSkillKey(skill), skill)
        state.conditionalSkills.delete(name)
        state.activatedConditionalSkillNames.add(name)
        activated.push(name)
        break
      }
    }
  }
  if (activated.length > 0) emitLoaded()
  return activated
}

export async function addSkillDirectories(
  dirs: string[],
  options: { replace?: boolean } = {},
): Promise<void> {
  if (dirs.length === 0) return
  const load = loader ?? (async () => [])
  const loaded = await Promise.all(dirs.map(dir => load(dir)))
  if (options.replace) {
    const fresh = new Set(loaded.flat().map(({ skill }) => dynamicSkillKey(skill)))
    const underDirs = (skill: DynamicPromptSkill): boolean => {
      const root = skill.type === 'prompt' ? (skill.skillRoot ?? '') : ''
      return dirs.some(dir => {
        const rel = relative(dir, root)
        return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
      })
    }
    for (const [key, skill] of state.dynamicSkills) {
      if (underDirs(skill) && !fresh.has(key)) state.dynamicSkills.delete(key)
    }
  }
  for (const batch of loaded) {
    for (const { skill } of batch) {
      if (skill.type === 'prompt') state.dynamicSkills.set(dynamicSkillKey(skill), skill)
    }
  }
  emitLoaded()
}

function isGitIgnored(path: string, cwd: string): Promise<boolean> {
  return new Promise(resolve => {
    execFile('git', ['check-ignore', '--', path], { cwd }, error => resolve(error === null))
  })
}

export async function discoverSkillDirsForPaths(filePaths: string[], cwd: string): Promise<string[]> {
  const root = cwd.endsWith(sep) ? cwd.slice(0, -1) : cwd
  const found: string[] = []
  for (const filePath of filePaths) {
    let dir = dirname(filePath)
    while (dir.startsWith(root + sep)) {
      const candidate = join(dir, '.claude', 'skills')
      if (!state.dynamicSkillDirs.has(candidate)) {
        state.dynamicSkillDirs.add(candidate)
        try {
          await stat(candidate)
          if (await isGitIgnored(dir, root)) {
            // El binario lo registra en depuración: `[skills] Skipped gitignored skills dir`.
          } else {
            found.push(candidate)
          }
        } catch {
          // No existe: nada que descubrir aquí.
        }
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return found
}

/** El vaciado del estado dinámico (`Q$r`); `clearSkillCaches` lo compone. */
export function clearDynamicSkills(): void {
  state = newState()
}
