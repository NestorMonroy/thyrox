/**
 * #14 — el conjunto sólo-apoyo que se migra al sustrato de código (#9).
 *
 * La membresía NO se afirma contra su propia lista —eso sería tautológico—:
 * se cotea contra el triaje `.claude/eventos/triaje-skills-md-*` (tarea #8),
 * la fuente independiente que clasificó los 82 skills. El control discrimina
 * (sub-patrón D de `metrica-decide-la-conclusion.md`): si un skill gana la
 * clase `a` en el triaje, o si `bundled.ts` registra uno de más o de menos, la
 * igualdad de conjuntos falla. Un `a` es destino de entregable —escribe en la
 * iniciativa— y NO es sólo-apoyo.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { registerBundledSkills, bundledSkillNames } from '../src/skills/bundled.ts'
import { SkillRegistry } from '../src/skills/registry.ts'
import { docsRoot } from '../src/paths/docs.ts'

/** El conjunto sólo-apoyo derivado del triaje más reciente — la fuente de verdad. */
function soloApoyoFromTriage(): string[] {
  const eventos = join(docsRoot(), '.claude', 'eventos')
  const dir = readdirSync(eventos)
    .filter((d) => d.startsWith('triaje-skills-md-'))
    .sort()
    .at(-1)
  if (!dir) throw new Error('no hay evento de triaje de skills')
  const rows = JSON.parse(readFileSync(join(eventos, dir, 'triaje.json'), 'utf8')) as {
    skill: string
    class: string
  }[]
  const classes = new Map<string, Set<string>>()
  for (const r of rows) {
    const s = classes.get(r.skill) ?? new Set<string>()
    s.add(r.class)
    classes.set(r.skill, s)
  }
  return [...classes.entries()].filter(([, c]) => !c.has('a')).map(([s]) => s).sort()
}

describe('bundledSkills — la membresía sale del triaje, no de su propia lista', () => {
  test('los nombres empaquetados == el conjunto sin clase a del triaje', () => {
    expect(bundledSkillNames().slice().sort()).toEqual(soloApoyoFromTriage())
  })

  test('registerBundledSkills registra exactamente ese conjunto en un registry', () => {
    const reg = new SkillRegistry({ extractRoot: join('/tmp', `bundled-${Date.now()}`) })
    registerBundledSkills(reg)
    expect(reg.list().map((s) => s.name).sort()).toEqual(soloApoyoFromTriage())
  })

  test('el frontmatter fluyó: sp-adjust deshabilita invocación por modelo; cosmic no', () => {
    const reg = new SkillRegistry({ extractRoot: join('/tmp', `bundled-fm-${Date.now()}`) })
    registerBundledSkills(reg)
    expect(reg.get('sp-adjust')?.disableModelInvocation).toBe(true)
    expect(reg.get('cosmic')?.disableModelInvocation).toBeUndefined()
  })
})
