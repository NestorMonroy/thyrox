/**
 * Los parámetros del modo de planificación: cuántos agentes lo atienden, si
 * lleva fase de entrevista, y qué variante de guía de plan se sirve.
 *
 * Procedencia: `ccnmt: packages/permission/src/planModeV2.ts` (101 líneas,
 * 4 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se **reimplementa** —mismo nombre de módulo, mismo sitio,
 * mismos nombres y firmas— y no se copia.
 *
 * DIVERGENCIA DECLARADA (dos):
 *
 * 1. La rama `process.env.USER_TYPE === 'ant'` de
 *    `isPlanModeInterviewPhaseEnabled`, que en la fuente enciende la fase
 *    siempre para su organización. Es una bandera de compilación de ese árbol
 *    y aquí nadie la declara: portarla dejaría una condición que nunca
 *    dispara. La precedencia que queda —variable, luego bandera— es la que sí
 *    gobierna.
 *
 * 2. La consulta de la suscripción se envuelve. En la fuente
 *    `getPlanModeV2AgentCount` llama a `getSubscriptionType()` sin proteger, y
 *    esa función LANZA cuando no hay credenciales declaradas —medido:
 *    `ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN env var is required`—. El
 *    efecto es que un parámetro de planificación derriba la sesión entera por
 *    una credencial ausente, cuando lo que corresponde es su default: un
 *    agente. No es cosmético — es la diferencia entre degradar y caerse.
 *
 * El comentario de experimento de `getPewterLedgerVariant` NO viaja: sus
 * cifras de línea base son medidas de OTRA población, y aquí se leerían como
 * propias.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import {
  getRateLimitTier,
  getSubscriptionType,
} from '@thyrox/provider/authAlias.js'
import {
  isEnvDefinedFalsy,
  isEnvTruthy,
  readEnv,
} from '@thyrox/config/env/utils'

/** El tope de agentes que una variable puede declarar. */
const MAX_DECLARED_AGENTS = 10

/**
 * Lee un conteo de agentes declarado en el entorno.
 *
 * Un valor fuera de rango se IGNORA, no se recorta al extremo: recortarlo
 * escondería un error de configuración detrás de un valor plausible, y quien
 * lo declaró creería que su cifra se respetó.
 */
function declaredAgentCount(name: string): number | null {
  const override = readEnv(name)
  if (!override) return null
  const count = parseInt(override, 10)
  if (!isNaN(count) && count > 0 && count <= MAX_DECLARED_AGENTS) {
    return count
  }
  return null
}

/**
 * Cuántos agentes atienden el modo de planificación.
 *
 * La variable manda; si no, decide el plan contratado. Tres para el plan más
 * alto y para los de organización, uno para el resto.
 */
export function getPlanModeV2AgentCount(): number {
  const declared = declaredAgentCount('CLAUDE_CODE_PLAN_V2_AGENT_COUNT')
  if (declared !== null) return declared

  // Sin credenciales declaradas la consulta LANZA. Un parámetro de
  // planificación no debe derribar la sesión por eso: se cae al default, que
  // es el conteo mínimo.
  let subscriptionType: string | null = null
  let rateLimitTier: string | null = null
  try {
    subscriptionType = getSubscriptionType()
    rateLimitTier = getRateLimitTier()
  } catch {
    return 1
  }

  if (subscriptionType === 'max' && rateLimitTier === 'default_claude_max_20x') {
    return 3
  }

  if (subscriptionType === 'enterprise' || subscriptionType === 'team') {
    return 3
  }

  return 1
}

/**
 * Cuántos agentes exploran.
 *
 * Su default es FIJO y no depende del plan: explorar es trabajo de lectura, y
 * acotarlo por suscripción dejaría un plan mal informado en vez de más barato.
 */
export function getPlanModeV2ExploreAgentCount(): number {
  const declared = declaredAgentCount('CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT')
  if (declared !== null) return declared
  return 3
}

/**
 * ¿Lleva el modo de planificación su fase de entrevista?
 *
 * Tres niveles, en este orden: la variable declarada VERDADERA lo enciende; la
 * variable declarada FALSA lo apaga; sin variable, decide la bandera. El falso
 * declarado no es lo mismo que la variable ausente — sin esa distinción no
 * habría forma de apagarlo contra una bandera encendida.
 */
export function isPlanModeInterviewPhaseEnabled(): boolean {
  const env = readEnv('CLAUDE_CODE_PLAN_MODE_INTERVIEW_PHASE')
  if (isEnvTruthy(env)) return true
  if (isEnvDefinedFalsy(env)) return false

  return getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_plan_mode_interview_phase',
    false,
  )
}

export type PewterLedgerVariant = 'trim' | 'cut' | 'cap' | null

/** Las tres ramas declaradas. Fuera de ellas, el control. */
const PEWTER_LEDGER_VARIANTS: readonly string[] = ['trim', 'cut', 'cap']

/**
 * La variante de guía de plan que sirve la bandera.
 *
 * La lista es CERRADA: un valor que la bandera sirva y no esté declarado cae
 * al control (`null`) en vez de propagarse. Un experimento que introdujera una
 * rama nueva sin código que la atienda produciría, si no, una guía vacía.
 */
export function getPewterLedgerVariant(): PewterLedgerVariant {
  const raw = getFeatureValue_CACHED_MAY_BE_STALE<string | null>(
    'tengu_pewter_ledger',
    null,
  )
  if (raw !== null && PEWTER_LEDGER_VARIANTS.includes(raw)) {
    return raw as PewterLedgerVariant
  }
  return null
}
