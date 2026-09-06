/**
 * Test de contrato para el cap de bloqueos consecutivos del Stop hook
 * — porte de `ccnmt: packages/agent/__tests__/stopHookBlockCap.test.ts`
 * (ant v2.1.143 3999.js). Fija `resolveStopHookBlockCap` (parseo de
 * env) y `evaluateStopHookBlockOutcome` (la aritmética de decisión que
 * el query loop corre después de cada Stop hook que bloquea).
 *
 * Por qué existe: un Stop hook `/goal` cuya condición nunca puede
 * satisfacerse bloquea al turno de terminar en cada ciclo, inyectando
 * un blockingError al transcript cada vez. Sin cota, el transcript
 * crece hasta que la llamada principal a la API da 413 ("Prompt is
 * too long"). Este cap es el respaldo estructural; el veredicto
 * `impossible` del evaluador (`execPromptHook`) puede cortar en corto
 * ALGUNOS casos pero depende de que el evaluador lo proponga
 * voluntariamente, así que no puede ser la garantía.
 *
 * Un drift aquí, o quita el respaldo (vuelve la espiral-mortal de PTL)
 * o acota demasiado agresivo (mata loops `/goal` legítimos de larga
 * duración). El límite de max_turns también importa: sin él, un hook
 * que bloquea re-consulta para siempre en modo headless sin importar
 * --max-turns.
 *
 * PORTE PARCIAL declarado (ver el docstring de
 * `internal/stopHooksCore.ts`): sólo se importan las dos funciones
 * puras que el test de origen ejercita; `handleStopHooks` (el
 * generador async de integración, con toda su cadena de paquetes
 * ausentes) y `stopHookBlockCapMessage` (autocontenido pero sin test
 * que lo ejercite) quedan fuera, declarados por nombre y razón en el
 * módulo.
 */
import { describe, expect, test } from 'bun:test'
import {
  evaluateStopHookBlockOutcome,
  resolveStopHookBlockCap,
} from '../internal/stopHooksCore.js'

describe('resolveStopHookBlockCap', () => {
  test('sin fijar / vacío / no-numérico → default 8', () => {
    expect(resolveStopHookBlockCap(undefined)).toBe(8)
    expect(resolveStopHookBlockCap('')).toBe(8)
    expect(resolveStopHookBlockCap('abc')).toBe(8)
    expect(resolveStopHookBlockCap('  ')).toBe(8)
  })

  test('entero positivo → ese valor', () => {
    expect(resolveStopHookBlockCap('1')).toBe(1)
    expect(resolveStopHookBlockCap('16')).toBe(16)
  })

  test('cero / negativo → pasa tal cual (el guard >0 del llamador deshabilita el cap)', () => {
    expect(resolveStopHookBlockCap('0')).toBe(0)
    expect(resolveStopHookBlockCap('-1')).toBe(-1)
  })

  test('la semántica radix-10 de parseInt hace match con ant', () => {
    expect(resolveStopHookBlockCap('8abc')).toBe(8) // dígitos iniciales
    expect(resolveStopHookBlockCap('0x10')).toBe(0) // se detiene en la x
  })
})

describe('evaluateStopHookBlockOutcome', () => {
  test('por debajo del cap → continúa con los contadores subidos', () => {
    const d = evaluateStopHookBlockOutcome({
      turnCount: 3,
      blockingCount: 2,
      maxTurns: undefined,
      blockCapEnv: undefined,
    })
    expect(d).toEqual({
      kind: 'continue',
      nextTurnCount: 4,
      nextBlockingCount: 3,
    })
  })

  test('el 8vo bloqueo consecutivo aún continúa (cap default 8)', () => {
    const d = evaluateStopHookBlockOutcome({
      turnCount: 7,
      blockingCount: 7, // → nextBlockingCount 8, no > 8
      maxTurns: undefined,
      blockCapEnv: undefined,
    })
    expect(d.kind).toBe('continue')
  })

  test('el 9no bloqueo consecutivo dispara el cap (default 8)', () => {
    const d = evaluateStopHookBlockOutcome({
      turnCount: 8,
      blockingCount: 8, // → nextBlockingCount 9 > 8
      maxTurns: undefined,
      blockCapEnv: undefined,
    })
    expect(d).toEqual({ kind: 'cap_exceeded', nextBlockingCount: 9 })
  })

  test('se respeta un cap a medida vía env', () => {
    const d = evaluateStopHookBlockOutcome({
      turnCount: 2,
      blockingCount: 2, // → 3 > 2
      maxTurns: undefined,
      blockCapEnv: '2',
    })
    expect(d).toEqual({ kind: 'cap_exceeded', nextBlockingCount: 3 })
  })

  test('cap=0 deshabilita el respaldo — nunca dispara sin importar la racha', () => {
    const d = evaluateStopHookBlockOutcome({
      turnCount: 999,
      blockingCount: 999,
      maxTurns: undefined,
      blockCapEnv: '0',
    })
    expect(d.kind).toBe('continue')
    expect(d.nextBlockingCount).toBe(1000)
  })

  test('maxTurns dispara antes que el cap y tiene precedencia', () => {
    // Incluso con el cap deshabilitado, maxTurns sigue acotando el loop
    // de bloqueo.
    const d = evaluateStopHookBlockOutcome({
      turnCount: 5,
      blockingCount: 0,
      maxTurns: 5, // nextTurnCount 6 > 5
      blockCapEnv: '0',
    })
    expect(d).toEqual({
      kind: 'max_turns',
      nextTurnCount: 6,
      nextBlockingCount: 1,
    })
  })

  test('maxTurns se chequea contra nextTurnCount, no contra el actual', () => {
    // turnCount 4, maxTurns 5 → nextTurnCount 5, no > 5 → sigue continue.
    const d = evaluateStopHookBlockOutcome({
      turnCount: 4,
      blockingCount: 0,
      maxTurns: 5,
      blockCapEnv: undefined,
    })
    expect(d.kind).toBe('continue')
    expect(d.nextTurnCount).toBe(5)
  })

  test('max_turns gana cuando tanto maxTurns como el cap dispararían', () => {
    // Orden de ant: el chequeo de maxTurns precede al chequeo del cap.
    const d = evaluateStopHookBlockOutcome({
      turnCount: 10,
      blockingCount: 20, // el cap dispararía (21 > 8)
      maxTurns: 5, // pero maxTurns dispara primero (11 > 5)
      blockCapEnv: undefined,
    })
    expect(d.kind).toBe('max_turns')
  })
})
