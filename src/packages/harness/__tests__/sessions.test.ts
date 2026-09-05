/**
 * Sesión (T-003): identidad, dónde vive su transcript y cómo se reanuda.
 *
 * Fuente del porte: el layout del cliente —un directorio por proyecto, un JSONL
 * por sesión—, copiado para que la instrumentación existente encuentre nuestros
 * transcripts donde ya sabe mirar. El test fija esa ruta, no una propia.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openSession } from '../src/session.ts'
import { forkSession, indexSessions, latestSession, planResume } from '../src/sessions/index.ts'
import { readTranscript } from '../src/transcript.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'ses-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }

/** Una sesión con dos turnos, para tener algo que bifurcar e indexar. */
function sembrar(d: string, model = 'claude-opus-5') {
  const s = openSession({ cwd: d, transcriptDir: d })
  s.transcript.appendUser('primero')
  s.transcript.appendAssistant({ id: 'm1', model, content: [{ type: 'text', text: 'uno' }] }, uso)
  s.transcript.appendUser('segundo')
  s.transcript.appendAssistant({ id: 'm2', model, content: [{ type: 'text', text: 'dos' }] }, uso)
  return s
}

describe('bifurcacion de sesion (T-028)', () => {
  test('la hija nace con id propio y con el historial del padre', () => {
    const d = dir()
    const padre = sembrar(d)
    const hija = forkSession({ cwd: d, transcriptDir: d, from: padre.id })
    expect(hija.id).not.toBe(padre.id)
    expect(hija.previous.length).toBe(readTranscript(padre.transcriptPath).length)
    expect(hija.forkedFrom).toBe(padre.id)
  })

  test('el transcript de la hija declara de quien viene', () => {
    const d = dir()
    const padre = sembrar(d)
    const hija = forkSession({ cwd: d, transcriptDir: d, from: padre.id })
    const lineas = readFileSync(hija.transcriptPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const marca = lineas.find((l) => l.subtype === 'fork')
    expect(marca.content).toBe(padre.id)
    expect(marca.sessionId).toBe(hija.id)
  })

  test('escribir en la hija NO toca el transcript del padre', () => {
    const d = dir()
    const padre = sembrar(d)
    const antes = readFileSync(padre.transcriptPath, 'utf8')
    const hija = forkSession({ cwd: d, transcriptDir: d, from: padre.id })
    hija.transcript.appendUser('solo de la hija')
    expect(readFileSync(padre.transcriptPath, 'utf8')).toBe(antes)
  })

  test('bifurcar de una sesion que no existe es un error, no una sesion vacia', () => {
    const d = dir()
    expect(() => forkSession({ cwd: d, transcriptDir: d, from: 'no-existe' })).toThrow(/no-existe/)
  })
})

describe('reanudacion con cambio de modelo (T-029)', () => {
  test('mismo modelo: el prefijo se reusa, no se reescribe', () => {
    const d = dir()
    const s = sembrar(d, 'claude-opus-5')
    const p = planResume({ transcriptPath: s.transcriptPath, toModel: 'claude-opus-5' })
    expect(p.fromModel).toBe('claude-opus-5')
    expect(p.reusesCache).toBe(true)
    expect(p.rewriteTokens).toBe(0)
  })

  test('otro modelo: la clave cambia y el prefijo entero se reescribe', () => {
    const d = dir()
    const s = sembrar(d, 'claude-opus-5')
    const p = planResume({ transcriptPath: s.transcriptPath, toModel: 'claude-fable-5-1' })
    expect(p.reusesCache).toBe(false)
    expect(p.rewriteTokens).toBeGreaterThan(0)
    expect(p.reason).toContain('claude-fable-5-1')
  })

  test('un transcript sin turnos del modelo no adivina: fromModel es null', () => {
    const d = dir()
    const s = openSession({ cwd: d, transcriptDir: d })
    s.transcript.appendUser('solo yo')
    const p = planResume({ transcriptPath: s.transcriptPath, toModel: 'claude-opus-5' })
    expect(p.fromModel).toBeNull()
    expect(p.reusesCache).toBe(false)
  })

  test('el modelo sale del transcript, nunca de un alias', () => {
    const d = dir()
    const s = sembrar(d, 'claude-sonnet-5')
    expect(planResume({ transcriptPath: s.transcriptPath, toModel: 'sonnet' }).reusesCache).toBe(false)
  })
})

describe('indice de sesiones (T-030)', () => {
  test('una fila por transcript, con su modelo, turnos y uso agregado', () => {
    const d = dir()
    const a = sembrar(d, 'claude-opus-5')
    const filas = indexSessions(d)
    expect(filas.length).toBe(1)
    expect(filas[0].id).toBe(a.id)
    expect(filas[0].model).toBe('claude-opus-5')
    expect(filas[0].turns).toBe(2)
    expect(filas[0].usage.cache_read_input_tokens).toBe(200)
    expect(filas[0].firstAt <= filas[0].lastAt).toBe(true)
  })

  test('la bifurcacion aparece en el indice apuntando a su padre', () => {
    const d = dir()
    const padre = sembrar(d)
    const hija = forkSession({ cwd: d, transcriptDir: d, from: padre.id })
    const porId = Object.fromEntries(indexSessions(d).map((f) => [f.id, f]))
    expect(porId[hija.id].forkedFrom).toBe(padre.id)
    expect(porId[padre.id].forkedFrom).toBeNull()
  })

  test('un directorio sin transcripts da un indice vacio, no un error', () => {
    expect(indexSessions(dir())).toEqual([])
    expect(latestSession(dir())).toBeNull()
  })

  test('latestSession devuelve la de actividad mas reciente', async () => {
    const d = dir()
    sembrar(d)
    await new Promise((r) => setTimeout(r, 5))
    const segunda = sembrar(d)
    expect(latestSession(d)?.id).toBe(segunda.id)
  })

  test('ignora un archivo que no sea un transcript legible', () => {
    const d = dir()
    const s = sembrar(d)
    Bun.write(join(d, 'notas.txt'), 'esto no es un transcript')
    expect(indexSessions(d).map((f) => f.id)).toEqual([s.id])
  })
})
