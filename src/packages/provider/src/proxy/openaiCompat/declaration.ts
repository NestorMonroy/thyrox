/**
 * La declaración por entorno del upstream compatible con OpenAI que el proxy
 * local (`bin/localProxy.ts`) conecta: una base URL y el modelo que sirve,
 * más una clave opcional. Sin ninguna de las dos obligatorias no hay
 * upstream y el proxy queda como estaba; con una sola se rehúsa, porque un
 * upstream sin modelo no enruta nada y un modelo sin base no tiene a dónde ir.
 */
export const BASE_URL_ENV = 'THYROX_OPENAI_COMPAT_BASE_URL'
export const MODEL_ENV = 'THYROX_OPENAI_COMPAT_MODEL'
export const API_KEY_ENV = 'THYROX_OPENAI_COMPAT_API_KEY'

export type OpenAICompatDeclaration = { baseUrl: string; model: string; apiKey: string | undefined }

function declared(env: Record<string, string | undefined>, name: string): string | undefined {
  const value = env[name]
  return value === undefined || value === '' ? undefined : value
}

export function openAICompatDeclarationOf(env: Record<string, string | undefined>): OpenAICompatDeclaration | undefined {
  const baseUrl = declared(env, BASE_URL_ENV)
  const model = declared(env, MODEL_ENV)
  if (baseUrl === undefined && model === undefined) return undefined
  if (baseUrl === undefined) throw new Error(`${MODEL_ENV} está declarada sin ${BASE_URL_ENV}`)
  if (model === undefined) throw new Error(`${BASE_URL_ENV} está declarada sin ${MODEL_ENV}`)
  return { baseUrl, model, apiKey: declared(env, API_KEY_ENV) }
}
