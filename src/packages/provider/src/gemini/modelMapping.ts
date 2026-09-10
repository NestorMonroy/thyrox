/**
 * Traduccion del nombre de modelo Anthropic al de Gemini — porte de
 * `ccnmt: packages/provider/src/gemini/modelMapping.ts` (46 lineas, 1 export).
 *
 * El puerto es COMPLETO: `getModelFamily` (privado) y `resolveGeminiModel`.
 * Ninguno queda fuera.
 *
 * TRES DIFERENCIAS DE FONDO con su hermano de OpenAI, y no son de estilo:
 *
 * 1. NO hay mapa de modelos por defecto. Con familia detectada y sin variable
 *    de entorno que la resuelva, esto LANZA en vez de caer a un valor. Gemini
 *    no tiene aqui una tabla Anthropic-a-Gemini que consultar.
 * 2. El recorte del sufijo `[1m]` ignora la caja (`/i`), asi que `[1M]`
 *    tambien se recorta.
 * 3. Se retira ANTES el prefijo de enrutado por conexion (`<connId>:<modelo>`):
 *    esa forma es interna, y la URL del API de Gemini no la puede llevar o
 *    responde 404. Es la misma frontera que el adaptador de Anthropic aplica.
 */
import { readEnv } from '@thyrox/config/env/utils'
import { ConfigurationError } from '../errors.js'
import { unpackModelId } from '../connections.js'

/**
 * Familia del modelo leida de su identificador, en el mismo orden que el
 * hermano de OpenAI: haiku, luego opus, luego sonnet.
 */
function getModelFamily(model: string): 'haiku' | 'sonnet' | 'opus' | null {
  if (/haiku/i.test(model)) return 'haiku'
  if (/opus/i.test(model)) return 'opus'
  if (/sonnet/i.test(model)) return 'sonnet'
  return null
}

/**
 * Resuelve el modelo Gemini que corresponde a un modelo Anthropic.
 *
 * Prioridad: `GEMINI_MODEL` anula todo; luego
 * `GEMINI_DEFAULT_{FAMILIA}_MODEL`; luego
 * `ANTHROPIC_DEFAULT_{FAMILIA}_MODEL` por compatibilidad. Un modelo sin
 * familia detectable pasa tal cual, ya recortado. Con familia y sin ninguna
 * variable, lanza.
 */
export function resolveGeminiModel(anthropicModel: string): string {
  if (readEnv('GEMINI_MODEL')) {
    return readEnv('GEMINI_MODEL')
  }

  // El prefijo de enrutado por conexion se retira antes de cualquier mapeo:
  // la forma `<connId>:<modelo>` es interna y la URL del API no la admite.
  const bareModel = unpackModelId(anthropicModel).modelId
  const cleanModel = bareModel.replace(/\[1m\]$/i, '')
  const family = getModelFamily(cleanModel)

  if (!family) {
    return cleanModel
  }

  // Primero las variables propias de Gemini, separadas de las de Anthropic.
  const geminiEnvVar = `GEMINI_DEFAULT_${family.toUpperCase()}_MODEL`
  const geminiModel = readEnv(geminiEnvVar)
  if (geminiModel) {
    return geminiModel
  }

  // Luego las de Anthropic, por compatibilidad hacia atras.
  const sharedEnvVar = `ANTHROPIC_DEFAULT_${family.toUpperCase()}_MODEL`
  const resolvedModel = readEnv(sharedEnvVar)
  if (resolvedModel) {
    return resolvedModel
  }

  throw new ConfigurationError(
    `Gemini provider requires GEMINI_MODEL or ${geminiEnvVar} (or ${sharedEnvVar} for backward compatibility) to be configured.`,
  )
}
