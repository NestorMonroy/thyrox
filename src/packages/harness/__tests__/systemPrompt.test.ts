/**
 * Ensamblado del prompt de sistema desde `.claude/` (T-022).
 *
 * Fuente: la lección de `h-docs-99` —el piso siempre-cargado del cliente mide
 * 126 029 tokens—. El control que discrimina es que cada sección declare su
 * coste y el presupuesto sea un parámetro: un ensamblado que copie la forma sin
 * eso repite el defecto que impide arrancar a `claude-haiku-4-5`.
 */

import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assembleSystemPrompt, estimateTokens } from '../src/context/systemPrompt.ts'

/** Un árbol sintético con la misma forma que `.claude/` de este repo. */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'sp-'))
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, body)
  }
  return root
}

describe('estimateTokens', () => {
  test('crece con el texto y no devuelve cero para texto no vacio', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('hola')).toBeGreaterThan(0)
    expect(estimateTokens('a'.repeat(4000))).toBeGreaterThan(estimateTokens('a'.repeat(400)))
  })
})

describe('ensamblado del prompt de sistema (T-022)', () => {
  test('el prompt base va primero y siempre', () => {
    const root = tree({ 'CLAUDE.md': 'raiz' })
    const r = assembleSystemPrompt({ root, base: 'SOY EL BASE' })
    expect(r.sections[0].name).toBe('base')
    expect(r.text.startsWith('SOY EL BASE')).toBe(true)
  })

  test('recoge CLAUDE.md de la raiz, el de .claude/ y las reglas ordenadas', () => {
    const root = tree({
      'CLAUDE.md': 'cheat-sheet local',
      '.claude/CLAUDE.md': 'nivel 2',
      '.claude/rules/zeta.md': 'regla zeta',
      '.claude/rules/alfa.md': 'regla alfa',
    })
    const r = assembleSystemPrompt({ root, base: 'B' })
    expect(r.sections.map((s) => s.name)).toEqual([
      'base',
      'CLAUDE.md',
      '.claude/CLAUDE.md',
      '.claude/rules/alfa.md',
      '.claude/rules/zeta.md',
    ])
    expect(r.text).toContain('regla alfa')
    expect(r.text).toContain('nivel 2')
  })

  test('un arbol sin CLAUDE.md ni reglas no revienta: solo queda el base', () => {
    const r = assembleSystemPrompt({ root: tree({}), base: 'B' })
    expect(r.sections.map((s) => s.name)).toEqual(['base'])
  })

  test('una regla con `paths:` NO carga sin ruta objetivo — es condicional', () => {
    const root = tree({
      '.claude/rules/siempre.md': 'incondicional',
      '.claude/rules/solo-api.md': '```yml\npaths: src/**/*.py\n```\n\nsolo para api',
    })
    const r = assembleSystemPrompt({ root, base: 'B' })
    expect(r.sections.map((s) => s.name)).toEqual(['base', '.claude/rules/siempre.md'])
    expect(r.text).not.toContain('solo para api')
  })

  test('la misma regla SI carga cuando la ruta objetivo casa su patron', () => {
    const root = tree({
      '.claude/rules/solo-api.md': '```yml\npaths: src/**/*.py\n```\n\nsolo para api',
    })
    const r = assembleSystemPrompt({ root, base: 'B', targetPath: 'src/addons/base/models.py' })
    expect(r.text).toContain('solo para api')
    const conPathDistinto = assembleSystemPrompt({ root, base: 'B', targetPath: 'docs/index.rst' })
    expect(conPathDistinto.text).not.toContain('solo para api')
  })

  test('tambien reconoce el frontmatter con guiones, no solo el bloque yml', () => {
    const root = tree({ '.claude/rules/r.md': '---\npaths: ["**/*.ts"]\n---\n\ncuerpo ts' })
    expect(assembleSystemPrompt({ root, base: 'B', targetPath: 'a/b.ts' }).text).toContain('cuerpo ts')
    expect(assembleSystemPrompt({ root, base: 'B' }).text).not.toContain('cuerpo ts')
  })

  test('el presupuesto descarta las secciones que no caben y las nombra', () => {
    const root = tree({
      'CLAUDE.md': 'x'.repeat(4000),
      '.claude/rules/a.md': 'y'.repeat(4000),
      '.claude/rules/b.md': 'z'.repeat(4000),
    })
    const sinTope = assembleSystemPrompt({ root, base: 'B' })
    expect(sinTope.dropped).toEqual([])
    const r = assembleSystemPrompt({ root, base: 'B', budgetTokens: estimateTokens('x'.repeat(4000)) + 50 })
    expect(r.dropped.length).toBeGreaterThan(0)
    expect(r.sections.map((s) => s.name)).toContain('CLAUDE.md')
    expect(r.dropped.map((s) => s.name)).toContain('.claude/rules/b.md')
    expect(r.tokens).toBeLessThanOrEqual(estimateTokens('x'.repeat(4000)) + 50)
  })

  test('el base NUNCA se descarta, aunque el presupuesto sea absurdo', () => {
    const root = tree({ 'CLAUDE.md': 'algo' })
    const r = assembleSystemPrompt({ root, base: 'IRRENUNCIABLE', budgetTokens: 1 })
    expect(r.sections.map((s) => s.name)).toEqual(['base'])
    expect(r.text).toBe('IRRENUNCIABLE')
    expect(r.dropped.map((s) => s.name)).toEqual(['CLAUDE.md'])
  })

  test('cada seccion declara su coste, y el total es la suma de las incluidas', () => {
    const root = tree({ 'CLAUDE.md': 'uno', '.claude/rules/a.md': 'dos' })
    const r = assembleSystemPrompt({ root, base: 'B' })
    expect(r.tokens).toBe(r.sections.reduce((a, s) => a + s.tokens, 0))
    for (const s of r.sections) expect(s.tokens).toBeGreaterThan(0)
  })
})
