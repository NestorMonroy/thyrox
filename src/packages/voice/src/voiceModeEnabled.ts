/**
 * Puerto de `ccnmt: packages/voice/src/voiceModeEnabled.ts` (54 líneas
 * fuente), 100 % portado y SIN divergencia.
 *
 * LA DIVERGENCIA QUE AQUI SE DECLARABA MEDIA OTRA COSA — retirada el
 * 2026-09-19T07:59:29. Decia que `bun:bundle` es «macro de build
 * time, no un módulo importable», citando como medida
 * `import('bun:bundle')` → "Cannot find package 'bundle'", y ponía en
 * su lugar un sustituto local que leía `CCB_FEATURE_VOICE_MODE`.
 *
 * Esa medida es de la forma DINAMICA y la conclusión era sobre la
 * ESTATICA, que es la que la fuente usa y la que usan otros 172
 * archivos de `src/packages` —incluido `./hooks/useVoiceIntegration.tsx`,
 * en ESTE mismo paquete—. Medido por conducta hoy:
 *
 *   - `import('bun:bundle')` (dinámico) → "Cannot find package 'bundle'";
 *   - `import { feature } from 'bun:bundle'` (estático) → RESUELVE. El
 *     error que devuelve no es de resolución sino de uso: «feature()
 *     from "bun:bundle" can only be used directly in an if statement or
 *     ternary condition».
 *   - y el ternario —que es exactamente la forma de la fuente, ver el
 *     comentario de `isVoiceGrowthBookEnabled` abajo— compila y corre.
 *
 * Medir el literal de una forma y concluir sobre la otra es el
 * sub-patrón C. El sustituto local además dejaba al paquete con DOS
 * nociones contradictorias de `feature()`: ésta y la real de
 * `useVoiceIntegration.tsx`.
 */

import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import {
  getClaudeAIOAuthTokens,
  isAnthropicAuthEnabled,
} from '@thyrox/provider/authAlias.js'

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
