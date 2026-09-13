import { describe, expect, test } from 'bun:test'
import {
  getEffectiveContextWindowSize,
  getAutoCompactThreshold,
  calculateTokenWarningState,
  isMainThreadSource,
  AUTOCOMPACT_BUFFER_TOKENS,
  WARNING_THRESHOLD_BUFFER_TOKENS,
  ERROR_THRESHOLD_BUFFER_TOKENS,
  MANUAL_COMPACT_BUFFER_TOKENS,
  type ContextWindowDeps,
} from '../compaction/contextWindowManager.ts'

function deps(overrides: Partial<Record<string, string>> = {}): ContextWindowDeps {
  return {
    getContextWindowSize: () => 200_000,
    getMaxOutputTokensForModel: () => 8_000,
    getSdkBetas: () => [],
    getEnv: (key: string) => overrides[key],
  }
}

describe('getEffectiveContextWindowSize', () => {
  test('resta el mínimo entre la salida máxima del modelo y el tope de resumen', () => {
    expect(getEffectiveContextWindowSize('m', deps())).toBe(200_000 - 8_000)
  })

  test('la reserva se acota a 20 000 aunque el modelo permita más salida', () => {
    const d = deps()
    d.getMaxOutputTokensForModel = () => 64_000
    expect(getEffectiveContextWindowSize('m', d)).toBe(200_000 - 20_000)
  })

  test('CLAUDE_CODE_AUTO_COMPACT_WINDOW acota la ventana por arriba antes de restar la reserva', () => {
    const d = deps({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: '50000' })
    expect(getEffectiveContextWindowSize('m', d)).toBe(50_000 - 8_000)
  })

  test('un override inválido (no numérico o <= 0) se ignora', () => {
    const negative = deps({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: '-5' })
    expect(getEffectiveContextWindowSize('m', negative)).toBe(200_000 - 8_000)
    const notNumeric = deps({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: 'x' })
    expect(getEffectiveContextWindowSize('m', notNumeric)).toBe(200_000 - 8_000)
  })
})

describe('getAutoCompactThreshold', () => {
  test('ventana efectiva menos el buffer de auto-compact, por defecto', () => {
    expect(getAutoCompactThreshold('m', deps())).toBe(200_000 - 8_000 - AUTOCOMPACT_BUFFER_TOKENS)
  })

  test('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE gana SÓLO si es más estricto que el umbral por buffer', () => {
    // 10% de 192000 = 19200, muy por debajo del umbral por buffer (179000)
    const strict = deps({ CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '10' })
    expect(getAutoCompactThreshold('m', strict)).toBe(19_200)
  })

  test('un porcentaje MÁS LAXO que el umbral por buffer nunca lo relaja (gana el min)', () => {
    // 99% de 192000 = 190080, por encima del umbral por buffer (179000)
    const lax = deps({ CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '99' })
    expect(getAutoCompactThreshold('m', lax)).toBe(200_000 - 8_000 - AUTOCOMPACT_BUFFER_TOKENS)
  })

  test('un porcentaje fuera de (0, 100] se ignora', () => {
    const outOfRange = deps({ CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '150' })
    expect(getAutoCompactThreshold('m', outOfRange)).toBe(200_000 - 8_000 - AUTOCOMPACT_BUFFER_TOKENS)
  })
})

describe('calculateTokenWarningState', () => {
  test('con auto-compact activo, el umbral de referencia es getAutoCompactThreshold', () => {
    const threshold = getAutoCompactThreshold('m', deps())
    const state = calculateTokenWarningState(threshold, 'm', deps(), true)
    expect(state.isAboveAutoCompactThreshold).toBe(true)
  })

  test('con auto-compact DESACTIVADO, isAboveAutoCompactThreshold es siempre false aunque el uso lo supere', () => {
    const threshold = getAutoCompactThreshold('m', deps())
    const state = calculateTokenWarningState(threshold + 1, 'm', deps(), false)
    expect(state.isAboveAutoCompactThreshold).toBe(false)
  })

  test('los umbrales de warning/error se miden contra el buffer de cada uno, no contra el mismo número', () => {
    expect(WARNING_THRESHOLD_BUFFER_TOKENS).toBe(ERROR_THRESHOLD_BUFFER_TOKENS)
    // Con los dos buffers iguales, warning y error se cruzan a la vez --
    // control de anulación: si alguno cambiara, dejarían de coincidir.
    const threshold = getAutoCompactThreshold('m', deps())
    const justBefore = threshold - WARNING_THRESHOLD_BUFFER_TOKENS - 1
    const state = calculateTokenWarningState(justBefore, 'm', deps(), true)
    expect(state.isAboveWarningThreshold).toBe(false)
    expect(state.isAboveErrorThreshold).toBe(false)
  })

  test('isAtBlockingLimit usa el override de CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE cuando es válido', () => {
    const d = deps({ CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE: '100' })
    const state = calculateTokenWarningState(100, 'm', d, false)
    expect(state.isAtBlockingLimit).toBe(true)
  })

  test('sin override, isAtBlockingLimit usa la ventana efectiva menos MANUAL_COMPACT_BUFFER_TOKENS', () => {
    const effective = getEffectiveContextWindowSize('m', deps())
    const limit = effective - MANUAL_COMPACT_BUFFER_TOKENS
    expect(calculateTokenWarningState(limit - 1, 'm', deps(), false).isAtBlockingLimit).toBe(false)
    expect(calculateTokenWarningState(limit, 'm', deps(), false).isAtBlockingLimit).toBe(true)
  })

  test('percentLeft nunca baja de 0 aunque el uso exceda el umbral', () => {
    const threshold = getAutoCompactThreshold('m', deps())
    const state = calculateTokenWarningState(threshold * 10, 'm', deps(), true)
    expect(state.percentLeft).toBe(0)
  })
})

describe('isMainThreadSource', () => {
  test('sin querySource, es el hilo principal', () => {
    expect(isMainThreadSource(undefined)).toBe(true)
  })
  test('con querySource repl_main_thread*, es el hilo principal', () => {
    expect(isMainThreadSource('repl_main_thread_abc')).toBe(true)
  })
  test('con cualquier otro querySource, no lo es', () => {
    expect(isMainThreadSource('subagent_x')).toBe(false)
  })
})
