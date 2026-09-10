#!/usr/bin/env bun
/**
 * Emite cada definicion a `<destino>/<id>.md`.
 *
 * `--check` no escribe: compara y sale 1 si algo difiere, con el nombre de
 * cada divergente. Es la forma que el gate consume — y publica su
 * DENOMINADOR, porque «0 divergencias» sin el no distingue «todo coincide»
 * de «no se midio ninguno».
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { allCommands, commandsDir, toMarkdown } from '../index.ts'

const soloVerificar = process.argv.includes('--check')
const destino = commandsDir()
const definiciones = allCommands()

if (!soloVerificar) mkdirSync(destino, { recursive: true })

const divergentes: string[] = []
for (const c of definiciones) {
  const ruta = join(destino, `${c.id}.md`)
  const emitido = toMarkdown(c)
  if (soloVerificar) {
    const enDisco = existsSync(ruta) ? readFileSync(ruta, 'utf8') : null
    if (enDisco !== emitido) divergentes.push(enDisco === null ? `${c.id} (ausente)` : c.id)
  } else {
    writeFileSync(ruta, emitido)
  }
}

if (soloVerificar) {
  for (const d of divergentes) console.error(`  divergente: ${d}`)
  console.log(`${divergentes.length} divergencia(s) sobre ${definiciones.length} comandos (destino: ${destino})`)
  process.exit(divergentes.length === 0 ? 0 : 1)
}
console.log(`emitidos ${definiciones.length} comandos en ${destino}`)
