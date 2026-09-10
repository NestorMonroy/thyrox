/**
 * La mitad ROJA del porte de `planModeV2`.
 *
 * Procedencia: `ccnmt: packages/permission/src/planModeV2.ts` (101 líneas,
 * 4 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se reimplementa y no se copia.
 *
 * Métrica: la precedencia de cada decisión —variable de entorno, suscripción,
 * bandera— con las entradas construidas a mano.
 * Ciega a: qué devuelve la suscripción real de esta sesión; los casos que la
 * tocan afirman sobre el RANGO, no sobre el valor.
 */
import { afterEach, describe, expect, test } from 'bun:test'

const AGENTES = 'CLAUDE_CODE_PLAN_V2_AGENT_COUNT'
const EXPLORA = 'CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT'
const ENTREVISTA = 'CLAUDE_CODE_PLAN_MODE_INTERVIEW_PHASE'

afterEach(async () => {
  delete process.env[AGENTES]
  delete process.env[EXPLORA]
  delete process.env[ENTREVISTA]
  const { clearGrowthBookConfigOverrides } = await import(
    '@thyrox/config/feature-flags'
  )
  clearGrowthBookConfigOverrides()
})

describe('getPlanModeV2AgentCount — la variable manda sobre el plan', () => {
  test('1. la variable gana sobre lo que diga la suscripción', async () => {
    const { getPlanModeV2AgentCount } = await import('../src/planModeV2.ts')
    process.env[AGENTES] = '7'
    expect(getPlanModeV2AgentCount()).toBe(7)
  })

  test('2. un valor FUERA de rango se ignora, no se recorta', async () => {
    const { getPlanModeV2AgentCount } = await import('../src/planModeV2.ts')
    // 0, negativo y por encima de 10 caen al camino normal. Recortar a los
    // extremos escondería un error de configuración detrás de un valor
    // plausible.
    for (const malo of ['0', '-3', '11', '999']) {
      process.env[AGENTES] = malo
      expect(getPlanModeV2AgentCount()).toBeLessThanOrEqual(3)
    }
  })

  test('3. un valor NO numérico se ignora', async () => {
    const { getPlanModeV2AgentCount } = await import('../src/planModeV2.ts')
    process.env[AGENTES] = 'muchos'
    expect(getPlanModeV2AgentCount()).toBeLessThanOrEqual(3)
  })

  test('4. sin variable, el conteo está en el rango declarado', async () => {
    const { getPlanModeV2AgentCount } = await import('../src/planModeV2.ts')
    const n = getPlanModeV2AgentCount()
    // No se afirma el valor: depende de la suscripción de esta sesión, que
    // es justo lo que este control NO puede ver.
    expect([1, 3]).toContain(n)
  })
})

describe('getPlanModeV2ExploreAgentCount — su default es OTRO', () => {
  test('5. sin variable son tres, no uno', async () => {
    const { getPlanModeV2ExploreAgentCount } = await import(
      '../src/planModeV2.ts'
    )
    // Explorar no depende de la suscripción: su default es fijo.
    expect(getPlanModeV2ExploreAgentCount()).toBe(3)
  })

  test('6. la variable lo gobierna dentro de rango', async () => {
    const { getPlanModeV2ExploreAgentCount } = await import(
      '../src/planModeV2.ts'
    )
    process.env[EXPLORA] = '5'
    expect(getPlanModeV2ExploreAgentCount()).toBe(5)
    process.env[EXPLORA] = '0'
    expect(getPlanModeV2ExploreAgentCount()).toBe(3)
  })
})

describe('isPlanModeInterviewPhaseEnabled — tres niveles de precedencia', () => {
  test('7. la variable VERDADERA lo enciende, sobre la bandera', async () => {
    const { isPlanModeInterviewPhaseEnabled } = await import(
      '../src/planModeV2.ts'
    )
    const { setGrowthBookConfigOverride } = await import(
      '@thyrox/config/feature-flags'
    )
    setGrowthBookConfigOverride('tengu_plan_mode_interview_phase', false)
    process.env[ENTREVISTA] = '1'
    expect(isPlanModeInterviewPhaseEnabled()).toBe(true)
  })

  test('8. la variable FALSA lo apaga, aunque la bandera diga que sí', async () => {
    const { isPlanModeInterviewPhaseEnabled } = await import(
      '../src/planModeV2.ts'
    )
    const { setGrowthBookConfigOverride } = await import(
      '@thyrox/config/feature-flags'
    )
    setGrowthBookConfigOverride('tengu_plan_mode_interview_phase', true)
    process.env[ENTREVISTA] = '0'
    // Un falso DECLARADO no es lo mismo que la variable ausente: manda sobre
    // la bandera. Sin esa distinción no habría forma de apagarlo.
    expect(isPlanModeInterviewPhaseEnabled()).toBe(false)
  })

  test('9. sin variable, decide la bandera', async () => {
    const { isPlanModeInterviewPhaseEnabled } = await import(
      '../src/planModeV2.ts'
    )
    const { setGrowthBookConfigOverride } = await import(
      '@thyrox/config/feature-flags'
    )
    setGrowthBookConfigOverride('tengu_plan_mode_interview_phase', true)
    expect(isPlanModeInterviewPhaseEnabled()).toBe(true)
    setGrowthBookConfigOverride('tengu_plan_mode_interview_phase', false)
    expect(isPlanModeInterviewPhaseEnabled()).toBe(false)
  })
})

describe('getPewterLedgerVariant — las tres ramas y el control', () => {
  test('10. las tres ramas declaradas pasan verbatim', async () => {
    const { getPewterLedgerVariant } = await import('../src/planModeV2.ts')
    const { setGrowthBookConfigOverride } = await import(
      '@thyrox/config/feature-flags'
    )
    for (const rama of ['trim', 'cut', 'cap'] as const) {
      setGrowthBookConfigOverride('tengu_pewter_ledger', rama)
      expect(getPewterLedgerVariant()).toBe(rama)
    }
  })

  test('11. una rama DESCONOCIDA cae al control, no se propaga', async () => {
    const { getPewterLedgerVariant } = await import('../src/planModeV2.ts')
    const { setGrowthBookConfigOverride } = await import(
      '@thyrox/config/feature-flags'
    )
    // La lista es cerrada: un valor nuevo servido por la bandera no se cuela
    // como si fuera una rama válida.
    setGrowthBookConfigOverride('tengu_pewter_ledger', 'inventada')
    expect(getPewterLedgerVariant()).toBeNull()
  })

  test('12. sin bandera es el control', async () => {
    const { getPewterLedgerVariant } = await import('../src/planModeV2.ts')
    expect(getPewterLedgerVariant()).toBeNull()
  })
})
