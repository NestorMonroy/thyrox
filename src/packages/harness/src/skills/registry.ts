/**
 * El skill como codigo — el segundo sustrato del corpus de referencia.
 *
 * Un `SKILL.md` es un texto: su contenido es el mismo en toda invocacion. Un
 * skill como codigo tiene dos diferencias, y ninguna es de formato:
 *
 * 1. **El prompt es una funcion.** Recibe los argumentos y el estado de la
 *    sesion, asi que puede decidir que decir en vez de ser una plantilla que
 *    alguien rellena.
 * 2. **Los archivos de apoyo van EMBEBIDOS y se extraen al invocar.** El
 *    directorio sigue existiendo para el modelo —que los lee con `Read`/`Grep`
 *    igual que si vivieran en `references/`— y deja de existir en el
 *    repositorio como arbol de archivos sueltos que nadie versiona.
 *
 * Adaptado de `ccb: packages/command-runtime/src/skills/bundledSkills.ts`
 * (`registerBundledSkill`), incluida su frontera de seguridad: nonce por
 * proceso en la raiz, `O_EXCL|O_NOFOLLOW` al escribir, modo 0600/0700, y
 * rechazo de toda ruta que se escape del directorio del skill.
 */
import { randomBytes } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import { mkdir, open } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, normalize, sep } from 'node:path'
import type { ContentBlock, Message } from '../types.ts'

/** Lo que la invocacion le entrega al prompt. */
export type SkillContext = {
  /** El texto que sigue al nombre del skill. */
  args: string
  /** El hilo de la sesion — la mitad que un `SKILL.md` no puede leer. */
  messages: Message[]
  cwd?: string
}

export type SkillDefinition = {
  name: string
  description: string
  aliases?: string[]
  whenToUse?: string
  argumentHint?: string
  allowedTools?: string[]
  model?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  /** Si devuelve `false`, el skill no se lista ni se puede invocar. */
  isEnabled?: () => boolean
  /** `inline` lo ejecuta en el hilo; `fork` lo delega a un subagente. */
  context?: 'inline' | 'fork'
  agent?: string
  /**
   * Archivos de apoyo: ruta relativa -> contenido. Se extraen una vez por
   * proceso, y el prompt se prefija con la linea que le dice al modelo donde
   * quedaron — mismo contrato que un skill de disco.
   */
  files?: Record<string, string>
  getPrompt: (ctx: SkillContext) => ContentBlock[] | Promise<ContentBlock[]>
}

/** Un nombre de skill es UN segmento de ruta, no una ruta. */
const SKILL_NAME = /^[a-z0-9][a-z0-9._-]*$/i

function assertName(name: string): string {
  if (!SKILL_NAME.test(name) || name === '.' || name === '..') {
    throw new Error(`nombre de skill invalido: ${JSON.stringify(name)}`)
  }
  return name
}

/**
 * El directorio de extraccion de un skill.
 *
 * Valida el nombre aqui y no solo al registrar: es la unica via a la ruta, y
 * un `join(raiz, nombre)` crudo con `..` sale del arbol sin que nadie avise.
 */
export function extractDirFor(root: string, name: string): string {
  return join(root, assertName(name))
}

/**
 * `O_EXCL` rehusa escribir sobre lo que ya existe y `O_NOFOLLOW` rehusa seguir
 * un enlace en el ultimo tramo. NO se hace `unlink` y reintento ante `EEXIST`:
 * `unlink` sigue los enlaces intermedios, asi que el reintento reabriria justo
 * el agujero que estas dos banderas cierran.
 */
const O_NOFOLLOW = fsConstants.O_NOFOLLOW ?? 0
const SAFE_WRITE_FLAGS =
  process.platform === 'win32'
    ? 'wx'
    : fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW

/** Resuelve una ruta relativa al skill; lanza si se escapa. */
function resolveSkillFilePath(baseDir: string, relPath: string): string {
  const normalized = normalize(relPath)
  if (
    isAbsolute(normalized) ||
    normalized.split(sep).includes('..') ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(`la ruta del archivo se escapa del skill: ${relPath}`)
  }
  return join(baseDir, normalized)
}

