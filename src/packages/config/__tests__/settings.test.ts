import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from '../bin/settings.ts'

// La puerta de bin/settings.ts (tarea #223): sin ella, resolver la
// precedencia, listar el inventario o validar un archivo exigían leer
// código. Estas pruebas ejercitan el CONTRATO de línea de comandos, no las
// funciones de settings/*.ts, que ya tienen su propia suite.

/** Captura lo que `main` imprime, sin depender de un subproceso. */
function run(argv: string[]): { exitCode: number; out: string } {
  const lines: string[] = []
  const origLog = console.log
  const origError = console.error
  console.log = (...a: unknown[]) => lines.push(a.join(' '))
  console.error = (...a: unknown[]) => lines.push(a.join(' '))
  try {
    const exitCode = main(argv)
    return { exitCode, out: lines.join('\n') }
  } finally {
    console.log = origLog
    console.error = origError
  }
}

function proyecto(): string {
  return mkdtempSync(join(tmpdir(), 'thyrox-config-cli-'))
}

describe('settings.ts — sin subcomando ni subcomando desconocido', () => {
  test('sin argumentos: rehúsa (2), imprime la ayuda', () => {
    const r = run([])
    expect(r.exitCode).toBe(2)
    expect(r.out).toContain('resolve')
    expect(r.out).toContain('inventory')
    expect(r.out).toContain('validate')
  })

  test('--help: 0, aunque no haya subcomando', () => {
    expect(run(['--help']).exitCode).toBe(0)
  })

  test('subcomando desconocido: rehúsa (2) y lo nombra', () => {
    const r = run(['borrar-todo'])
    expect(r.exitCode).toBe(2)
    expect(r.out).toContain('borrar-todo')
  })
})

describe('resolve — la precedencia efectiva, con origen por clave', () => {
  test('localSettings gana sobre projectSettings en la misma clave', () => {
    const cwd = proyecto()
    mkdirSync(join(cwd, '.claude'), { recursive: true })
    writeFileSync(join(cwd, '.claude', 'settings.json'), JSON.stringify({ model: 'claude-sonnet-5', maxTurns: 5 }))
    writeFileSync(join(cwd, '.claude', 'settings.local.json'), JSON.stringify({ model: 'claude-opus-5' }))

    const r = run(['resolve', '--cwd', cwd, '--json'])
    expect(r.exitCode).toBe(0)
    const parsed = JSON.parse(r.out)
    expect(parsed.settings.model).toBe('claude-opus-5')
    expect(parsed.origin.model).toBe('localSettings')
    expect(parsed.settings.maxTurns).toBe(5)
    expect(parsed.origin.maxTurns).toBe('projectSettings')
    expect(parsed.loaded).toHaveLength(2)
  })

  test('sin ningún archivo presente: 0 claves, exit 0 — no es un defecto', () => {
    const cwd = proyecto()
    const r = run(['resolve', '--cwd', cwd])
    expect(r.exitCode).toBe(0)
    expect(r.out).toContain('ninguna clave fusionada')
  })

  test('--source explícito sustituye la ruta por defecto de esa fuente', () => {
    const cwd = proyecto()
    const otro = proyecto()
    writeFileSync(join(otro, 'a-un-lado.json'), JSON.stringify({ model: 'claude-fable-5-1' }))
    const r = run(['resolve', '--cwd', cwd, '--skip-defaults', '--source', `project=${join(otro, 'a-un-lado.json')}`, '--json'])
    expect(r.exitCode).toBe(0)
    expect(JSON.parse(r.out).settings.model).toBe('claude-fable-5-1')
  })

  test('--source mal formado (sin `=`): rehúsa (2)', () => {
    const r = run(['resolve', '--source', 'project'])
    expect(r.exitCode).toBe(2)
    expect(r.out).toContain('--source')
  })

  test('un archivo declarado que EXISTE y trae JSON inválido: exit 1, no 0', () => {
    const cwd = proyecto()
    mkdirSync(join(cwd, '.claude'), { recursive: true })
    writeFileSync(join(cwd, '.claude', 'settings.json'), '{ no es json')
    const r = run(['resolve', '--cwd', cwd])
    expect(r.exitCode).toBe(1)
    expect(r.out).toContain('FALLÓ')
  })
})

