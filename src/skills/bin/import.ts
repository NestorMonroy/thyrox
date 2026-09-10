#!/usr/bin/env bun
/**
 * Lee un `SKILL.md` YA existente en `skillsDir()` y escribe su definición
 * TypeScript — `definitions/<camelName>.ts` + `.prompt.md` — para que deje
 * de ser la única fuente y pase a ser el artefacto DERIVADO.
 *
 * Es la vía inversa de `bin/emit.ts`, y existe por la misma razón que un
 * `inspectdb`: bootstrapear un skill que ya vive en disco, escrito a mano,
 * sin retipearlo. Una vez importado, la fuente es la definición — un
 * `import` posterior sobre el mismo nombre SOBREESCRIBE su `.ts`/`.prompt.md`
 * con lo que hay en disco en ese momento, así que no es idempotente si el
 * `.md` cambió por otra vía: es una operación de bootstrap, no de sincronía
 * continua (para eso está `emit.ts`, en la dirección contraria).
 *
 * Uso:
 *   bun run bin/import.ts <nombre...>     # uno o varios, por nombre de skill
 *   bun run bin/import.ts --all           # todos los presentes en skillsDir()
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { EffortValue, SkillDefinition } from '../types.ts'
import { EFFORT_LEVELS } from '../types.ts'
import { skillArtifacts, skillsDir } from '../paths.ts'

const HERE = join(import.meta.dirname, '..', 'definitions')

/** `ba-elicitation` -> `baElicitation`. Mismo criterio que el paquete de agentes. */
export function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase())
}

/** Deshace el escapado de una cadena YAML citada con comillas dobles. */
function unquote(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed
  return trimmed
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** Parsea `["a", "b"]` — la única forma de lista que estos frontmatter usan. */
function parseFlowList(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '')
  if (inner.trim() === '') return []
  // Las comillas de cada elemento son literales dobles sin `\"` interno en
  // el corpus medido (0 backslashes en los 71 `triggers:` — ver el análisis
  // del pase). Un split ingenuo por `", "` basta para ese universo; una
  // lista con comas dentro de un elemento citado quedaría mal partida, y
  // eso es una ceguera declarada, no un supuesto silencioso.
  return inner.split(/",\s*"/).map((piece) => unquote(`"${piece.replace(/^"|"$/g, '')}"`))
}

type ParsedFrontmatter = {
  name: string
  description: string
  allowedTools?: string[]
  effort?: EffortValue
  disableModelInvocation?: boolean
  metadata?: { triggers: string[] }
}

/** Extrae el bloque de frontmatter y el cuerpo de un `SKILL.md` en disco. */
export function parseSkillMarkdown(text: string): { fields: ParsedFrontmatter; prompt: string } {
  const match = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(text)
  if (!match) {
    throw new Error('el archivo no tiene la forma esperada: ---\\n…\\n---\\n\\n<cuerpo>')
  }
  const [, frontmatter, prompt] = match
  const lines = (frontmatter ?? '').split('\n')

  let name: string | undefined
  let description: string | undefined
  let allowedTools: string[] | undefined
  let effort: EffortValue | undefined
  let disableModelInvocation: boolean | undefined
  let triggers: string[] | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.startsWith('name: ')) name = line.slice('name: '.length).trim()
    else if (line.startsWith('description: ')) description = unquote(line.slice('description: '.length))
    else if (line.startsWith('allowed-tools: ')) {
      allowedTools = line.slice('allowed-tools: '.length).trim().split(/\s+/)
    } else if (line.startsWith('effort: ')) {
      const value = line.slice('effort: '.length).trim()
      if (!(EFFORT_LEVELS as readonly string[]).includes(value)) {
        throw new Error(`effort desconocido: ${value}`)
      }
      effort = value as EffortValue
    } else if (line.startsWith('disable-model-invocation: ')) {
      disableModelInvocation = line.slice('disable-model-invocation: '.length).trim() === 'true'
    } else if (line === 'metadata:') {
      const next = lines[i + 1] ?? ''
      if (next.startsWith('  triggers: ')) {
        // Forma de flujo, en una sola línea: `  triggers: ["a", "b"]`.
        triggers = parseFlowList(next.slice('  triggers: '.length))
        i += 1
      } else if (next === '  triggers:') {
        // Forma de BLOQUE — cada trigger en su propia línea `    - "…"`. Es
        // la MITAD del corpus (29 de 71) que la primera medición de este
        // pase no distinguió de la de flujo: contar backslashes no mide la
        // sintaxis de la lista, y ese hueco perdió los triggers de estos 29
        // archivos en la primera corrida del emisor (nunca se llegó a
        // commitear). Ver el análisis de esta iniciativa.
        const parsed: string[] = []
        let j = i + 2
        while (j < lines.length) {
          const itemLine = lines[j] ?? ''
          const match = /^ {4}- (.+)$/.exec(itemLine)
          if (!match) break
          parsed.push(unquote(match[1] ?? ''))
          j += 1
        }
        triggers = parsed
        i = j - 1
      }
    }
  }

  if (name === undefined) throw new Error('el frontmatter no declara name')
  if (description === undefined) throw new Error('el frontmatter no declara description')

  const fields: ParsedFrontmatter = { name, description }
  if (allowedTools !== undefined) fields.allowedTools = allowedTools
  if (effort !== undefined) fields.effort = effort
  if (disableModelInvocation !== undefined) fields.disableModelInvocation = disableModelInvocation
  if (triggers !== undefined) fields.metadata = { triggers }
  return { fields, prompt: prompt ?? '' }
}

