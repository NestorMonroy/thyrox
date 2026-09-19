// Sonda de conducta: los cuatro símbolos declarados NO PORTADOS lanzan al
// invocarse. Es el ROJO que el porte tiene que volver verde — medido por
// conducta, no leído del docstring.
import { useVoice } from '../../../../src/packages/voice/src/hooks/useVoice.ts'
import {
  useVoiceIntegration,
  useVoiceKeybindingHandler,
  VoiceKeybindingHandler,
} from '../../../../src/packages/voice/src/hooks/useVoiceIntegration.tsx'

const casos: Array<[string, () => unknown]> = [
  ['useVoice', () => useVoice({} as never)],
  ['useVoiceIntegration', () => useVoiceIntegration({} as never)],
  ['useVoiceKeybindingHandler', () => useVoiceKeybindingHandler({} as never)],
  ['VoiceKeybindingHandler', () => VoiceKeybindingHandler({} as never)],
]
for (const [nombre, fn] of casos) {
  try {
    fn()
    console.log(`${nombre}: NO LANZO`)
  } catch (e) {
    console.log(`${nombre}: LANZO -> ${String((e as Error).message).slice(0, 70)}`)
  }
}
