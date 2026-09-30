import { afterEach, describe, expect, test } from 'bun:test'
import { installLocalObservability } from '../core.js'
import {
  endToolBlockedOnUserSpan,
  endToolExecutionSpan,
  endToolSpan,
  startToolBlockedOnUserSpan,
  startToolExecutionSpan,
  startToolSpan,
} from '../spans.js'

// Un tracer que anota qué abre y qué cierra: el contrato de sesión no le da
// el span al llamador, así que la única forma de medir el cierre es aquí.
function recordingTracer() {
  const ended: string[] = []
  let n = 0
  const tracer = {
    startSpan: (name: string) => ({ name, id: ++n }),
    endSpan: (span: { name: string }) => ended.push(span.name),
  }
  installLocalObservability({ tracer: tracer as never })
  return ended
}

afterEach(() => {
  endToolSpan()
  endToolExecutionSpan()
  endToolBlockedOnUserSpan()
})

describe('spans de herramienta con el contrato de sesión', () => {
  test('cada end cierra el span que abrió su start, sin recibirlo', () => {
    const ended = recordingTracer()
    startToolSpan('Bash', { tool: 'Bash' }, '{}')
    startToolBlockedOnUserSpan()
    endToolBlockedOnUserSpan('accept', 'config')
    startToolExecutionSpan()
    endToolExecutionSpan({ success: true })
    endToolSpan('ok')
    expect(ended).toEqual(['tool_blocked_on_user', 'tool_execution', 'tool'])
  })

  test('un segundo end sin span abierto no cierra nada', () => {
    const ended = recordingTracer()
    startToolSpan('Read')
    endToolSpan()
    endToolSpan()
    expect(ended).toEqual(['tool'])
  })
})
