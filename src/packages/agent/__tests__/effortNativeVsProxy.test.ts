/**
 * Porte de `ccnmt: packages/agent/__tests__/effortNativeVsProxy.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia
 * es el idioma de la descripción.
 *
 * Endpoint nativo de Anthropic frente a un proxy que habla el protocolo
 * anthropic: la asimetría que vive en el fondo de
 * `modelSupportsMaxEffort` / `modelSupportsXhighEffort`.
 *
 * Contexto — la receta oficial de Claude Code de DeepSeek fija
 *   ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
 *   ANTHROPIC_MODEL=deepseek-v4-pro[1m]
 *   CLAUDE_CODE_EFFORT_LEVEL=max
 * lo que aterriza como una configuración puramente de entorno, `firstParty`,
 * sin registro de conexión. La matriz de capacidades de Anthropic
 * (max ⇒ Opus 4.7/4.6/Sonnet 4.6) está equivocada para este endpoint — es
 * el enum de DeepSeek, no el de Anthropic. El arreglo al fondo de esas dos
 * funciones cae por defecto a TRUE para proxies de protocolo anthropic
 * (`firstParty` Y no `api.anthropic.com` nativo), reflejando la misma forma
 * que `modelSupportsEffort` ya tenía.
 *
 * Guarda de regresión contra reintroducir el recorte silencioso
 * `max → high`.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente arranca mockeando
 * `@claude-code-how-works/config` (para fijar `config.connections = []`) y
 * `@claude-code-how-works/config/settings` (para que `getInitialSettings()`
 * devuelva `{}`) — dos paquetes hermanos inexistentes en este árbol. El
 * porte de `../effort.ts` (ver su cabecera) NO tiene noción de registro de
 * conexiones ni de settings: sus versiones locales de
 * `modelSupportsMaxEffort`/`modelSupportsXhighEffort`/`resolveAppliedEffort`
 * nunca consultan nada parecido, así que ese mocking no tiene nada que
 * sustituir aquí — se omite. El propio dato de la fuente confirma que la
 * omisión no cambia el universo medido: `config.connections` se fija en
 * `[]` en el `beforeEach` y NINGÚN caso de este archivo lo muta — ni la
 * rama de "registro de conexión" del `getConnectionModelEntry` de la
 * fuente se ejercita jamás. El `TRACKED_KEYS`/`savedEnv`
 * (guardar/limpiar/restaurar variables de entorno reales entre casos) se
 * conserva completo — eso sí protege contra fuga de estado entre tests.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  modelSupportsMaxEffort,
  modelSupportsXhighEffort,
  resolveAppliedEffort,
} from '../effort.ts'

const TRACKED_KEYS = [
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'CLAUDE_CODE_USE_OPENAI',
  'CLAUDE_CODE_USE_GEMINI',
  'CLAUDE_CODE_EFFORT_LEVEL',
  'CLAUDE_CODE_ALWAYS_ENABLE_EFFORT',
  'USER_TYPE',
] as const
const savedEnv = new Map<string, string | undefined>()

beforeEach(() => {
  for (const k of TRACKED_KEYS) {
    savedEnv.set(k, process.env[k])
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of TRACKED_KEYS) {
    const v = savedEnv.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  savedEnv.clear()
})

describe('modelSupportsMaxEffort — nativo frente a proxy de protocolo anthropic', () => {
  test('api.anthropic.com nativo + Opus 4.7 → true (matriz de capacidades)', () => {
    expect(modelSupportsMaxEffort('claude-opus-4-7-20250101')).toBe(true)
  })

  test('api.anthropic.com nativo + modelo desconocido → false (la matriz de Anthropic es autoritativa)', () => {
    expect(modelSupportsMaxEffort('claude-haiku-4-5')).toBe(false)
  })

  test('proxy de protocolo anthropic de DeepSeek (sólo entorno) + su modelo de wire → true', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic'
    expect(modelSupportsMaxEffort('deepseek-v4-pro[1m]')).toBe(true)
  })

  test('proxy de protocolo anthropic estilo LiteLLM (sólo entorno) + modelo arbitrario → true', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://my-litellm.example.com/anthropic'
    expect(modelSupportsMaxEffort('whatever-model')).toBe(true)
  })

  test('despliegue en Bedrock + modelo desconocido → false (no cae al fallthrough de proxy anthropic)', () => {
    process.env.CLAUDE_CODE_USE_BEDROCK = '1'
    expect(modelSupportsMaxEffort('claude-haiku-4-5')).toBe(false)
  })
})

describe('modelSupportsXhighEffort — más angosto que max', () => {
  test('api.anthropic.com nativo + Opus 4.7 → true', () => {
    expect(modelSupportsXhighEffort('claude-opus-4-7-20250101')).toBe(true)
  })

  test('api.anthropic.com nativo + Sonnet 4.6 → false (xhigh es sólo-Opus-4.7 en Anthropic)', () => {
    expect(modelSupportsXhighEffort('claude-sonnet-4-6')).toBe(false)
  })

  test('proxy de protocolo anthropic de DeepSeek → false (SIN soporte documentado de xhigh)', () => {
    // Asimetría con `modelSupportsMaxEffort`: 'max' es user-facing en
    // DeepSeek según su propia documentación; 'xhigh' es un nivel interno
    // de Anthropic sin soporte de proxy conocido. No confiar por defecto
    // salvo que un registro de conexión lo declare explícitamente vía
    // supportedEfforts.
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic'
    expect(modelSupportsXhighEffort('deepseek-v4-pro[1m]')).toBe(false)
  })
})

describe('resolveAppliedEffort — passthrough end-to-end de max en DeepSeek', () => {
  test('CLAUDE_CODE_EFFORT_LEVEL=max + base URL de DeepSeek → max (sin recorte silencioso a high)', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic'
    process.env.CLAUDE_CODE_EFFORT_LEVEL = 'max'
    expect(resolveAppliedEffort('deepseek-v4-pro[1m]', undefined)).toBe('max')
  })

  test('CLAUDE_CODE_EFFORT_LEVEL=max + Anthropic nativo + Haiku → high (recortado, es lo esperado)', () => {
    // Se queda recortado en nativo porque la matriz de Anthropic es
    // autoritativa y Haiku no acepta 'max'. Esta es la protección de
    // migración cross-modelo para la que existe el recorte en primer
    // lugar.
    process.env.CLAUDE_CODE_EFFORT_LEVEL = 'max'
    expect(resolveAppliedEffort('claude-haiku-4-5', undefined)).toBe('high')
  })
})
