/**
 * #14 — el adaptador de un `SKILL.md` de disco al sustrato de código (#9).
 *
 * Fuente del porte: la forma de los `SKILL.md` reales, medida — no de memoria.
 * Los cinco skills sólo-apoyo declaran su frontmatter en DOS estilos (fence
 * ```` ```yml ```` y `---`), la descripción va entre comillas o desnuda, y
 * `allowed-tools` es un string separado por espacios que sphinx no declara. El
 * adaptador se lee contra esos cinco, no contra un caso fabricado.
 *
 * Cada caso trae su control que discrimina (sub-patrón D de
 * `metrica-decide-la-conclusion.md`): el `files` se coteja contra el disco, no
 * contra su propia salida; sphinx `evals/evals.json` fija que el barrido NO es
 * un allowlist de {scripts,references,assets} —que lo dejaría fuera en silencio
 * (`porte-completo-no-parcial.md`)—; y la descripción desnuda de sphinx impide
 * un despojo de comillas que corrompería lo que no las lleva.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fromSkillDir } from '../src/skills/fromDir.ts'
import { SkillRegistry } from '../src/skills/registry.ts'
import { thyroxRoot } from '../../../paths/reach.ts'

// Los skills se mudaron a thyrox; el hogar viejo dejaba estos 9 casos en
// ENOENT — el mismo defecto que las rutas codificadas de `emit`.
const SKILLS = join(thyroxRoot(), '.claude', 'skills')
const dirFor = (name: string) => join(SKILLS, name)

/** Los archivos reales bajo un dir, con su ruta relativa posix — el control. */
function walkOnDisk(dir: string, prefix = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    const rel = prefix ? `${prefix}/${entry}` : entry
    if (statSync(abs).isDirectory()) out.push(...walkOnDisk(abs, rel))
    else out.push(rel)
  }
  return out
}

describe('fromSkillDir — el frontmatter en sus dos estilos', () => {
  test('el fence ```yml (cosmic): name y description', () => {
    const s = fromSkillDir(dirFor('cosmic'))
    expect(s.name).toBe('cosmic')
    expect(s.description.startsWith('Dimensionamiento funcional COSMIC')).toBe(true)
    // La comilla del valor citado se despoja: no vuelve dentro de la cadena.
    expect(s.description.startsWith('"')).toBe(false)
    expect(s.description.endsWith('"')).toBe(false)
  })

  test('el fence --- (sp-adjust): name y description', () => {
    const s = fromSkillDir(dirFor('sp-adjust'))
    expect(s.name).toBe('sp-adjust')
    expect(s.description.startsWith('Use when adapting strategy')).toBe(true)
  })

  test('la descripción DESNUDA (sphinx) no se despoja de comillas que no tiene', () => {
    const s = fromSkillDir(dirFor('sphinx'))
    expect(s.name).toBe('sphinx')
    expect(s.description.startsWith('Professional documentation engine')).toBe(true)
  })

  test('allowed-tools: string por espacios en cosmic, AUSENTE en sphinx', () => {
    expect(fromSkillDir(dirFor('cosmic')).allowedTools).toEqual(['Read', 'Glob', 'Grep', 'Bash'])
    expect(fromSkillDir(dirFor('sphinx')).allowedTools).toBeUndefined()
  })

  test('disable-model-invocation: true en sp-adjust, ausente en cosmic', () => {
    expect(fromSkillDir(dirFor('sp-adjust')).disableModelInvocation).toBe(true)
    expect(fromSkillDir(dirFor('cosmic')).disableModelInvocation).toBeUndefined()
  })
})

describe('fromSkillDir — el cuerpo se separa del frontmatter', () => {
  test('getPrompt devuelve UN bloque de texto con el cuerpo, sin el frontmatter', async () => {
    const s = fromSkillDir(dirFor('cosmic'))
    const blocks = await s.getPrompt({ args: '', messages: [] })
    expect(blocks).toHaveLength(1)
    const b = blocks[0]
    expect(b.type).toBe('text')
    if (b.type !== 'text') throw new Error('no es texto')
    expect(b.text.length).toBeGreaterThan(0)
    // El delimitador y la clave del frontmatter NO cruzan al cuerpo.
    expect(b.text.startsWith('```yml')).toBe(false)
    expect(b.text.includes('name: cosmic')).toBe(false)
  })
})

describe('fromSkillDir — el barrido de apoyo se coteja contra el disco', () => {
  test('cosmic: files = todos los de disco MENOS SKILL.md, con su contenido', () => {
    const dir = dirFor('cosmic')
    const s = fromSkillDir(dir)
    const files = s.files ?? {}
    const onDisk = walkOnDisk(dir).filter((r) => r !== 'SKILL.md').sort()
    expect(Object.keys(files).sort()).toEqual(onDisk)
    // SKILL.md nunca es una clave de apoyo — es el prompt, no un anexo.
    expect('SKILL.md' in files).toBe(false)
    // Round-trip contra el disco: el contenido embebido ES el del archivo.
    const known = 'references/data-movements.md'
    expect(known in files).toBe(true)
    expect(files[known]).toBe(readFileSync(join(dir, known), 'utf8'))
  })

  test('sphinx: el barrido conserva evals/evals.json (NO es un allowlist)', () => {
    const files = fromSkillDir(dirFor('sphinx')).files ?? {}
    expect('evals/evals.json' in files).toBe(true)
  })
})

describe('fromSkillDir — la definición la consume el registry (#9)', () => {
  test('registrar + invocar extrae los apoyos y funde el prefijo Base directory', async () => {
    const s = fromSkillDir(dirFor('cosmic'))
    const root = join(process.env.TMPDIR || '/tmp', `harness-fromdir-${Date.now()}`)
    const reg = new SkillRegistry({ extractRoot: root })
    reg.register(s)
    const blocks = await reg.invoke('cosmic', { args: '', messages: [] })
    const b = blocks[0]
    if (b.type !== 'text') throw new Error('no es texto')
    expect(b.text.startsWith('Base directory for this skill:')).toBe(true)
    // La extracción escribió un apoyo real a disco bajo la raíz nonce.
    const written = readFileSync(join(root, 'cosmic', 'references', 'data-movements.md'), 'utf8')
    const esperado = s.files?.['references/data-movements.md']
    if (esperado === undefined) throw new Error('el fixture no declara references/data-movements.md')
    expect(written).toBe(esperado)
    expect(reg.extractions('cosmic')).toBe(1)
  })
})
