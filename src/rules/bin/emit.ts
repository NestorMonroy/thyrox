#!/usr/bin/env bun
/**
 * Emite las reglas de `index.ts` al hogar del consumidor.
 *
 * **El default es NO escribir.** Sin `--write` compara y publica el diff. Es
 * la asimetria del riesgo: una regla emitida de mas sobreescribe prosa que
 * otro escribio, y una comparacion de mas no cuesta nada. Los emisores
 * hermanos (`skills/bin/emit.ts`, `packages/agent/bin/emit.ts`) escriben por
 * defecto porque su destino es el arbol del PROVEEDOR; el de las reglas es el
 * del consumidor, que es otro repositorio.
 *
 * Salidas: 0 sin diferencias · 1 con diferencias (o escritas) · 2 no pudo
 * emitir — un parametro sin declarar, un scope incoherente.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { RULES } from '../index.ts'
import { consumerRulesDir, rulesDir } from '../paths.ts'
import { toMarkdown } from '../emit/markdown.ts'

type Plan = { write: boolean; dir: string; start?: string }

function parseArgs(argv: string[]): Plan | { error: string } {
  const plan: Plan = { write: false, dir: '' }
  let dir: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--write') plan.write = true
    else if (arg === '--consumer') {
      dir = argv[index + 1]
      index += 1
      if (!dir) return { error: '--consumer exige la raiz del clon.' }
      plan.start = dir
    } else return { error: `argumento no reconocido: ${arg}` }
  }
  plan.dir = plan.start ? consumerRulesDir(plan.start) : rulesDir()
  return plan
}

function main(): void {
  const plan = parseArgs(process.argv.slice(2))
  if ('error' in plan) {
    console.error(`ERROR — ${plan.error} NO se emite nada.`)
    process.exit(2)
  }

  const differences: string[] = []
  for (const rule of RULES) {
    let rendered: string
    try {
      rendered = toMarkdown(rule, plan.start)
    } catch (error) {
      console.error(`ERROR — ${(error as Error).message}`)
      process.exit(2)
    }
    const target = join(plan.dir, `${rule.name}.md`)
    const current = existsSync(target) ? readFileSync(target, 'utf8') : null
    if (current === rendered) continue
    differences.push(rule.name)
    const state = current === null ? 'ausente' : `difiere (${current.length} B en disco, ${rendered.length} B emitidos)`
    console.log(`  ${rule.name}: ${state}`)
    if (plan.write) {
      mkdirSync(plan.dir, { recursive: true })
      writeFileSync(target, rendered, 'utf8')
    }
  }

  const verb = plan.write ? 'escrita(s)' : 'con diferencia(s)'
  console.log(
    `rules emit: ${differences.length} ${verb} de ${RULES.length} regla(s) ` +
      `(hogar: ${plan.dir})`,
  )
  process.exit(differences.length ? 1 : 0)
}

main()
