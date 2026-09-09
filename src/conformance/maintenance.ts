/**
 * La política de caducidad de A.7.6: memoria rancia y skills inválidos.
 *
 * Fuente: `hbooks: book1/appendix-a-checklists.md`, §A.7 — «Is there
 * maintenance policy for stale memory, obsolete rules, and invalid skills?».
 *
 * De los tres sujetos, uno ya la tenía: las **reglas obsoletas** las mide
 * `src/verify/check_premise_drift.py`, que compara la premisa declarada de una
 * tarea contra el árbol y publica las que dejaron de ser ciertas. Este módulo
 * cubre los otros dos, que no tenían ninguno.
 *
 * NO retira nada. Una política de mantenimiento que borra por su cuenta es
 * una que nadie deja correr: lo que hace falta es que el defecto sea VISIBLE
 * y CONTABLE, con su exceso y su razón, para que quien decida tenga con qué.
 * Retirar es una decisión, medir no.
 *
 * *Métrica:* archivos de memoria por longitud en caracteres contra
 * `MAX_MEMORY_CHARACTER_COUNT`, y directorios de `.claude/skills` contra tres
 * condiciones de forma (existe `SKILL.md`, declara `name` y `description`, y
 * su `name` casa con el directorio).
 * *Ciega a:* la memoria que está DENTRO de la cota y aun así no sirve —una
 * regla vigente en su tamaño y falsa en su contenido no aparece aquí, y ésa
 * es la que mide el gate de premisas—; y al skill bien formado cuyo cuerpo
 * manda algo que ya no existe. Mide FORMA, no vigencia.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
// Import RELATIVO y no por nombre de paquete: `src/conformance/` vive fuera
// de `src/packages/`, así que el alcance `@thyrox/*` no resuelve desde aquí.
// Es el mismo puente que `cli/src/argv.ts` documenta, y por la misma razón:
// funciona hoy sin tocar el lockfile del workspace.
import { MAX_MEMORY_CHARACTER_COUNT } from '../packages/storage/src/claudemd.ts'

/** La cota, reexportada: quien mide contra ella no debería cruzar el puente. */
export { MAX_MEMORY_CHARACTER_COUNT }

/** Un archivo de memoria por encima de la cota, con cuánto se pasa. */
export type StaleMemory = {
  /** Ruta relativa a la raíz — es lo que se cita, no la absoluta. */
  readonly path: string
  readonly chars: number
  /** Cuántos caracteres sobran. Un sí/no no distingue 500 de 40 000. */
  readonly overBy: number
}

/** Un skill que no cumple la forma, con la razón concreta. */
export type InvalidSkill = {
  /** El nombre del DIRECTORIO, que es como se le busca. */
  readonly name: string
  readonly reason: string
}

export type MaintenanceReport = {
  readonly staleMemory: readonly StaleMemory[]
  readonly invalidSkills: readonly InvalidSkill[]
  /** El denominador: sobre cuántos se midió cada eje. */
  readonly memoryFilesChecked: number
  readonly skillsChecked: number
}

/** Las rutas de memoria del árbol, en el orden en que se cargan. */
function memoryPaths(root: string): string[] {
  const fijas = ['CLAUDE.md', join('.claude', 'CLAUDE.md')]
  const dirReglas = join(root, '.claude', 'rules')
  const reglas = existsSync(dirReglas)
    ? readdirSync(dirReglas).filter((f) => f.endsWith('.md')).sort()
        .map((f) => join('.claude', 'rules', f))
    : []
  return [...fijas, ...reglas].filter((p) => existsSync(join(root, p)))
}

/** Las memorias que se pasan de la cota recomendada. */
export function staleMemory(root: string): StaleMemory[] {
  const out: StaleMemory[] = []
  for (const ruta of memoryPaths(root)) {
    const chars = readFileSync(join(root, ruta), 'utf8').length
    if (chars > MAX_MEMORY_CHARACTER_COUNT) {
      out.push({ path: ruta, chars, overBy: chars - MAX_MEMORY_CHARACTER_COUNT })
    }
  }
  return out
}

/**
 * El valor de una clave del frontmatter, sin comillas. `null` si no está.
 *
 * Reconoce las DOS formas que este árbol usa —cerca ```yml y guiones `---`—,
 * y esa segunda mitad no es cortesía. Medido: con sólo `---`, el instrumento
 * marcaba `cosmic`, `python-mcp` y `thyrox` como «sin `name`» teniéndolo, y
 * los tres son de la forma cercada. Habría publicado tres defectos falsos y
 * el arreglo habría sido reescribir tres skills sanos.
 *
 * Es el mismo criterio que `parseRule` de `systemPrompt.ts` ya aplicaba
 * («las dos formas del árbol»), y que aquí faltaba: medir una forma del
 * significante y concluir sobre el contenido. Cuál de las dos debería ser la
 * canónica es decisión del ejecutor, no de este gate — lo que el gate NO
 * puede hacer es tomarla por su cuenta llamando defecto a la otra.
 */
function frontmatterValue(texto: string, clave: string): string | null {
  const cercado = /^```ya?ml\r?\n([\s\S]*?)\r?\n```/.exec(texto)
  const guiones = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto)
  const m = cercado ?? guiones
  if (!m) return null
  const linea = new RegExp(`^${clave}:\\s*(.+)$`, 'm').exec(m[1])
  if (!linea) return null
  return linea[1].trim().replace(/^["']|["']$/g, '')
}

/**
 * Los skills que no cumplen la forma.
 *
 * Tres condiciones, y la tercera es la que menos se ve a ojo: un `name` que
 * no casa con su directorio rompe la búsqueda por nombre del registro sin
 * romper nada al leerlo.
 */
export function invalidSkills(root: string): InvalidSkill[] {
  const dir = join(root, '.claude', 'skills')
  if (!existsSync(dir)) return []
  const out: InvalidSkill[] = []
  for (const name of readdirSync(dir).sort()) {
    const ruta = join(dir, name)
    if (!statSync(ruta).isDirectory()) continue
    const manifiesto = join(ruta, 'SKILL.md')
    if (!existsSync(manifiesto)) {
      out.push({ name, reason: 'sin SKILL.md' })
      continue
    }
    const texto = readFileSync(manifiesto, 'utf8')
    const declarado = frontmatterValue(texto, 'name')
    if (!declarado) { out.push({ name, reason: 'sin `name` en el frontmatter' }); continue }
    if (!frontmatterValue(texto, 'description')) {
      out.push({ name, reason: 'sin `description` en el frontmatter' })
      continue
    }
    if (declarado !== name) {
      out.push({ name, reason: `su \`name\` es \`${declarado}\` y su directorio \`${name}\`` })
    }
  }
  return out
}

/** Los dos ejes con su denominador al lado. */
export function maintenanceReport(root: string): MaintenanceReport {
  const dirSkills = join(root, '.claude', 'skills')
  const skills = existsSync(dirSkills)
    ? readdirSync(dirSkills).filter((n) => statSync(join(dirSkills, n)).isDirectory())
    : []
  return {
    staleMemory: staleMemory(root),
    invalidSkills: invalidSkills(root),
    memoryFilesChecked: memoryPaths(root).length,
    skillsChecked: skills.length,
  }
}