async function writeSkillFiles(dir: string, files: Record<string, string>): Promise<void> {
  // Agrupadas por directorio padre: un `mkdir` por subarbol, no uno por archivo.
  const byParent = new Map<string, [string, string][]>()
  for (const [relPath, content] of Object.entries(files)) {
    const target = resolveSkillFilePath(dir, relPath)
    const parent = dirname(target)
    const group = byParent.get(parent)
    if (group) group.push([target, content])
    else byParent.set(parent, [[target, content]])
  }
  for (const [parent, entries] of byParent) {
    await mkdir(parent, { recursive: true, mode: 0o700 })
    for (const [path, content] of entries) {
      const fh = await open(path, SAFE_WRITE_FLAGS, 0o600)
      try {
        await fh.writeFile(content, 'utf8')
      } finally {
        await fh.close()
      }
    }
  }
}

/**
 * El prefijo se FUNDE en el primer bloque si ese bloque es texto. Anteponerlo
 * siempre como bloque propio parte en dos lo que el modelo lee como una sola
 * instruccion.
 */
function prependBaseDir(blocks: ContentBlock[], baseDir: string): ContentBlock[] {
  const prefix = `Base directory for this skill: ${baseDir}\n\n`
  const first = blocks[0]
  if (first && first.type === 'text') {
    return [{ type: 'text', text: prefix + first.text }, ...blocks.slice(1)]
  }
  return [{ type: 'text', text: prefix }, ...blocks]
}

type Registered = SkillDefinition & { extractDir?: string }

export type SkillRegistryOptions = {
  /** Raiz de extraccion. Sin ella, una con nonce por proceso. */
  extractRoot?: string
}

export class SkillRegistry {
  /**
   * La raiz lleva un **nonce aleatorio** y ese nonce es la defensa que carga
   * el peso: todo lo demas del camino —uid, nombre del skill, claves de
   * `files`— es publico, asi que sin el un atacante local puede pre-crear el
   * arbol en un `/tmp` compartido y colocar un enlace en un tramo intermedio,
   * que `O_NOFOLLOW` no cubre.
   */
  readonly root: string

  private readonly skills = new Map<string, Registered>()
  /** La PROMESA de extraccion, no su resultado — ver `invoke`. */
  private readonly extracting = new Map<string, Promise<string | null>>()
  private readonly extractionCount = new Map<string, number>()

  constructor(options: SkillRegistryOptions = {}) {
    this.root =
      options.extractRoot ?? join(tmpdir(), 'harness-skills', randomBytes(16).toString('hex'))
  }

  register(definition: SkillDefinition): void {
    const name = assertName(definition.name)
    if (this.skills.has(name)) {
      throw new Error(`el skill ${name} ya esta registrado`)
    }
    const files = definition.files
    this.skills.set(name, {
      ...definition,
      extractDir: files && Object.keys(files).length > 0 ? extractDirFor(this.root, name) : undefined,
    })
  }

  get(name: string): Registered | undefined {
    return this.skills.get(name)
  }

  /** Los que un modelo puede ver: `isEnabled` decide. */
  list(): Registered[] {
    return [...this.skills.values()].filter((s) => s.isEnabled?.() ?? true)
  }

  /** Cuantas veces se extrajo — un proceso deberia dar 1, no una por invocacion. */
  extractions(name: string): number {
    return this.extractionCount.get(name) ?? 0
  }

  async invoke(name: string, ctx: SkillContext): Promise<ContentBlock[]> {
    const skill = this.skills.get(name)
    if (!skill) throw new Error(`no hay skill llamado ${name}`)
    if (!(skill.isEnabled?.() ?? true)) throw new Error(`el skill ${name} esta deshabilitado`)

    const blocks = await skill.getPrompt(ctx)
    if (!skill.extractDir || !skill.files) return blocks

    // Se memoiza la promesa y no el resultado: con el resultado, dos
    // invocaciones concurrentes entran las dos a extraer y la segunda choca
    // con `O_EXCL` sobre lo que la primera acaba de escribir.
    let pending = this.extracting.get(name)
    if (!pending) {
      const files = skill.files
      const dir = skill.extractDir
      pending = writeSkillFiles(dir, files).then(
        () => {
          this.extractionCount.set(name, (this.extractionCount.get(name) ?? 0) + 1)
          return dir
        },
        () => null,   // extraccion fallida: el skill sigue sirviendo, sin prefijo
      )
      this.extracting.set(name, pending)
    }
    const dir = await pending
    return dir === null ? blocks : prependBaseDir(blocks, dir)
  }
}
