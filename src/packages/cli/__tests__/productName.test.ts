/**
 * Los textos que la cli muestra al usuario nombran al programa que corre:
 * thyrox, vía `PRODUCT_NAME`. Los portados del binario decían «Claude Code»
 * porque allí ése es el producto (TASK-THYROX-0258, sucesor de H-THYROX-195).
 *
 * Sin excepciones, tampoco `install`: thyrox no es Claude Code, y con otro
 * provider instalar las releases de Claude Code instala un programa que el
 * usuario no corre (directiva del ejecutor 2026-09-27).
 *
 * *Métrica:* literales «Claude Code» en código de `src/` (sin comentarios).
 * *Ciega a:* el nombre compuesto en tiempo de ejecución desde otra cadena, y
 * a los textos de otros paquetes que la cli muestra (repl, command-runtime).
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { PRODUCT_NAME } from '../src/entry/productName.ts'

const SRC = join(import.meta.dir, '../src')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

function codeLines(text: string): string[] {
  return text.split('\n').filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
}

describe('the product name in the cli', () => {
  test('1. PRODUCT_NAME is thyrox', () => {
    expect(PRODUCT_NAME).toBe('thyrox')
  })
  test('2. no code text names Claude Code', () => {
    const offenders = sources(SRC).flatMap(file =>
      codeLines(readFileSync(file, 'utf8'))
        .filter(line => line.includes('Claude Code'))
        .map(line => `${relative(SRC, file)}: ${line.trim()}`))
    expect(offenders).toEqual([])
  })
  test('3. --version presents itself as thyrox in both layers', () => {
    for (const file of ['entry/cli.tsx', 'entry/run-program.ts']) {
      expect(readFileSync(join(SRC, file), 'utf8')).toContain('(${PRODUCT_NAME})')
    }
  })
})