/** El literal TS del objeto `AgentDefinition`-like, sin el prompt (aparte). */
function toDefinitionSource(camelName: string, fields: ParsedFrontmatter): string {
  const lines: string[] = []
  lines.push("import { readFileSync } from 'node:fs'")
  lines.push("import { dirname, join } from 'node:path'")
  lines.push("import { fileURLToPath } from 'node:url'")
  lines.push("import type { SkillDefinition } from '../types.ts'")
  lines.push('')
  lines.push('const HERE = dirname(fileURLToPath(import.meta.url))')
  lines.push('')
  lines.push('/**')
  lines.push(` * El prompt vive en su propio archivo — es prosa larga, con tablas y`)
  lines.push(' * rutas relativas a `./assets/` y `./references/` propios del skill.')
  lines.push(' * Ese `.md` NO es la fuente de la definición: no lleva frontmatter.')
  lines.push(' */')
  lines.push('function readPrompt(): string {')
  lines.push(`  return readFileSync(join(HERE, '${camelName}.prompt.md'), 'utf8')`)
  lines.push('}')
  lines.push('')
  lines.push(`export const ${camelName}: SkillDefinition = {`)
  lines.push(`  name: '${fields.name}',`)
  lines.push(`  description: ${JSON.stringify(fields.description)},`)
  if (fields.allowedTools !== undefined) {
    lines.push(`  allowedTools: ${JSON.stringify(fields.allowedTools)},`)
  }
  if (fields.effort !== undefined) {
    lines.push(`  effort: '${fields.effort}',`)
  }
  if (fields.disableModelInvocation !== undefined) {
    lines.push(`  disableModelInvocation: ${fields.disableModelInvocation},`)
  }
  if (fields.metadata !== undefined) {
    lines.push(`  metadata: { triggers: ${JSON.stringify(fields.metadata.triggers)} },`)
  }
  lines.push('  get prompt(): string {')
  lines.push('    return readPrompt()')
  lines.push('  },')
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

/** Importa un skill por nombre: escribe su `.ts` + `.prompt.md`. Devuelve el nombre camelCase. */
/**
 * `outDir` es un parámetro — por defecto `definitions/` real — para que un
 * test pueda importar un fixture SIN escribir sobre la definición real de
 * un skill que ya está importado. Sin este parámetro, un test de
 * `sp-adjust` sintético sobreescribiría el `spAdjust.ts` genuino.
 */
export function importSkill(name: string, dir: string = skillsDir(), outDir: string = HERE): string {
  const source = readFileSync(join(dir, name, 'SKILL.md'), 'utf8')
  const { fields, prompt } = parseSkillMarkdown(source)
  if (fields.name !== name) {
    throw new Error(`el directorio '${name}' declara name: '${fields.name}' — no coinciden`)
  }
  const camelName = toCamelCase(name)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, `${camelName}.prompt.md`), prompt, 'utf8')
  writeFileSync(join(outDir, `${camelName}.ts`), toDefinitionSource(camelName, fields), 'utf8')
  return camelName
}

function main(): void {
  const argv = process.argv.slice(2)
  const dir = skillsDir()
  const names = argv.includes('--all')
    ? skillArtifacts(dir).filter((n) => existsSync(join(dir, n, 'SKILL.md')))
    : argv
  if (names.length === 0) {
    console.error('ERROR — sin nombres que importar. Usa <nombre...> o --all.')
    process.exit(2)
  }
  const camelNames: string[] = []
  for (const name of names) {
    const camelName = importSkill(name, dir)
    camelNames.push(camelName)
    console.log(`importado    ${name} -> definitions/${camelName}.ts`)
  }
  console.log(`import: ${camelNames.length} skill(s) (alcance medido: ${dir})`)
}

if (import.meta.main) main()
