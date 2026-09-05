/**
 * Reconciliación de estado tras un reinicio del worker (T-089..T-093).
 *
 * Cada función lleva su control anulado: un test que exige que el guardia
 * anulado CAMBIE el veredicto, no sólo que el verde exista. Es el sub-patrón D
 * de `metrica-decide-la-conclusion.md` — un control que no puede fallar no es
 * un control. La fuente de cada guardia está en los tres análisis del bloque
 * 21 de la iniciativa.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TranscriptLine } from '../src/transcript.ts'
import type { Message } from '../src/types.ts'
import {
  classifyLastTurn, filterUnresolvedToolUses, resumableMessages,
  sessionEpoch, reconcileWorkingTree, TERMINAL_TOOLS,
  verifyAdoption, readProcStart, isPidAlive,
} from '../src/session/reconcile.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'rec-'))
function linea(o: Partial<TranscriptLine>): TranscriptLine {
  return { type: 'user', timestamp: '2026-09-02T00:00:00.000Z', sessionId: 's', ...o } as TranscriptLine
}
const userTexto = (t: string) => linea({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: t }] } })
const asis = (t: string) => linea({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: t }] } })
const toolUse = (id: string, name = 'Bash') => linea({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input: {} }] } })
const toolResult = (id: string) => linea({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] } })
const adjunto = (payload: Record<string, unknown>) => linea({ type: 'attachment', attachment: payload as any })

describe('classifyLastTurn (T-089)', () => {
  test('sin mensajes → none', () => {
    expect(classifyLastTurn([])).toBe('none')
  })
  test('un assistant como último → turno completo (none)', () => {
    expect(classifyLastTurn([userTexto('hola'), asis('respondo')])).toBe('none')
  })
  test('un user de texto plano sin respuesta → interrupted_prompt', () => {
    expect(classifyLastTurn([asis('previo'), userTexto('¿y esto?')])).toBe('interrupted_prompt')
  })
  test('un tool_result NO terminal como último → interrupted_turn', () => {
    const ls = [toolUse('a', 'Bash'), toolResult('a')]
    expect(classifyLastTurn(ls)).toBe('interrupted_turn')
  })
  test('system y progress al final no enmascaran la interrupción', () => {
    const ls = [asis('previo'), userTexto('pregunta'), linea({ type: 'system', subtype: 'stop', content: 'x' }), linea({ type: 'progress', content: 'y' })]
    expect(classifyLastTurn(ls)).toBe('interrupted_prompt')
  })
  test('un attachment como último → interrupted_turn (contexto sin respuesta)', () => {
    const ls = [userTexto('mira'), linea({ type: 'attachment', attachment: { type: 'hook' } })]
    expect(classifyLastTurn(ls)).toBe('interrupted_turn')
  })
  // CONTROL ANULADO: el guardia de herramienta terminal. Con él, un tool_result
  // de una herramienta terminal (p. ej. SendUserMessage en modo breve) cierra
  // el turno. Sin él, se clasifica interrupted_turn — el falso positivo que
  // ccnmt: conversationRecovery.tsx:316 documenta.
  test('un tool_result de herramienta TERMINAL cierra el turno (none)', () => {
    const term = [...TERMINAL_TOOLS][0]
    const ls = [toolUse('a', term), toolResult('a')]
    expect(classifyLastTurn(ls)).toBe('none')
  })
  test('CONTROL: la MISMA secuencia con la herramienta fuera del set terminal es interrupted_turn', () => {
    const ls = [toolUse('a', 'Bash'), toolResult('a')]
    // Bash no es terminal: el guardia no aplica y el veredicto cambia. Si el
    // guardia estuviera degradado a "todo tool_result cierra", este caso caería.
    expect(classifyLastTurn(ls)).toBe('interrupted_turn')
  })
})

describe('filterUnresolvedToolUses (T-090)', () => {
  const m = (role: 'user' | 'assistant', content: Message['content']): Message => ({ role, content })
  test('un tool_use con su tool_result se conserva', () => {
    const ms = [m('assistant', [{ type: 'tool_use', id: 'a', name: 'Bash', input: {} }]), m('user', [{ type: 'tool_result', tool_use_id: 'a', content: 'ok' }])]
    expect(filterUnresolvedToolUses(ms).length).toBe(2)
  })
  test('un tool_use SIN su tool_result se retira', () => {
    const ms = [m('assistant', [{ type: 'tool_use', id: 'huerfano', name: 'Bash', input: {} }])]
    const out = filterUnresolvedToolUses(ms)
    expect(out.flatMap((x) => x.content).some((b) => b.type === 'tool_use')).toBe(false)
  })
  // CONTROL ANULADO (por construcción, no por bandera): la firma toma y devuelve
  // `Message`, que NO lleva uuid. Es lo que evita el bug de crecimiento
  // exponencial del transcript que ccnmt: agent/messages.ts documenta —
  // re-normalizar generaría uuids nuevos que el dedup no reconoce. El test
  // fija que el conteo de bloques no crece: idempotente sobre lo ya resuelto.
  test('idempotente: no inventa bloques al re-aplicar', () => {
    const ms = [m('assistant', [{ type: 'tool_use', id: 'a', name: 'Bash', input: {} }]), m('user', [{ type: 'tool_result', tool_use_id: 'a', content: 'ok' }])]
    const una = filterUnresolvedToolUses(ms)
    const dos = filterUnresolvedToolUses(una)
    expect(dos).toEqual(una)
  })
  test('un assistant con texto y un tool_use huérfano conserva el texto', () => {
    const ms = [m('assistant', [{ type: 'text', text: 'pensé' }, { type: 'tool_use', id: 'h', name: 'Bash', input: {} }])]
    const out = filterUnresolvedToolUses(ms)
    const bloques = out.flatMap((x) => x.content)
    expect(bloques.some((b) => b.type === 'text')).toBe(true)
    expect(bloques.some((b) => b.type === 'tool_use')).toBe(false)
  })
})

describe('resumableMessages respeta la última compact_boundary (T-091)', () => {
  test('sin frontera devuelve todos los turnos', () => {
    const ls = [userTexto('uno'), asis('a'), userTexto('dos'), asis('b')]
    expect(resumableMessages(ls).length).toBe(4)
  })
  // CONTROL ANULADO: la frontera. Con el índice, sólo cuentan los turnos DESPUÉS
  // de la última compact_boundary. Sin él (el readTranscript lineal de hoy) se
  // devolverían los 4 — el contexto compactado reaparece.
  test('con una frontera a la mitad, sólo cuentan los turnos posteriores', () => {
    const ls = [userTexto('viejo'), asis('viejo-r'), linea({ type: 'system', subtype: 'compact_boundary', content: 'x' }), userTexto('nuevo'), asis('nuevo-r')]
    const out = resumableMessages(ls)
    expect(out.length).toBe(2)
    expect(out.every((mm) => JSON.stringify(mm.content).includes('nuevo'))).toBe(true)
  })
  test('gana la ÚLTIMA frontera cuando hay dos', () => {
    const ls = [userTexto('a'), linea({ type: 'system', subtype: 'compact_boundary', content: '1' }), userTexto('b'), linea({ type: 'system', subtype: 'compact_boundary', content: '2' }), userTexto('c'), asis('cr')]
    expect(resumableMessages(ls).length).toBe(2)
  })

  test('un attachment de contexto de hook VUELVE al reanudar, en su posición (#37)', () => {
    const ls = [
      userTexto('pregunta'),
      adjunto({ type: 'hook_additional_context', content: ['contexto del hook'] }),
      asis('respuesta'),
    ]
    const out = resumableMessages(ls)
    expect(out.length).toBe(3)
    expect(JSON.stringify(out[1])).toContain('contexto del hook')
  })

  // CONTROL: el andamiaje de sesión NO vuelve — la sesión nueva lo re-inyecta.
  // Sin survivesResume, este `environment` se reproduciría y duplicaría.
  test('un attachment de andamiaje de sesión NO vuelve al reanudar (#37)', () => {
    const ls = [
      userTexto('hola'),
      adjunto({ type: 'environment', content: 'cwd=/home/user' }),
      asis('ok'),
    ]
    const out = resumableMessages(ls)
    expect(out.length).toBe(2)
    expect(JSON.stringify(out)).not.toContain('cwd=/home/user')
  })

  test('un hook_success de SessionStart vuelve; uno de un evento no-renderizable no', () => {
    const rendible = [userTexto('a'), adjunto({ type: 'hook_success', hookEvent: 'SessionStart', hookName: 'h', content: 'salida' }), asis('b')]
    expect(JSON.stringify(resumableMessages(rendible))).toContain('salida')
    const noRendible = [userTexto('a'), adjunto({ type: 'hook_success', hookEvent: 'PostToolUse', content: 'x' }), asis('b')]
    // sobrevive el tipo, pero renderAttachment devuelve [] para PostToolUse
    expect(resumableMessages(noRendible).length).toBe(2)
  })
})

describe('sessionEpoch (T-092)', () => {
  test('ausente vale 1 y no hay worker previo', () => {
    expect(sessionEpoch({})).toEqual({ epoch: 1, priorWorkerProcess: false })
  })
  test('247 → prior worker true', () => {
    expect(sessionEpoch({ CLAUDE_CODE_WORKER_EPOCH: '247' })).toEqual({ epoch: 247, priorWorkerProcess: true })
  })
  test('mal formada → MAX_SAFE_INTEGER (hubo worker, seguro)', () => {
    expect(sessionEpoch({ CLAUDE_CODE_WORKER_EPOCH: 'x' }).epoch).toBe(Number.MAX_SAFE_INTEGER)
    expect(sessionEpoch({ CLAUDE_CODE_WORKER_EPOCH: 'x' }).priorWorkerProcess).toBe(true)
  })
  test('0 y negativos → MAX_SAFE_INTEGER (no es un ordinal válido ≥1)', () => {
    expect(sessionEpoch({ CLAUDE_CODE_WORKER_EPOCH: '0' }).epoch).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('reconcileWorkingTree (T-093)', () => {
  function repoConCambio(): string {
    const d = dir()
    execFileSync('git', ['init', '-q', d])
    execFileSync('git', ['-C', d, 'config', 'user.email', 't@t'])
    execFileSync('git', ['-C', d, 'config', 'user.name', 't'])
    writeFileSync(join(d, 'a.txt'), 'uno\n')
    execFileSync('git', ['-C', d, 'add', 'a.txt'])
    execFileSync('git', ['-C', d, 'commit', '-q', '-m', 'seed'])
    writeFileSync(join(d, 'b.txt'), 'sin commitear\n')
    return d
  }
  test('reporta el archivo sin commitear', () => {
    const d = repoConCambio()
    const r = reconcileWorkingTree([{ path: d }])
    expect(r[0].dirty).toBe(true)
    expect(r[0].porcelain.some((l) => l.includes('b.txt'))).toBe(true)
  })
  test('un repo limpio no está sucio', () => {
    const d = repoConCambio()
    execFileSync('git', ['-C', d, 'add', '-A'])
    execFileSync('git', ['-C', d, 'commit', '-q', '-m', 'limpio'])
    const r = reconcileWorkingTree([{ path: d }])
    expect(r[0].dirty).toBe(false)
  })
  test('un path que no es repo se reporta como error, no rompe la barrida', () => {
    const d = dir()
    const r = reconcileWorkingTree([{ path: d }])
    expect(r[0].error).toBeDefined()
    expect(r[0].dirty).toBe(false)
  })
})

describe('verifyAdoption (T-094)', () => {
  test('el propio proceso está verified (pid vivo, procStart coincide)', () => {
    const st = readProcStart(process.pid)
    expect(st).toBeGreaterThan(0)
    expect(verifyAdoption(process.pid, st)).toBe('verified')
  })
  test('procStart no registrado → verified (se confía en el pid vivo)', () => {
    expect(verifyAdoption(process.pid)).toBe('verified')
  })
  // CONTROL: un procStart que NO coincide con el real es un pid reciclado. Sin
  // el campo procStart, verifyAdoption diría 'verified' y adoptaría un proceso
  // ajeno; con él, distingue.
  test('procStart distinto del real → recycled', () => {
    const st = readProcStart(process.pid)
    expect(verifyAdoption(process.pid, st + 1)).toBe('recycled')
  })
  test('un pid que no existe → dead', () => {
    // pid 2^22 no existe en este contenedor; si existiera, kill(0) daría EPERM
    // y el test lo detectaría como no-dead. Se usa uno improbable y se afirma.
    expect(isPidAlive(4194303)).toBe(false)
    expect(verifyAdoption(4194303)).toBe('dead')
  })
})
