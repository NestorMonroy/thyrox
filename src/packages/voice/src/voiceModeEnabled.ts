/**
 * Puerto de `ccnmt: packages/voice/src/voiceModeEnabled.ts` (54 líneas
 * fuente, 100% portado). Divergencia declarada: `feature('VOICE_MODE')`
 * de `bun:bundle` — macro de build time de ccnmt, no un módulo
 * importable (medido: `import('bun:bundle')` en Bun 1.3.11 da
 * "Cannot find package 'bundle'"; mismo caso que
 * `updater/nativeInstaller/download.ts`). Sustituto local: lectura de
 * la variable de entorno `CCB_FEATURE_VOICE_MODE`.
 */

import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import {
  getClaudeAIOAuthTokens,
  isAnthropicAuthEnabled,
} from '@thyrox/provider/authAlias.js'

/** Ver docstring del módulo — sustituto local de `feature()` de `bun:bundle`. */
function feature(flag: 'VOICE_MODE'): boolean {
  return process.env[`CCB_FEATURE_${flag}`] !== '0'
}

/**
 * Chequeo kill-switch para el modo de voz. Devuelve true a menos que el
 * flag de GrowthBook `tengu_amber_quartz_disabled` este activado
 * (apagado de emergencia). El `false` por defecto significa que una
 * cache de disco faltante/obsoleta se lee como "no matado" — asi que
 * las instalaciones frescas obtienen voz funcionando de inmediato sin
 * esperar el init de GrowthBook. Usar esto para decidir si el modo de
 * voz deberia ser *visible* (p.ej. registro de comando, UI de config).
 */
export function isVoiceGrowthBookEnabled(): boolean {
  // Patron de ternario positivo — ver docs/feature-gating.md. El patron
  // negativo (if (!feature(...)) return) no elimina los literales de
  // string inline de los builds externos.
  return feature('VOICE_MODE')
    ? !getFeatureValue_CACHED_MAY_BE_STALE('tengu_amber_quartz_disabled', false)
    : false
}

/**
 * Chequeo solo-auth para el modo de voz. Devuelve true cuando el
 * usuario tiene un token OAuth de Anthropic valido. Respaldado por el
 * memoizado getClaudeAIOAuthTokens — la primera llamada spawnea
 * `security` en macOS (~20-50ms), llamadas subsecuentes son cache hits.
 * El memoize se limpia al refrescar el token (~una vez/hora), asi que
 * un spawn en frio por refresh es lo esperado. Suficientemente barato
 * para chequeos en tiempo de uso.
 */
export function hasVoiceAuth(): boolean {
  // El modo de voz requiere OAuth de Anthropic — usa el endpoint
  // voice_stream en claude.ai que no esta disponible con API keys,
  // Bedrock, Vertex, o Foundry.
  if (!isAnthropicAuthEnabled()) {
    return false
  }
  // isAnthropicAuthEnabled solo chequea el *proveedor* de auth, no si
  // existe un token. Sin este chequeo, la UI de voz se renderiza pero
  // connectVoiceStream falla en silencio cuando el usuario no ha
  // iniciado sesion.
  const tokens = getClaudeAIOAuthTokens()
  return Boolean(tokens?.accessToken)
}

/**
 * Chequeo completo de runtime: auth + kill-switch de GrowthBook.
 * Llamadores: `/voice` (voice.ts, voice/index.ts), ConfigTool,
 * VoiceModeNotice — rutas en tiempo de comando donde una lectura
 * fresca del keychain es aceptable. Para rutas de render de React usar
 * useVoiceEnabled() en su lugar (memoiza la mitad de auth).
 */
export function isVoiceModeEnabled(): boolean {
  return hasVoiceAuth() && isVoiceGrowthBookEnabled()
}
