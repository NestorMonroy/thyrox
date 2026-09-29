import { describe, expect, test } from 'bun:test'

import {
  MAX_SERVED_TOOLS_COUNT,
  WORKER_SHUTDOWN_SIGKILL_GRACE_MS,
  buildWorkerShutdownMessage,
  encodeWorkerBootstrap,
  parseWorkerToSupervisorMessage,
  scheduleForceKill,
  sendWorkerShutdownMessage,
  writeWorkerBootstrap,
} from '../workerIpc.js'

// Porte de las piezas IPC de `class Ue` (`chunk-92tvramn.js`, referencia
// 2.1.283), resueltas con `bin/binary symbol`.

describe('encodeWorkerBootstrap', () => {
  test('serializa config+token y termina con salto de línea, como `b(...)+"\\n"`', () => {
    expect(encodeWorkerBootstrap({ config: { dir: '/x' }, initialAccessToken: 'tok' })).toBe(
      '{"config":{"dir":"/x"},"initialAccessToken":"tok"}\n',
    )
  })

  test('initialAccessToken ausente no aparece en el JSON (undefined se omite)', () => {
    expect(encodeWorkerBootstrap({ config: null })).toBe('{"config":null}\n')
  })
})

describe('writeWorkerBootstrap', () => {
  test('escribe el bootstrap codificado y cierra stdin', () => {
    const writes: string[] = []
    let ended = false
    const stdin = {
      write: (chunk: string) => {
        writes.push(chunk)
        return true
      },
      end: () => {
        ended = true
      },
      on: () => stdin,
    }
    writeWorkerBootstrap(stdin, { config: { a: 1 } })
    expect(writes).toEqual(['{"config":{"a":1}}\n'])
    expect(ended).toBe(true)
  })

  test('registra el listener de error de stdin ANTES de escribir, si se provee', () => {
    const order: string[] = []
    const stdin = {
      write: () => {
        order.push('write')
        return true
      },
      end: () => order.push('end'),
      on: () => order.push('on-error'),
    }
    writeWorkerBootstrap(stdin, { config: null }, () => {})
    expect(order).toEqual(['on-error', 'write', 'end'])
  })
})

describe('parseWorkerToSupervisorMessage — rc_busy', () => {
  test('acepta {type:"rc_busy", busy:boolean}', () => {
    expect(parseWorkerToSupervisorMessage({ type: 'rc_busy', busy: true })).toEqual({
      type: 'rc_busy',
      busy: true,
    })
    expect(parseWorkerToSupervisorMessage({ type: 'rc_busy', busy: false })).toEqual({
      type: 'rc_busy',
      busy: false,
    })
  })

  test('rehúsa si busy no es boolean', () => {
    expect(parseWorkerToSupervisorMessage({ type: 'rc_busy', busy: 'yes' })).toBeUndefined()
  })

  test('rehúsa si falta la clave busy', () => {
    expect(parseWorkerToSupervisorMessage({ type: 'rc_busy' })).toBeUndefined()
  })
})

describe('parseWorkerToSupervisorMessage — rc_serving_tools', () => {
  test('acepta un entero entre 0 y MAX_SERVED_TOOLS_COUNT', () => {
    expect(parseWorkerToSupervisorMessage({ type: 'rc_serving_tools', count: 0 })).toEqual({
      type: 'rc_serving_tools',
      count: 0,
    })
    expect(
      parseWorkerToSupervisorMessage({ type: 'rc_serving_tools', count: MAX_SERVED_TOOLS_COUNT }),
    ).toEqual({ type: 'rc_serving_tools', count: MAX_SERVED_TOOLS_COUNT })
  })

  test('rehúsa count por encima del tope', () => {
    expect(
      parseWorkerToSupervisorMessage({
        type: 'rc_serving_tools',
        count: MAX_SERVED_TOOLS_COUNT + 1,
      }),
    ).toBeUndefined()
  })

  test('rehúsa count negativo o no entero', () => {
    expect(parseWorkerToSupervisorMessage({ type: 'rc_serving_tools', count: -1 })).toBeUndefined()
    expect(parseWorkerToSupervisorMessage({ type: 'rc_serving_tools', count: 1.5 })).toBeUndefined()
  })
})

describe('parseWorkerToSupervisorMessage — formas rechazadas', () => {
  test('null, no-objeto y type desconocido devuelven undefined', () => {
    expect(parseWorkerToSupervisorMessage(null)).toBeUndefined()
    expect(parseWorkerToSupervisorMessage('rc_busy')).toBeUndefined()
    expect(parseWorkerToSupervisorMessage({ type: 'unknown' })).toBeUndefined()
    expect(parseWorkerToSupervisorMessage({})).toBeUndefined()
  })
})

describe('buildWorkerShutdownMessage', () => {
  test('sin causa, la clave cause está AUSENTE (no undefined)', () => {
    const message = buildWorkerShutdownMessage()
    expect(message).toEqual({ type: 'shutdown' })
    expect('cause' in message).toBe(false)
  })

  test('con causa, se incluye tal cual', () => {
    expect(buildWorkerShutdownMessage('reload')).toEqual({ type: 'shutdown', cause: 'reload' })
  })
})

describe('sendWorkerShutdownMessage', () => {
  test('manda el mensaje por send() y devuelve su resultado', () => {
    const sent: unknown[] = []
    const child = { send: (m: unknown) => (sent.push(m), true) }
    expect(sendWorkerShutdownMessage(child, 'reload')).toBe(true)
    expect(sent).toEqual([{ type: 'shutdown', cause: 'reload' }])
  })

  test('sin send(), degrada a false en silencio', () => {
    expect(sendWorkerShutdownMessage({})).toBe(false)
  })

  test('si send() lanza, degrada a false en silencio (catch{})', () => {
    const child = {
      send: () => {
        throw new Error('epipe')
      },
    }
    expect(sendWorkerShutdownMessage(child)).toBe(false)
  })
})

describe('scheduleForceKill', () => {
  test('llama a kill("SIGKILL") tras el plazo de gracia', async () => {
    const calls: string[] = []
    const target = { kill: (signal: string) => calls.push(signal) }
    scheduleForceKill(target, 10)
    expect(calls).toEqual([])
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(calls).toEqual(['SIGKILL'])
  })

  test('el default es WORKER_SHUTDOWN_SIGKILL_GRACE_MS=5000', () => {
    const target = { kill: () => {} }
    const timer = scheduleForceKill(target)
    clearTimeout(timer)
    // @ts-expect-error -- acceso a un detalle interno de Timeout sólo para el control de anulación
    const delay = timer._idleTimeout as number
    expect(delay).toBe(WORKER_SHUTDOWN_SIGKILL_GRACE_MS)
  })

  test('el timer se puede cancelar con clearTimeout antes de disparar', async () => {
    const calls: string[] = []
    const target = { kill: (signal: string) => calls.push(signal) }
    const timer = scheduleForceKill(target, 10)
    clearTimeout(timer)
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(calls).toEqual([])
  })
})
