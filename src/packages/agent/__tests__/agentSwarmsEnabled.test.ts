/**
 * Porte de `ccnmt: packages/agent/__tests__/agentSwarmsEnabled.test.ts`.
 *
 * Tests de isAgentSwarmsEnabled — la única puerta para las features de
 * swarm/teammate.
 *
 * La Fase W1 simplificó la puerta a sólo el killswitch de GrowthBook
 * `tengu_amber_flint` (default true). El corte anterior por
 * USER_TYPE='ant' + la variable de entorno
 * CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS + el flag de CLI --agent-teams ya
 * no existen — swarm es una feature de primera clase de ccb, no un
 * opt-in experimental.
 *
 * Si un regresivo futuro trae de vuelta cualquiera de esas puertas, este
 * archivo de test es el canario: fija el contrato de que ningún entorno,
 * ningún flag, ningún check de USER_TYPE influye en el resultado.
 *
 * DIVERGENCIA DE ALCANCE: el `mock.module` de la fuente apunta a
 * `@claude-code-how-works/config/feature-flags`, ausente en este árbol.
 * Se sustituye por `../featureFlags.ts` — ver la cabecera de ese archivo
 * y la de `../agentSwarmsEnabled.ts`. El resto del test —casos, datos,
 * aserciones— es idéntico a la fuente.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

const realFeatureFlags = await import('../featureFlags.ts')

let growthBookValue = true

mock.module('../featureFlags.ts', () => ({
  ...realFeatureFlags,
  getFeatureValue_CACHED_MAY_BE_STALE: <T>(key: string, fallback: T) => {
    if (key === 'tengu_amber_flint') return growthBookValue as T
    return fallback
  },
}))

const { isAgentSwarmsEnabled } = await import('../agentSwarmsEnabled.ts')

const realArgv = process.argv
const realUserType = process.env.USER_TYPE
const realExperimentalEnv =
  process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS

beforeEach(() => {
  growthBookValue = true
  process.argv = ['bun', 'cli.ts']
  delete process.env.USER_TYPE
  delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
})

afterEach(() => {
  process.argv = realArgv
  if (realUserType !== undefined) {
    process.env.USER_TYPE = realUserType
  } else {
    delete process.env.USER_TYPE
  }
  if (realExperimentalEnv !== undefined) {
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = realExperimentalEnv
  } else {
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
  }
})

describe('isAgentSwarmsEnabled — default-on para el operador ccb', () => {
  test('devuelve true sin variables de entorno, sin flags, sin USER_TYPE', () => {
    expect(isAgentSwarmsEnabled()).toBe(true)
  })

  test('devuelve true incluso cuando USER_TYPE no está asignado (sin corte por ant necesario)', () => {
    delete process.env.USER_TYPE
    expect(isAgentSwarmsEnabled()).toBe(true)
  })

  test('USER_TYPE=ant NO cambia el comportamiento — sigue usando la puerta de GrowthBook', () => {
    process.env.USER_TYPE = 'ant'
    expect(isAgentSwarmsEnabled()).toBe(true)
    growthBookValue = false
    expect(isAgentSwarmsEnabled()).toBe(false)
  })

  test('USER_TYPE=external NO cambia el comportamiento — sigue usando la puerta de GrowthBook', () => {
    process.env.USER_TYPE = 'external'
    expect(isAgentSwarmsEnabled()).toBe(true)
  })
})

describe('isAgentSwarmsEnabled — los mecanismos históricos de opt-in están muertos', () => {
  test('la variable de entorno CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS no tiene efecto', () => {
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '0'
    expect(isAgentSwarmsEnabled()).toBe(true)
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = 'false'
    expect(isAgentSwarmsEnabled()).toBe(true)
  })

  test('el flag de CLI --agent-teams no tiene efecto (era opt-in externo, ahora redundante)', () => {
    process.argv = ['bun', 'cli.ts'] // sin flag
    expect(isAgentSwarmsEnabled()).toBe(true)
    process.argv = ['bun', 'cli.ts', '--agent-teams'] // flag asignado
    expect(isAgentSwarmsEnabled()).toBe(true)
  })
})

describe('isAgentSwarmsEnabled — killswitch de GrowthBook', () => {
  test('devuelve false cuando tengu_amber_flint está apagado', () => {
    growthBookValue = false
    expect(isAgentSwarmsEnabled()).toBe(false)
  })

  test('GrowthBook tiene precedencia sobre USER_TYPE=ant (sin trato preferencial)', () => {
    process.env.USER_TYPE = 'ant'
    growthBookValue = false
    expect(isAgentSwarmsEnabled()).toBe(false)
  })

  test('el killswitch cae a true por defecto — un valor de GrowthBook ausente significa swarm habilitado', () => {
    // El mock devuelve el fallback (que pasa quien llama) cuando la clave
    // es desconocida. La implementación pasa `true` como fallback, así
    // que una caché de GrowthBook stale/ausente produce "habilitado".
    // Este test verifica el default ejercitando el camino del fallback.
    growthBookValue = true
    expect(isAgentSwarmsEnabled()).toBe(true)
  })
})
