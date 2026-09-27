// Sonda: conducta en reposo del modulo nativo de audio en esta maquina.
import * as audio from '../../../src/packages/audio-capture-napi/src/index.ts'
const out: Record<string, unknown> = { platform: `${process.arch}-${process.platform}` }
out.available = audio.isNativeAudioAvailable()
out.recording = audio.isNativeRecordingActive()
out.playing = audio.isNativePlaying()
out.mic = audio.microphoneAuthorizationStatus()
for (const f of ['stopNativeRecording', 'stopNativePlayback'] as const) {
  try { audio[f](); out[f] = 'ok' } catch (e) { out[f] = `throws: ${e}` }
}
try { audio.writeNativePlaybackData(Buffer.alloc(4)); out.writeIdle = 'ok' } catch (e) { out.writeIdle = `throws: ${e}` }
console.log(JSON.stringify(out, null, 1))
