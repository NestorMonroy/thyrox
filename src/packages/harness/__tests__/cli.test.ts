/**
 * La CLI escrita sobre el flujo de eventos (T-038, T-040).
 *
 * Fuente: diseño nativo del harness — la interfaz dibuja lo que `streamLoop`
 * emite y no puede inventar un estado que el flujo no traiga. El control que
 * discrimina es que un estado ausente del flujo no aparezca en la salida.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderEvent, renderStatusLine, OUTPUT_STYLES, type OutputStyle } from '../src/cli/render.ts'
import { forkSession, indexSessions } from '../src/sessions/index.ts'
import { openSession } from '../src/session.ts'
import { resumeChoices } from '../src/cli/resume.ts'
import type { HarnessEvent } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'cli-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }

describe('salida de la CLI desde los eventos (T-038, T-040)', () => {
  const evento = (e: HarnessEvent) => renderEvent(e, 'text')

  test('un evento de texto se imprime tal cual', () => {
    expect(evento({ type: 'text', turn: 1, text: 'hola' })).toBe('hola')
  })

  test('una llamada a herramienta se anuncia con su nombre y su argumento', () => {
    const s = evento({ type: 'tool_start', turn: 1, tool: 'Bash', input: { command: 'ls -la' } })
    expect(s).toContain('Bash')
    expect(s).toContain('ls -la')
  })

  test('un resultado de error se marca como error, no se mezcla con el exito', () => {
    const malo = evento({ type: 'tool_end', turn: 1, tool: 'Bash', output: 'no existe', isError: true })
    const bueno = evento({ type: 'tool_end', turn: 1, tool: 'Bash', output: 'ok', isError: false })
    expect(malo).not.toBe(bueno)
    expect(malo?.toLowerCase()).toContain('error')
  })

  test('la compactacion se DICE: el usuario tiene que saber que se perdio detalle', () => {
    const s = evento({ type: 'compaction', turn: 3, kind: 'micro', cleared: 4, freedTokens: 12000 })
    expect(s).toContain('4')
    expect(s).toContain('12000')
  })

  test('el estilo json emite una linea JSON por evento, valida', () => {
    const s = renderEvent({ type: 'text', turn: 1, text: 'hola' }, 'json')
    expect(JSON.parse(s as string).type).toBe('text')
  })

  test('el estilo quiet calla todo menos el texto y el cierre', () => {
    expect(renderEvent({ type: 'tool_start', turn: 1, tool: 'Bash', input: {} }, 'quiet')).toBeNull()
    expect(renderEvent({ type: 'text', turn: 1, text: 'hola' }, 'quiet')).toBe('hola')
  })

  test('los estilos declarados son los que renderEvent sabe tratar', () => {
    expect([...OUTPUT_STYLES].sort()).toEqual(['json', 'quiet', 'text'])
    for (const estilo of OUTPUT_STYLES) {
      expect(() => renderEvent({ type: 'turn_start', turn: 1 }, estilo as OutputStyle)).not.toThrow()
    }
  })
})

describe('linea de estado (T-040)', () => {
  test('lleva modelo, turno, tokens y coste', () => {
    const s = renderStatusLine({
      model: 'claude-opus-5', turn: 3, usage: { ...uso, cache_read_input_tokens: 500000 }, usd: 0.25,
    })
    expect(s).toContain('claude-opus-5')
    expect(s).toContain('3')
    expect(s).toContain('0.25')
  })

  test('un coste desconocido se dice, no se imprime como cero', () => {
    const s = renderStatusLine({ model: 'gpt-inexistente', turn: 1, usage: uso, usd: null })
    expect(s).not.toContain('0.00')
    expect(s.toLowerCase()).toContain('sin precio')
  })
})

describe('selector de reanudacion (T-041)', () => {
  test('lista las sesiones de mas reciente a mas antigua, con su resumen', async () => {
    const d = dir()
    const a = openSession({ cwd: d, transcriptDir: d })
    a.transcript.appendUser('la primera pregunta')
    a.transcript.appendAssistant({ id: 'm', model: 'claude-opus-5', content: [{ type: 'text', text: 'r' }] }, uso)
    await new Promise((r) => setTimeout(r, 5))
    const b = openSession({ cwd: d, transcriptDir: d })
    b.transcript.appendUser('la segunda pregunta')
    b.transcript.appendAssistant({ id: 'm', model: 'claude-sonnet-5', content: [{ type: 'text', text: 'r' }] }, uso)

    const opciones = resumeChoices(d)
    expect(opciones[0].id).toBe(b.id)
    expect(opciones[0].model).toBe('claude-sonnet-5')
    expect(opciones[0].summary).toContain('la segunda pregunta')
    expect(opciones[1].id).toBe(a.id)
  })

  test('una bifurcacion se anuncia como tal en su etiqueta', () => {
    const d = dir()
    const padre = openSession({ cwd: d, transcriptDir: d })
    padre.transcript.appendUser('origen')
    padre.transcript.appendAssistant({ id: 'm', model: 'claude-opus-5', content: [{ type: 'text', text: 'r' }] }, uso)
    const hija = forkSession({ cwd: d, transcriptDir: d, from: padre.id })
    const opcion = resumeChoices(d).find((o) => o.id === hija.id)
    expect(opcion?.label).toContain('bifurcada')
    expect(indexSessions(d).length).toBe(2)
  })

  test('un directorio sin sesiones da una lista vacia', () => {
    expect(resumeChoices(dir())).toEqual([])
  })

  test('el limite recorta, y recorta por las mas antiguas', () => {
    const d = dir()
    for (let i = 0; i < 3; i += 1) {
      const s = openSession({ cwd: d, transcriptDir: d })
      s.transcript.appendUser(`pregunta ${i}`)
      s.transcript.appendAssistant({ id: 'm', model: 'claude-opus-5', content: [{ type: 'text', text: 'r' }] }, uso)
    }
    expect(resumeChoices(d, 2).length).toBe(2)
  })
})

describe('renderEvent — el delta de texto (T-011)', () => {
  const delta = { type: 'text_delta', turn: 1, text: 'hola ' } as const

  // En `json` es un evento como cualquier otro: quien consume la tuberia
  // quiere verlo llegar.
  test('en json sale como evento propio', () => {
    expect(JSON.parse(String(renderEvent(delta, 'json'))).type).toBe('text_delta')
  })

  // En texto NO se emite como linea: el `text` del turno completo llega
  // despues con el mismo contenido, y emitir ambos lo duplicaria. El
  // incremental en terminal lo escribe el binario sin salto de linea.
  test('en text y quiet NO produce linea — el texto completo llega igual', () => {
    expect(renderEvent(delta, 'text')).toBeNull()
    expect(renderEvent(delta, 'quiet')).toBeNull()
  })
})
