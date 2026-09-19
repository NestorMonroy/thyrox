/**
 * Puerto de `ccnmt: packages/voice/src/hooks/useVoiceEnabled.ts`
 * (25 líneas), 100 % portado.
 *
 * No trae ningún specifier del alcance de la fuente —medido: 0 de 0— así
 * que la reescritura es un no-op aquí; sus tres imports son `react` y dos
 * hermanos relativos de este mismo paquete, los dos ya portados.
 *
 * EL BLOQUEADOR DECLARADO ANTES ESTABA RANCIO — verificado por conducta el
 * 2026-09-19T07:44:53: `react` resuelve a 19.3.0, y
 * `../appStateHooks.js` y `../voiceModeEnabled.js` están portados
 * (medido: 0 ocurrencias de la cadena de bloqueo en ninguno de los dos).
 * Ver H-THYROX-116.
 */
import { useMemo } from 'react'
import { useAppState } from '../appStateHooks.js'
import {
  hasVoiceAuth,
  isVoiceGrowthBookEnabled,
} from '../voiceModeEnabled.js'

/**
 * Combina la intención del usuario (`settings.voiceEnabled`) con el auth y el
 * kill-switch de GrowthBook.
 *
 * Sólo la mitad de auth se memoiza contra `authVersion`, porque es la cara:
 * el memoize en frío de `getClaudeAIOAuthTokens` dispara un spawn síncrono de
 * `security` —~60 ms por llamada, ~180 ms en total en el profile v5 cuando un
 * token refresh vació la caché a mitad de sesión.
 *
 * GrowthBook es una consulta barata a un mapa ya cacheado y se queda FUERA del
 * memo a propósito: así un cambio del kill-switch a mitad de sesión surte
 * efecto en el render siguiente en vez de quedar congelado.
 *
 * `authVersion` sólo avanza con `/login`. Un token refresh en segundo plano no
 * lo toca —el usuario sigue autenticado—, así que el memo de auth sigue siendo
 * correcto sin re-evaluarse.
 */
export function useVoiceEnabled(): boolean {
  const userIntent = useAppState(s => s.settings.voiceEnabled === true)
  const authVersion = useAppState(s => s.authVersion)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const authed = useMemo(hasVoiceAuth, [authVersion])
  return userIntent && authed && isVoiceGrowthBookEnabled()
}
