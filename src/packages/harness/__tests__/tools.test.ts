/**
 * Registro de herramientas (T-005) y las seis del núcleo (T-010).
 *
 * Fuente: diseño nativo — una herramienta declara lo que el modelo ve y lo que
 * el harness necesita para correrla. El control que discrimina es que
 * `toolSpecs` entregue al modelo sólo su mitad: el permiso no viaja en la
 * petición porque no es asunto del modelo.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CORE_TOOLS, registry, toolSpecs } from '../src/tools/registry.ts'

const ctx = (cwd: string) => ({ cwd, sessionId: 's', abort: new AbortController().signal, messages: [] })
const dir = () => mkdtempSync(join(tmpdir(), 'tools-'))

describe('registro de herramientas (T-005, T-010)', () => {
  test('el registro expone especificaciones con esquema de entrada valido', () => {
    const specs = toolSpecs(CORE_TOOLS)
    expect(specs.length).toBe(CORE_TOOLS.length)
    for (const s of specs) {
      expect(s.input_schema.type).toBe('object')
      expect(Object.keys(s.input_schema.properties).length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(20)
    }
    // la especificacion NO lleva el permiso ni la implementacion: eso es del
    // harness, no del modelo
    expect(Object.keys(specs[0])).toEqual(['name', 'description', 'input_schema'])
  })

  test('registry busca por nombre y devuelve undefined si no existe', () => {
    expect(registry(CORE_TOOLS).get('Bash')?.permission).toBe('execute')
    expect(registry(CORE_TOOLS).get('NoExiste')).toBeUndefined()
  })

  test('las seis del nucleo estan, con su permiso declarado', () => {
    const m = registry(CORE_TOOLS)
    expect(CORE_TOOLS.map((t) => t.name).sort()).toEqual(['Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Write'])
    expect(m.get('Read')?.permission).toBe('read')
    expect(m.get('Write')?.permission).toBe('write')
    expect(m.get('Edit')?.permission).toBe('write')
  })
})

describe('las herramientas del nucleo hacen lo que dicen', () => {
  test('Bash ejecuta y devuelve la salida; el codigo distinto de 0 es error', async () => {
    const m = registry(CORE_TOOLS)
    const ok = await m.get('Bash')!.run({ command: 'echo hola' }, ctx(dir()))
    expect(ok.content.trim()).toBe('hola')
    expect(ok.isError).toBe(false)
    const mal = await m.get('Bash')!.run({ command: 'exit 3' }, ctx(dir()))
    expect(mal.isError).toBe(true)
    expect(mal.content).toContain('3')
  })

  test('Bash corre en el cwd de la sesion, no en el del proceso', async () => {
    const d = dir()
    const r = await registry(CORE_TOOLS).get('Bash')!.run({ command: 'pwd' }, ctx(d))
    expect(readFileSync('/dev/null', 'utf8')).toBe('')
    expect(r.content.trim()).toContain(d.replace('/private', ''))
  })

  test('Read devuelve el contenido y falla claro si no existe', async () => {
    const d = dir()
    writeFileSync(join(d, 'a.txt'), 'linea uno\nlinea dos\n')
    const m = registry(CORE_TOOLS)
    expect((await m.get('Read')!.run({ file_path: join(d, 'a.txt') }, ctx(d))).content).toContain('linea dos')
    const falta = await m.get('Read')!.run({ file_path: join(d, 'no.txt') }, ctx(d))
    expect(falta.isError).toBe(true)
  })

  test('Write crea el archivo y sus directorios', async () => {
    const d = dir()
    const destino = join(d, 'sub', 'b.txt')
    const r = await registry(CORE_TOOLS).get('Write')!.run({ file_path: destino, content: 'hola' }, ctx(d))
    expect(r.isError).toBe(false)
    expect(readFileSync(destino, 'utf8')).toBe('hola')
  })

  test('Edit sustituye una sola vez y rehusa si la cadena no es unica', async () => {
    const d = dir()
    const p = join(d, 'c.txt')
    writeFileSync(p, 'uno dos uno\n')
    const m = registry(CORE_TOOLS)
    const ambiguo = await m.get('Edit')!.run({ file_path: p, old_string: 'uno', new_string: 'X' }, ctx(d))
    expect(ambiguo.isError).toBe(true)
    expect(ambiguo.content).toContain('2')
    const ok = await m.get('Edit')!.run({ file_path: p, old_string: 'dos', new_string: 'X' }, ctx(d))
    expect(ok.isError).toBe(false)
    expect(readFileSync(p, 'utf8')).toBe('uno X uno\n')
  })

  test('Glob lista por patron, relativo al cwd', async () => {
    const d = dir()
    writeFileSync(join(d, 'a.ts'), '')
    writeFileSync(join(d, 'b.md'), '')
    const r = await registry(CORE_TOOLS).get('Glob')!.run({ pattern: '*.ts' }, ctx(d))
    expect(r.content).toContain('a.ts')
    expect(r.content).not.toContain('b.md')
  })

  test('Grep encuentra el patron y dice el archivo', async () => {
    const d = dir()
    writeFileSync(join(d, 'a.txt'), 'buscame aqui\n')
    const r = await registry(CORE_TOOLS).get('Grep')!.run({ pattern: 'buscame' }, ctx(d))
    expect(r.content).toContain('a.txt')
  })

  test('una entrada que no cumple el esquema devuelve error, no excepcion', async () => {
    const r = await registry(CORE_TOOLS).get('Bash')!.run({}, ctx(dir()))
    expect(r.isError).toBe(true)
    expect(r.content).toContain('command')
  })
})
