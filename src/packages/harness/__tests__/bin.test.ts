/**
 * `bin/harness.ts` (T-009) — un ciclo completo de punta a punta.
 *
 * Fuente: diseño nativo — el punto de entrada del harness. El test lo corre por
 * `spawn` con el proveedor grabado, midiendo el ciclo real y no una simulación
 * de sus partes.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BIN = join(import.meta.dir, '..', 'bin', 'harness.ts')
const uso = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

describe('bin/harness.ts (T-009) — un ciclo completo de punta a punta', () => {
  test('con turnos grabados ejecuta una herramienta real y devuelve el texto', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const marca = join(d, 'lo-hizo.txt')
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Write', input: { file_path: marca, content: 'hecho' } }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
        content: [{ type: 'text', text: 'archivo escrito' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'escribe el archivo', '--provider', 'recorded',
      '--grabacion', join(d, 'turnos.json'), '--cwd', d, '--transcript-dir', join(d, 'tr'), '--json'])
    expect(p.exitCode).toBe(0)
    const r = JSON.parse(p.stdout.toString())
    expect(r.stop).toBe('end_turn')
    expect(r.turns).toBe(2)
    expect(r.lastText).toBe('archivo escrito')
    expect(Bun.file(marca).size).toBeGreaterThan(0)
  })

  test('sin --prompt imprime la ayuda y sale 2', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN])
    expect(p.exitCode).toBe(2)
    expect(p.stdout.toString()).toContain('--prompt')
  })

  test('--provider http sin credencial falla diciendo por que, no en silencio', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--provider', 'http'],
      { env: { ...process.env, ANTHROPIC_API_KEY: '' } })
    expect(p.exitCode).not.toBe(0)
    expect(p.stderr.toString()).toContain('ANTHROPIC_API_KEY')
  })
})

describe('la CLI dibuja el flujo de eventos (T-038, T-040)', () => {
  const turnos = (d: string) => {
    const p = join(d, 'turnos.json')
    writeFileSync(p, JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'echo hola' } }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
        content: [{ type: 'text', text: 'terminado' }] },
    ]))
    return p
  }

  test('--output-style text anuncia cada herramienta mientras corre', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'text'])
    const salida = p.stdout.toString()
    expect(salida).toContain('Bash')
    expect(salida).toContain('echo hola')
    expect(salida).toContain('terminado')
  })

  test('--output-style quiet imprime la respuesta y calla el resto', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'])
    const salida = p.stdout.toString()
    expect(salida).toContain('terminado')
    expect(salida).not.toContain('echo hola')
  })

  test('--output-style json emite una linea JSON valida por evento', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'json'])
    const lineas = p.stdout.toString().trim().split('\n').map((l) => JSON.parse(l))
    expect(lineas[0].type).toBe('session_start')
    expect(lineas.at(-1).type).toBe('done')
  })

  test('un estilo inexistente se rechaza nombrando los validos', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'arcoiris'])
    expect(p.exitCode).toBe(2)
    expect(p.stderr.toString()).toContain('quiet')
  })

  test('--sessions lista lo que hay para reanudar, y sale sin correr el bucle', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const tr = join(d, 'tr')
    Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'la pregunta original', '--grabacion', turnos(d),
      '--cwd', d, '--transcript-dir', tr, '--output-style', 'quiet'])
    const p = Bun.spawnSync(['bun', 'run', BIN, '--sessions', '--transcript-dir', tr])
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toContain('la pregunta original')
    expect(p.stdout.toString()).toContain('claude-opus-5')
  })
})

describe('la CLI lee la configuracion del proyecto (T-044)', () => {
  test('--settings-source project toma hooks y permisos de .claude/settings.json', () => {
    const d = mkdtempSync(join(tmpdir(), 'bin-'))
    const marca = join(d, 'el-hook-corrio.txt')
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: `cat > ${JSON.stringify(marca)}; echo '{}'` }] }] },
    }))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ya' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--settings-source', 'project', '--output-style', 'quiet'])
    expect(p.exitCode).toBe(0)
    expect(Bun.file(marca).size).toBeGreaterThan(0)
  })
})

describe('modo conversacion (T-039)', () => {
  test('cada linea de stdin es un turno, y el segundo VE el primero', () => {
    const d = mkdtempSync(join(tmpdir(), 'chat-'))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'hola a ti' }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'te dije hola a ti' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--chat', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'],
      { stdin: Buffer.from('hola\nque me dijiste\n') })
    expect(p.exitCode).toBe(0)
    const salida = p.stdout.toString()
    expect(salida).toContain('hola a ti')
    expect(salida).toContain('te dije hola a ti')
    // una sola sesion: el segundo prompt reanuda la primera
    const sesiones = require('node:fs').readdirSync(join(d, 'tr'))
    expect(sesiones.length).toBe(1)
  })

  test('la linea de salida termina la conversacion sin error', () => {
    const d = mkdtempSync(join(tmpdir(), 'chat-'))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ok' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--chat', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'],
      { stdin: Buffer.from('uno\n/salir\ndos\n') })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toContain('ok')
  })

  test('una linea vacia no gasta un turno', () => {
    const d = mkdtempSync(join(tmpdir(), 'chat-'))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'unico' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--chat', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'quiet'],
      { stdin: Buffer.from('\n   \nuno\n') })
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString().trim()).toBe('unico')
  })
})

describe('la configuracion viene de @thyrox/config (T-044)', () => {
  test('project y local se ACUMULAN en hooks, con la precedencia del paquete', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    const a = join(d, 'de-project.txt')
    const b = join(d, 'de-local.txt')
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: `cat > ${JSON.stringify(a)}; echo '{}'` }] }] },
    }))
    writeFileSync(join(d, '.claude', 'settings.local.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: `cat > ${JSON.stringify(b)}; echo '{}'` }] }] },
    }))
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ya' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--settings-source', 'project', '--output-style', 'quiet'])
    expect(p.exitCode).toBe(0)
    expect(Bun.file(a).size).toBeGreaterThan(0)
    expect(Bun.file(b).size).toBeGreaterThan(0)
  })

  test('un settings.json invalido AVISA con su ruta y el arranque sigue', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), '{esto no es json')
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso, content: [{ type: 'text', text: 'ya' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--prompt', 'x', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--settings-source', 'project', '--output-style', 'quiet'])
    expect(p.exitCode).toBe(0)
    expect(p.stderr.toString()).toContain('settings.json')
  })

  test('--config-origin dice de que fuente salio cada clave', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    require('node:fs').mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), JSON.stringify({ model: 'claude-opus-5' }))
    writeFileSync(join(d, '.claude', 'settings.local.json'), JSON.stringify({ model: 'claude-sonnet-5' }))
    const p = Bun.spawnSync(['bun', 'run', BIN, '--config-origin', '--cwd', d, '--settings-source', 'project'])
    expect(p.exitCode).toBe(0)
    const salida = p.stdout.toString()
    expect(salida).toContain('model')
    expect(salida).toContain('localSettings')
  })
})
