// Sonda de conducta, criterio DISCRIMINANTE.
//
// «¿lanzó?» no discrimina: un hook de React real, llamado fuera de un
// render, TAMBIEN lanza. El criterio es el CONTENIDO del mensaje — si
// dice «no está portado», el stub sigue ahí; si dice cualquier otra
// cosa, el cuerpo portado se ejecutó hasta toparse con React.
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
let stubs = 0
for (const [nombre, fn] of casos) {
  let mensaje = '(no lanzo)'
  try {
    fn()
  } catch (e) {
    mensaje = String((e as Error).message)
  }
  const esStub = /no está portado/.test(mensaje)
  if (esStub) stubs += 1
  console.log(`${nombre}: ${esStub ? 'STUB' : 'PORTADO'} -> ${mensaje.slice(0, 60)}`)
}
console.log(`stubs restantes: ${stubs} de ${casos.length}`)
