/**
 * Traduccion del nombre de modelo Anthropic al de OpenAI — porte de
 * `ccnmt: packages/provider/src/openai/modelMapping.ts` (66 lineas, 1 export).
 *
 * El puerto es COMPLETO: la fuente declara `DEFAULT_MODEL_MAP` (privado),
 * `getModelFamily` (privado) y `resolveOpenAIModel` (el unico export), y los
 * tres estan aqui con la misma forma. Ningun simbolo queda fuera.
 *
 * El mapa por defecto solo gobierna cuando NO hay variable de entorno que lo
 * anule; su papel es que un modelo Anthropic conocido tenga destino sin pedirle
 * configuracion a nadie.
 */
import { readEnv } from '@thyrox/config/env/utils'

const DEFAULT_MODEL_MAP: Record<string, string> = {
  'claude-sonnet-4-20250514': 'gpt-4o',
  'claude-sonnet-4-5-20250929': 'gpt-4o',
  'claude-sonnet-4-6': 'gpt-4o',
  'claude-opus-4-20250514': 'o3',
  'claude-opus-4-1-20250805': 'o3',
  'claude-opus-4-5-20251101': 'o3',
  'claude-opus-4-6': 'o3',
  'claude-opus-4-7': 'o3',
  'claude-opus-4-8': 'o3',
  'claude-haiku-4-5-20251001': 'gpt-4o-mini',
  'claude-3-5-haiku-20241022': 'gpt-4o-mini',
  'claude-3-7-sonnet-20250219': 'gpt-4o',
  'claude-3-5-sonnet-20241022': 'gpt-4o',
}

/**
 * Familia del modelo (haiku / sonnet / opus) leida de su identificador.
 *
 * El ORDEN de las tres pruebas es contrato, no estilo: un identificador que
 * nombrara dos familias se resuelve por la primera que acierte. La fuente
 * prueba haiku, luego opus, luego sonnet, y el puerto conserva ese orden.
 * La bandera `i` hace la deteccion insensible a la caja.
 */
function getModelFamily(model: string): 'haiku' | 'sonnet' | 'opus' | null {
  if (/haiku/i.test(model)) return 'haiku'
  if (/opus/i.test(model)) return 'opus'
  if (/sonnet/i.test(model)) return 'sonnet'
  return null
}

/**
 * Resuelve el modelo OpenAI que corresponde a un modelo Anthropic.
 *
 * Prioridad, de mayor a menor:
 *
 * 1. `OPENAI_MODEL` — anula todo, incluida la deteccion de familia.
 * 2. `OPENAI_DEFAULT_{FAMILIA}_MODEL` — p. ej. `OPENAI_DEFAULT_SONNET_MODEL`.
 * 3. `ANTHROPIC_DEFAULT_{FAMILIA}_MODEL` — compatibilidad hacia atras.
 * 4. `DEFAULT_MODEL_MAP`.
 * 5. El propio nombre, ya recortado.
 *
 * El sufijo `[1m]` —modificador de ventana propio de Claude— se recorta ANTES
 * de detectar la familia y ANTES de consultar el mapa, con un ancla al final:
 * solo cuenta como sufijo si esta al final.
 */
export function resolveOpenAIModel(anthropicModel: string): string {
  // Prioridad maxima: el override explicito.
  if (readEnv('OPENAI_MODEL')) {
    return readEnv('OPENAI_MODEL')
  }

  const cleanModel = anthropicModel.replace(/\[1m\]$/, '')

  const family = getModelFamily(cleanModel)
  if (family) {
    // Override por familia especifico de OpenAI (el preferido en este proveedor).
    const openaiEnvVar = `OPENAI_DEFAULT_${family.toUpperCase()}_MODEL`
    const openaiOverride = readEnv(openaiEnvVar)
    if (openaiOverride) return openaiOverride

    // La variable de Anthropic queda como compatibilidad hacia atras.
    const anthropicEnvVar = `ANTHROPIC_DEFAULT_${family.toUpperCase()}_MODEL`
    const anthropicOverride = readEnv(anthropicEnvVar)
    if (anthropicOverride) return anthropicOverride
  }

  return DEFAULT_MODEL_MAP[cleanModel] ?? cleanModel
}
