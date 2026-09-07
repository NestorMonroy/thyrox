/**
 * El adaptador de un `SKILL.md` de disco al sustrato de código (#14, sobre #9).
 *
 * Un `SKILL.md` es texto con frontmatter; el sustrato es una `SkillDefinition`
 * cuyo prompt es una función y cuyos apoyos van embebidos. Este adaptador es el
 * puente genérico: **un solo lector**, sin lógica por skill. Lee el frontmatter,
 * separa el cuerpo, y embebe todos los archivos de apoyo del directorio.
 *
 * Por qué un lector de frontmatter propio y no una dependencia YAML: el universo
 * está medido —los cinco skills sólo-apoyo (`triaje-skills-md-*`, clase sin
 * `a`)— y sus claves de interés (`name`, `description`, `allowed-tools`,
 * `disable-model-invocation`) son escalares en columna cero. Un lector por línea
 * las cubre; las claves anidadas (`metadata:`) quedan fuera por su sangría, y no
 * se mapean. La suite se cotea contra los cinco archivos reales, así que una
 * forma de frontmatter no cubierta hace fallar un caso — no pasa en silencio.
 *
 * El barrido de apoyo es **completo, no un allowlist**: todo archivo bajo el
 * directorio salvo `SKILL.md`. Un allowlist de {scripts,references,assets}
 * dejaría fuera `sphinx/evals/evals.json` en silencio, que es el porte parcial
 * que `porte-completo-no-parcial.md` prohíbe.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { SkillDefinition } from './registry.ts'

/** Detecta el fence del frontmatter y separa meta de cuerpo. */
function splitFrontmatter(raw: string): { meta: Map<string, string>; body: string } {
  const lines = raw.split('\n')
  const first = (lines[0] ?? '').trimEnd()
  // Dos estilos medidos: `---` y un fence cercado (```yml / ```yaml / ```).
  const close = first === '---' ? '---' : first.startsWith('```') ? '```' : null
  if (close === null) return { meta: new Map(), body: raw }

  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === close) { end = i; break }
  }
  if (end === -1) return { meta: new Map(), body: raw } // frontmatter sin cerrar

  const meta = new Map<string, string>()
  for (let i = 1; i < end; i++) {
    const line = lines[i]
    // Sólo claves en columna cero: las anidadas (metadata:) llevan sangría.
    const m = /^([A-Za-z][\w-]*):\s?(.*)$/.exec(line)
    if (m && !/^\s/.test(line)) meta.set(m[1], m[2])
  }

  // El cuerpo empieza tras el cierre; se recortan las líneas en blanco iniciales.
  let start = end + 1
  while (start < lines.length && lines[start].trim() === '') start++
  return { meta, body: lines.slice(start).join('\n') }
}

/** Quita un par de comillas envolventes si las hay — la descripción va citada o desnuda. */
function unquote(v: string): string {
  const t = v.trim()
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1)
  }
  return t
}

/** Todo archivo bajo `dir` salvo `SKILL.md`, con su ruta relativa posix y contenido. */
function embedSupportFiles(dir: string): Record<string, string> {
  const files: Record<string, string> = {}
  const walk = (abs: string, rel: string): void => {
    for (const entry of readdirSync(abs)) {
      const childAbs = join(abs, entry)
      const childRel = rel ? `${rel}/${entry}` : entry
      if (statSync(childAbs).isDirectory()) walk(childAbs, childRel)
      else if (childRel !== 'SKILL.md') files[childRel] = readFileSync(childAbs, 'utf8')
    }
  }
  walk(dir, '')
  return files
}

/**
 * Adapta el `SKILL.md` de `dir` a una `SkillDefinition` que el registry consume.
 *
 * `name` y `description` son obligatorios: un `SKILL.md` sin ellos está mal
 * formado y se lanza en vez de registrar un skill sin identidad. `allowed-tools`
 * y `disable-model-invocation` son opcionales (sphinx no declara el primero).
 */
export function fromSkillDir(dir: string): SkillDefinition {
  const raw = readFileSync(join(dir, 'SKILL.md'), 'utf8')
  const { meta, body } = splitFrontmatter(raw)

  const name = meta.get('name')?.trim()
  if (!name) throw new Error(`SKILL.md sin 'name' en ${dir}`)
  const description = meta.get('description')
  if (description === undefined) throw new Error(`SKILL.md sin 'description' en ${dir}`)

  const allowedRaw = meta.get('allowed-tools')
  const allowedTools = allowedRaw ? allowedRaw.trim().split(/\s+/).filter(Boolean) : undefined

  const def: SkillDefinition = {
    name,
    description: unquote(description),
    getPrompt: () => [{ type: 'text', text: body }],
    files: embedSupportFiles(dir),
  }
  if (allowedTools && allowedTools.length > 0) def.allowedTools = allowedTools
  if (meta.get('disable-model-invocation')?.trim() === 'true') def.disableModelInvocation = true
  return def
}

/** El nombre del skill que vive en `dir` — su basename, para diagnósticos. */
export function skillNameFromDir(dir: string): string {
  return basename(dir)
}
