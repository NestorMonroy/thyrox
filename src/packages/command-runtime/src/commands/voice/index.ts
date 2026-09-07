/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/voice/index.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO de la metadata; `isVoiceGrowthBookEnabled`/
 * `isVoiceModeEnabled` pasan por `internal/pendingCrossPackageDeps.ts`
 * — `@thyrox/voice/voiceModeEnabled.js` ya tiene ambos símbolos portados.
 */
import type { Command } from '../../runtime.js'
import { requireVoiceModeEnabled } from '../../internal/pendingCrossPackageDeps.js'

const voice = {
  type: 'local',
  name: 'voice',
  description: 'Toggle voice mode',
  availability: ['claude-ai'],
  isEnabled: () => requireVoiceModeEnabled().isVoiceGrowthBookEnabled(),
  get isHidden() {
    return !requireVoiceModeEnabled().isVoiceModeEnabled()
  },
  supportsNonInteractive: false,
  load: () => import('./voice.js'),
} satisfies Command

export default voice
