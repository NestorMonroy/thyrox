/**
 * Ventana de contexto por modelo — porte PARCIAL de
 * `ccnmt: packages/agent/context.ts`.
 *
 * Recorte declarado: la fuente completa importa
 * `@claude-code-how-works/config` (getGlobalConfig),
 * `@claude-code-how-works/config/env/utils` (readEnv, isEnvTruthy) y
 * cuatro módulos de `@claude-code-how-works/provider/*`
 * (betasConstants, antModels, model, modelCapabilities) — ninguno existe en
 * este árbol. Las ramas que sólo esos módulos alimentan
 * (`getModelCapability`, el beta header `CONTEXT_1M_BETA_HEADER`, el
 * tratamiento experimental de `getSonnet1mExpTreatmentEnabled`, y la rama
 * `process.env.USER_TYPE === 'ant'` de resolución contra `antModels`) se
 * dejan fuera — son mecanismo interno de Anthropic (builds `ant`), y este
 * árbol es el operador L0 self-hosted, no ese build (mismo criterio que
 * `effort.ts` ya declara para su propio recorte).
 *
 * Lo que el porte de test SÍ ejercita — `has1mContext`, `modelSupports1M`,
 * `getContextWindowForModel` en su camino sin `USER_TYPE=ant` ni
 * `getModelCapability` — se porta con fidelidad de comportamiento byte a
 * byte. `readEnv`/`isEnvTruthy` se reimplementan localmente (son wrappers
 * triviales sobre `process.env` en la fuente — sin lógica de red ni de
 * settings que perder). `getCanonicalName` (de
 * `@claude-code-how-works/provider/model.ts`, con su propia lógica de
 * mapeo Bedrock/Vertex/fecha) se reimplementa aquí como una normalización
 * mínima local — no es un porte de esa lógica, es un sustituto que basta
 * para las comparaciones por substring que `modelSupports1M` necesita.
 */

/** Wrapper trivial sobre `process.env` — mismo contrato que el de config/env/utils. */
function readEnv(name: string): string | undefined {
  return process.env[name]
}

/** Normaliza a booleano un valor de variable de entorno. */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

/**
 * Reimplementación local mínima de `getCanonicalName` — no reproduce el
 * mapeo Bedrock/Vertex/fecha de la fuente; sólo baja a minúsculas para que
 * las comparaciones por substring de `modelSupports1M` sean estables.
 */
function getCanonicalName(model: string): string {
  return model.toLowerCase()
}

// Tamaño de la ventana de contexto por defecto (200k tokens para todos los
// modelos por ahora).
export const MODEL_CONTEXT_WINDOW_DEFAULT = 200_000

/**
 * Verifica si el contexto de 1M está deshabilitado vía variable de
 * entorno. La usan los administradores de un despliegue C4E para
 * deshabilitar el contexto de 1M por cumplimiento HIPAA.
 */
export function is1mContextDisabled(): boolean {
  return isEnvTruthy(readEnv('CLAUDE_CODE_DISABLE_1M_CONTEXT'))
}

export function has1mContext(model: string): boolean {
  if (is1mContextDisabled()) {
    return false
  }
  return /\[1m\]/i.test(model)
}

// @[MODEL LAUNCH]: actualizar este patrón cuando un modelo nuevo soporte 1M.
export function modelSupports1M(model: string): boolean {
  if (is1mContextDisabled()) {
    return false
  }
  const canonical = getCanonicalName(model)
  return canonical.includes('claude-sonnet-4') || canonical.includes('opus-4-7') || canonical.includes('opus-4-6')
}

export function getContextWindowForModel(
  model: string,
  betas?: string[],
): number {
  // Permite override vía variable de entorno (sólo ant)
  const maxCtxToken = readEnv('CLAUDE_CODE_MAX_CONTEXT_TOKENS')
  if (process.env.USER_TYPE === 'ant' && maxCtxToken) {
    const override = parseInt(maxCtxToken, 10)
    if (!isNaN(override) && override > 0) {
      return override
    }
  }

  // Sufijo [1m] — opt-in explícito del lado cliente (era Sonnet 4.0 legacy)
  if (has1mContext(model)) {
    return 1_000_000
  }

  // El contexto de 1M es el default GA para Opus 4.7 / Opus 4.6 / Sonnet
  // 4.x — sin beta header ni opt-in necesario. Sin esta rama, se cae al
  // default de 200K y la compactación dispara ~5× demasiado pronto.
  // modelSupports1M ya corta a false con CLAUDE_CODE_DISABLE_1M_CONTEXT=1
  // (ruta HIPAA), y excluye Haiku 4.5 (que es genuinamente 200K).
  if (modelSupports1M(model)) {
    return 1_000_000
  }

  // Recorte declarado: aquí la fuente consulta `getModelCapability`, el
  // beta header `CONTEXT_1M_BETA_HEADER`,
  // `getSonnet1mExpTreatmentEnabled` y `resolveAntModel` bajo
  // `USER_TYPE === 'ant'` — ninguno de esos módulos existe en este árbol
  // (ver docstring de cabecera). Sin ellos, se cae directo al default.
  void betas

  return MODEL_CONTEXT_WINDOW_DEFAULT
}
