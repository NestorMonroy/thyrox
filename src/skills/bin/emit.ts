#!/usr/bin/env bun
/**
 * Escribe los `SKILL.md` derivados de las definiciones en `definitions/`.
 *
 * Mismo mecanismo que `packages/agent/bin/emit.ts`, adaptado a la forma de
 * un skill (frontmatter distinto, sin `experimental` ni `flow`). Con
 * `--check` no escribe: compara y sale 1 si el disco difiere.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SKILLS } from '../index.ts'
import { toMarkdown } from '../emit/markdown.ts'
import { diffSummary, parseArgs } from '../emit/plan.ts'
import { skillsDir } from '../paths.ts'

const SKILLS_DIR = skillsDir()

/** `date -u`, nunca de memoria (`timestamps-iso8601-obligatorios.md`). */
function nowIso(): string {
  return execFileSync('date', ['-u', '+%Y-%m-%d %H:%M:%S'], { encoding: 'utf8' }).trim()
}

/** Lee el `updated_at` que ya está en disco, para no moverlo sin causa. */
function existingUpdatedAt(path: string): string | undefined {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
  return /^updated_at: (.+)$/m.exec(text)?.[1]
}

function main(): void {
  const plan = parseArgs(process.argv.slice(2))
  if ('error' in plan) {
    console.error(`ERROR — ${plan.error} NO se emite un conteo.`)
    process.exit(2)
  }
  const check = plan.check
  let differing = 0

  for (const skill of SKILLS) {
    const path = join(SKILLS_DIR, skill.name, 'SKILL.md')
    const previous = existingUpdatedAt(path)

    // Igual que en el emisor de agentes: se emite primero con el timestamp
    // que ya tenía, para que un contenido sin cambio no mueva `updated_at`.
    const held = toMarkdown(skill, previous ?? nowIso())
    let current: string | undefined
    try {
      current = readFileSync(path, 'utf8')
    } catch {
      current = undefined
    }

    if (current === held) {
      console.log(`sin cambios  ${skill.name}`)
      continue
    }

    differing += 1
    if (check) {
      console.error(`DIFIERE      ${skill.name} — ${path}`)
      console.error(diffSummary(held, current ?? ''))
      continue
    }

    writeFileSync(path, toMarkdown(skill, nowIso()), 'utf8')
    console.log(`escrito      ${skill.name} — ${path}`)
  }

  console.log(
    `emit: ${SKILLS.length} definición(es); ${differing} con diferencia ` +
      `(alcance medido: ${SKILLS_DIR})`,
  )
  if (check && differing > 0) process.exit(1)
}

main()
