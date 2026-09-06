#!/usr/bin/env bun
/**
 * Escribe los artefactos derivados de las definiciones.
 *
 * Con `--check` no escribe: compara y sale 1 si el disco difiere. Ésa es la
 * forma que un gate consume — el mismo criterio que `makemigrations --check`.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENTS } from '../index.ts'
import { toMarkdown } from '../emit/markdown.ts'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const AGENTS_DIR = join(REPO_ROOT, '.claude', 'agents')

/**
 * El timestamp se obtiene de `date -u`, nunca de memoria ni del reloj del
 * proceso sin declararlo (`timestamps-iso8601-obligatorios.md`).
 */
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
  const check = process.argv.includes('--check')
  let differing = 0

  for (const agent of AGENTS) {
    const path = join(AGENTS_DIR, `${agent.name}.md`)
    const previous = existingUpdatedAt(path)

    // Se emite primero con el timestamp que ya tenía: si el resto del
    // contenido no cambió, el archivo sale idéntico y no se toca. Sin esto,
    // cada ejecución movería `updated_at` y el `--check` fallaría siempre.
    const held = toMarkdown(agent, previous ?? nowIso())
    let current: string | undefined
    try {
      current = readFileSync(path, 'utf8')
    } catch {
      current = undefined
    }

    if (current === held) {
      console.log(`sin cambios  ${agent.name}`)
      continue
    }

    differing += 1
    if (check) {
      console.error(`DIFIERE      ${agent.name} — ${path}`)
      continue
    }

    writeFileSync(path, toMarkdown(agent, nowIso()), 'utf8')
    console.log(`escrito      ${agent.name} — ${path}`)
  }

  console.log(
    `emit: ${AGENTS.length} definición(es); ${differing} con diferencia ` +
      `(alcance medido: ${AGENTS_DIR})`,
  )
  if (check && differing > 0) process.exit(1)
}

main()