describe('inventory — las claves del cliente por estado', () => {
  test('--status diferida: sólo diferidas, cada una con motivo y condición', () => {
    const r = run(['inventory', '--status', 'diferida', '--json'])
    expect(r.exitCode).toBe(0)
    const rows = JSON.parse(r.out) as { key: string; status: string; reason?: string; condition?: string }[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.status).toBe('diferida')
      expect(typeof row.reason).toBe('string')
      expect(typeof row.condition).toBe('string')
    }
  })

  test('sin filtro: las tres categorías suman el total declarado', () => {
    const r = run(['inventory', '--json'])
    const rows = JSON.parse(r.out) as { status: string }[]
    const porEstado = new Set(rows.map((x) => x.status))
    expect(porEstado).toEqual(new Set(['consumida', 'declarada', 'diferida']))
  })

  test('--status desconocido: rehúsa (2)', () => {
    const r = run(['inventory', '--status', 'no-existe'])
    expect(r.exitCode).toBe(2)
    expect(r.out).toContain('no-existe')
  })
})

describe('validate — un archivo contra el esquema', () => {
  test('archivo válido: exit 0', () => {
    const cwd = proyecto()
    const f = join(cwd, 'settings.json')
    writeFileSync(f, JSON.stringify({ model: 'claude-sonnet-5' }))
    const r = run(['validate', f])
    expect(r.exitCode).toBe(0)
    expect(r.out).toContain('válido')
  })

  test('JSON inválido: exit 1', () => {
    const cwd = proyecto()
    const f = join(cwd, 'roto.json')
    writeFileSync(f, '{ no es json')
    const r = run(['validate', f])
    expect(r.exitCode).toBe(1)
  })

  test('esquema inválido (alias en vez de identificador completo): exit 1, cita la clave', () => {
    const cwd = proyecto()
    const f = join(cwd, 'alias.json')
    writeFileSync(f, JSON.stringify({ model: 'sonnet' }))
    const r = run(['validate', f])
    expect(r.exitCode).toBe(1)
    expect(r.out).toContain('model')
  })

  test('clave diferida presente: avisa y SIGUE siendo válido (0), no rompe la carga', () => {
    const cwd = proyecto()
    const f = join(cwd, 'diferida.json')
    writeFileSync(f, JSON.stringify({ awsCredentialExport: 'x' }))
    const r = run(['validate', f])
    expect(r.exitCode).toBe(0)
    expect(r.out).toContain('awsCredentialExport')
  })

  test('sin argumento: rehúsa (2), NO intenta adivinar un archivo', () => {
    const r = run(['validate'])
    expect(r.exitCode).toBe(2)
  })

  // El guard que distingue «no se pudo intentar» (2) de «se intentó y
  // falló» (1). Es el control de anulación de esta suite (retirado a mano
  // durante la construcción de la puerta, con su salida ROJA y VERDE
  // persistidas en el evento de la tarea): sin el `existsSync` explícito de
  // `validateCommand`, `loadSettings` salta un archivo ausente EN SILENCIO
  // (`if (!existsSync(path)) continue`, sin tocar `errors`) — el resultado
  // sería indistinguible de un archivo con contenido inválido: los dos
  // terminan con `loaded.length === 0`, y esta prueba pasaría a fallar
  // (recibiría 1, no 2) exactamente cuando el guard se retira.
  test('archivo ausente: rehúsa (2), no "inválido" (1) — el guard que distingue las dos causas', () => {
    const cwd = proyecto()
    const r = run(['validate', join(cwd, 'no-existe.json')])
    expect(r.exitCode).toBe(2)
    expect(r.out).toContain('no existe')
  })
})
