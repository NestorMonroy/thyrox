#!/usr/bin/env bun
/**
 * Escribe los artefactos derivados de las definiciones.
 *
 * Con `--check` no escribe: compara y sale 1 si el disco difiere. Ésa es la
 * forma que un gate consume — el mismo criterio que `makemigrations --check`.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AGENTS } from '../index.ts'
import { toMarkdown } from '../emit/markdown.ts'
import { diffSummary, parseArgs } from '../emit/plan.ts'
import { agentsDir } from '../../../paths/reach.ts'

// El hogar es un PARÁMETRO resuelto por `agentsDir()`: la variable del
// proceso, la del `.env`, y sólo entonces el hogar propio de thyrox. Era
// aritmética de ruta a `.claude/agents/`, un directorio que el renombre a
// `src/agents/definitions/` dejó sin existir — y el emisor no lo notó porque
// `writeFileSync` sobre un padre ausente falla, pero `--check` sólo leía.
const AGENTS_DIR = agentsDir()

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
  const plan = parseArgs(process.argv.slice(2))
  if ('error' in plan) {
    // Muere con 2 y SIN emitir cifra: un conteo aquí se leería como que el
    // emisor midió algo, y no llegó a mirar el disco.
    console.error(`ERROR — ${plan.error} NO se emite un conteo.`)
    process.exit(2)
  }
  const check = plan.check
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
      // Publica EN QUÉ difiere. Sin esto, verlo exige re-emitir a mano — que
      // es como se llegó a inventar una bandera que no existe.
      console.error(`DIFIERE      ${agent.name} — ${path}`)
      console.error(diffSummary(held, current ?? ''))
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
