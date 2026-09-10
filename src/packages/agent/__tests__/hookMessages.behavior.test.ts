/**
 * Porte de `ccnmt: packages/agent/__tests__/hookMessages.behavior.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia es
 * el idioma de la descripción.
 */
import { describe, expect, test } from 'bun:test'

import {
  getPreToolHookBlockingMessage,
  getStopHookMessage,
  getTeammateIdleHookMessage,
  getTaskCreatedHookMessage,
  getTaskCompletedHookMessage,
  getUserPromptSubmitHookBlockingMessage,
} from '../hooks.js'

/**
 * Fija el formato exacto de los mensajes de feedback de hooks. Estas cadenas
 * son lo que se le muestra AL MODELO como system reminders / mensajes de rol
 * usuario cuando un hook bloquea. El modelo usa el prefijo ("Stop hook
 * feedback:" etc.) para saber que está viendo una respuesta de bloqueo de
 * hook y no un resultado de herramienta, así que el prefijo es parte del
 * contrato.
 *
 * Un formato equivocado → el modelo trata la salida del hook como un
 * resultado de herramienta normal y puede seguir ejecutando en vez de
 * esperar a que el hook se reevalúe.
 */
describe('Formato del feedback de hooks (contrato de hook-message del ant)', () => {
  const sampleError = { blockingError: 'do not commit secrets to git' }

  test('PreToolUse: "<hookName> hook error: <message>"', () => {
    expect(getPreToolHookBlockingMessage('Bash', sampleError)).toBe(
      'Bash hook error: do not commit secrets to git',
    )
  })

  test('Stop: "Stop hook feedback:\\n<message>"', () => {
    expect(getStopHookMessage(sampleError)).toBe(
      'Stop hook feedback:\ndo not commit secrets to git',
    )
  })

  test('TeammateIdle: "TeammateIdle hook feedback:\\n<message>"', () => {
    expect(getTeammateIdleHookMessage(sampleError)).toBe(
      'TeammateIdle hook feedback:\ndo not commit secrets to git',
    )
  })

  test('TaskCreated: "TaskCreated hook feedback:\\n<message>"', () => {
    expect(getTaskCreatedHookMessage(sampleError)).toBe(
      'TaskCreated hook feedback:\ndo not commit secrets to git',
    )
  })

  test('TaskCompleted: "TaskCompleted hook feedback:\\n<message>"', () => {
    expect(getTaskCompletedHookMessage(sampleError)).toBe(
      'TaskCompleted hook feedback:\ndo not commit secrets to git',
    )
  })

  test('UserPromptSubmit: "UserPromptSubmit operation blocked by hook:\\n<message>"', () => {
    expect(getUserPromptSubmitHookBlockingMessage(sampleError)).toBe(
      'UserPromptSubmit operation blocked by hook:\ndo not commit secrets to git',
    )
  })

  test('preserva errores de bloqueo multilínea verbatim', () => {
    const multilineError = {
      blockingError: 'line 1\nline 2\nline 3',
    }
    const result = getStopHookMessage(multilineError)
    expect(result).toBe('Stop hook feedback:\nline 1\nline 2\nline 3')
  })

  test('un error de bloqueo vacío se renderiza limpio (sin dos puntos colgante, sin crash)', () => {
    expect(getStopHookMessage({ blockingError: '' })).toBe('Stop hook feedback:\n')
  })
})
