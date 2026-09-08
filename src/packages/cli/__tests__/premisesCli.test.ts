/**
 * La verificación de premisas por la CLI (`bin/harness.ts`, bloque 14).
 *
 * Fuente: misma que `premises.ts` — `niveles-de-retencion.md` + T-004. Este
 * archivo prueba la vía de línea de comandos, con su código de salida como
 * veredicto.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from '../bin/harness.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'premises-cli-'))

/** Captura lo que el comando imprime, sin tocar el terminal de la suite. */
async function run(argv: string[]) {
  const out: string[] = []
  const err: string[] = []
  const so = process.stdout.write.bind(process.stdout)
  const se = process.stderr.write.bind(process.stderr)
  process.stdout.write = (s: string) => { out.push(String(s)); return true }
  process.stderr.write = (s: string) => { err.push(String(s)); return true }
  try {
    const code = await main(argv)
    return { code, out: out.join(''), err: err.join('') }
  } finally {
    process.stdout.write = so
    process.stderr.write = se
  }
}

describe('--check-premises (T-056)', () => {
  test('sin archivo de premisas rehusa con exit 2 y NO adivina una convencion', async () => {
    const d = dir()
    const r = await run(['--check-premises', '--cwd', d])
    expect(r.code).toBe(2)
    expect(r.err).toContain('premisas')
    // no emite conteo: un 0 aqui seria un verde falso
    expect(r.out).not.toContain('de 0')
  })

  test('un archivo declarado se evalua y publica su denominador', async () => {
    const d = dir()
    writeFileSync(join(d, 'existe.txt'), 'hay simbolo Alfa aqui')
    writeFileSync(join(d, 'premisas.json'), JSON.stringify([
      { id: 'T-001', open: true, blockedWhile: [{ kind: 'path-absent', path: 'existe.txt' }] },
      { id: 'T-002', open: true, blockedWhile: [{ kind: 'path-absent', path: 'no-existe.txt' }] },
      { id: 'T-003', open: false, claims: [{ kind: 'path-exists', path: 'no-existe.txt' }] },
      { id: 'T-004', open: true },
    ]))
    const r = await run(['--check-premises', '--premises', join(d, 'premisas.json'), '--cwd', d])
    expect(r.code).toBe(0)
    expect(r.out).toContain('T-001')
    expect(r.out).toContain('actionable')   // su bloqueo ya no se cumple
    expect(r.out).toContain('blocked')
    expect(r.out).toContain('overclaimed')
    expect(r.out).toContain('unmeasurable')
    // el denominador va SIEMPRE: 3 medidas de 4 declaradas
    expect(r.out).toContain('3 de 4')
    expect(r.out).toContain('Métrica:')
    expect(r.out).toContain('Ciega a:')
  })

  test('--strict sale 1 cuando hay una cerrada que afirma lo que no esta', async () => {
    const d = dir()
    writeFileSync(join(d, 'premisas.json'), JSON.stringify([
      { id: 'T-015', open: false, claims: [{ kind: 'path-exists', path: 'ausente.ts' }] },
    ]))
    const r = await run(['--check-premises', '--premises', join(d, 'premisas.json'), '--cwd', d, '--strict'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('T-015')
  })

  test('--strict NO sale 1 por unmeasurable: no medir no es un defecto del arbol', async () => {
    const d = dir()
    writeFileSync(join(d, 'premisas.json'), JSON.stringify([{ id: 'T-021', open: true }]))
    const r = await run(['--check-premises', '--premises', join(d, 'premisas.json'), '--cwd', d, '--strict'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('unmeasurable')
  })

  test('un archivo ilegible rehusa con su razon, no con un reporte vacio', async () => {
    const d = dir()
    writeFileSync(join(d, 'roto.json'), '{ esto no es json')
    const r = await run(['--check-premises', '--premises', join(d, 'roto.json'), '--cwd', d])
    expect(r.code).toBe(2)
    expect(r.err).toContain('roto.json')
  })

  test('el simbolo se busca en el arbol real, con frontera de palabra', async () => {
    const d = dir()
    writeFileSync(join(d, 'fuente.ts'), 'export const SessionEnd = 1')
    writeFileSync(join(d, 'premisas.json'), JSON.stringify([
      { id: 'A', open: false, claims: [{ kind: 'symbol-present', symbol: 'SessionEnd', in: '*.ts' }] },
      { id: 'B', open: false, claims: [{ kind: 'symbol-present', symbol: 'SessionEn', in: '*.ts' }] },
    ]))
    const r = await run(['--check-premises', '--premises', join(d, 'premisas.json'), '--cwd', d])
    expect(r.out).toMatch(/A\s+verified/)
    expect(r.out).toMatch(/B\s+overclaimed/)
  })
})

describe('--check-premises publica `stale` (T-065)', () => {
  test('--strict sale 1 ante una presuposición rota: despachar sobre ella es el costo que evita', async () => {
    const d = dir()
    writeFileSync(join(d, 'uno.py'), 'def alfa(): pass')
    const p = join(d, 'premisas.json')
    writeFileSync(p, JSON.stringify([
      { id: 'T-1', open: true, presupposes: [{ kind: 'symbol-absent', symbol: 'alfa', in: '*.py' }] },
    ]))
    const r = await run(['--check-premises', '--premises', p, '--cwd', d, '--strict'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('stale')
    expect(r.out).toContain('alfa')
  })

  test('sin --strict informa y sale 0: el reporte no es un gate por sí solo', async () => {
    const d = dir()
    writeFileSync(join(d, 'uno.py'), 'def alfa(): pass')
    const p = join(d, 'premisas.json')
    writeFileSync(p, JSON.stringify([
      { id: 'T-1', open: true, presupposes: [{ kind: 'symbol-absent', symbol: 'alfa', in: '*.py' }] },
    ]))
    expect((await run(['--check-premises', '--premises', p, '--cwd', d])).code).toBe(0)
  })
})
