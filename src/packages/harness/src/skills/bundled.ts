/**
 * Los skills sólo-apoyo, migrados al sustrato de código (#14, sobre #9).
 *
 * Membresía: el conjunto de skills cuya clase en el triaje NO incluye `a`
 * —`.claude/eventos/triaje-skills-md-20260902T153717/triaje.json` (tarea #8)—.
 * Un `a` es destino de entregable (escribe en la iniciativa); un `b` es apoyo y
 * un `r` es una regla de gobierno que el skill lee. Medido sobre los 82 skills,
 * cinco quedan sin `a`:
 *
 *   cosmic (b) · rup-inception (b,r) · sp-adjust (b) · sp-monitor (b) · sphinx (b)
 *
 * Los cinco viven en `kaupamex-docs`. La lista de abajo se cotea contra ese
 * triaje en `__tests__/bundledSkills.test.ts`: si un skill gana `a`, o si esta
 * lista deriva, la igualdad de conjuntos falla (sub-patrón D de
 * `metrica-decide-la-conclusion.md`).
 *
 * Esta migración es ADITIVA. Los `.claude/skills/<name>/SKILL.md` NO se borran:
 * esta sesión corre sobre el Claude Code real, que los lee de disco. Que un
 * skill migrado deje de existir como archivo suelto es el modelo de entrega
 * eventual del harness (T-069) — decisión del ejecutor, pendiente en el
 * `progreso`. `fromSkillDir` los lee del mismo disco, así que ambos sustratos
 * coexisten sin conflicto.
 */

import { join } from 'node:path'
import { thyroxRoot } from '../../../../paths/reach.ts'
import { fromSkillDir } from './fromDir.ts'
import type { SkillDefinition } from './registry.ts'
import type { SkillRegistry } from './registry.ts'

/**
 * Los cinco directorios sólo-apoyo, bajo `<thyroxRoot>/.claude/skills/`.
 *
 * Era `<docsRoot>/…` y la mudanza de los skills a thyrox lo dejó atrás. El
 * resolutor no estaba mal: lo que estaba mal era CUÁL se elegía. Medido al
 * corregirlo: los cinco están en thyrox y ninguno en docs, y el hogar viejo
 * dejaba 9 casos de `skillsFromDir.test.ts` en ENOENT.
 */
const SOLO_APOYO = ['cosmic', 'rup-inception', 'sp-adjust', 'sp-monitor', 'sphinx'] as const

/** Los nombres empaquetados — el control los cotea contra el triaje. */
export function bundledSkillNames(): string[] {
  return [...SOLO_APOYO]
}

/** Adapta los cinco `SKILL.md` de disco a definiciones del sustrato. */
export function bundledSkillDefs(): SkillDefinition[] {
  const skillsRoot = join(thyroxRoot(), '.claude', 'skills')
  return SOLO_APOYO.map((name) => fromSkillDir(join(skillsRoot, name)))
}

/** Registra los cinco en un registry ya construido. */
export function registerBundledSkills(registry: SkillRegistry): void {
  for (const def of bundledSkillDefs()) registry.register(def)
}
