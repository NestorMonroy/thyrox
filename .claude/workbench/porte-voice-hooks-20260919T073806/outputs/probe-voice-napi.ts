/**
 * Sonda de conducta del puerto de `voice.ts`.
 *
 * QUE LA HARIA FALLAR, declarado antes de correrla: que el `import()`
 * diferido de `@thyrox/audio-capture-napi` rechace. La fuente NO tiene un
 * solo `catch` y nuestro puerto tampoco, asi que un rechazo propaga y mata
 * la sonda — no se disfraza de `available: false`.
 *
 * EL PRIMER INTENTO NO DISCRIMINABA. Llamaba a `checkRecordingAvailability()`
 * con el entorno tal cual, y en ESTE contenedor `CLAUDE_CODE_REMOTE=true`:
 * la funcion sale por el retorno temprano de :295 y NUNCA llega a
 * `loadAudioNapi()`. El verde decia «resolvio» midiendo una rama que no toca
 * el import — el sub-patron D, con la propia sonda como sujeto.
 *
 * Por eso corre DOS veces, y el contraste es la medicion:
 *   1. con el entorno tal cual    -> rama temprana, el import NO se ejercita
 *   2. con CLAUDE_CODE_REMOTE=''  -> cadena completa, el import SI se ejercita
 *
 * No escribe nada: sus llamadas son de lectura y de sondeo.
 */
const v = await import('../../../../src/packages/voice/src/voice.ts')
console.log('voice.ts carga; exports:', Object.keys(v).sort().join(','))
console.log('CLAUDE_CODE_REMOTE =', JSON.stringify(process.env.CLAUDE_CODE_REMOTE))

console.log('\n[1] entorno tal cual — se espera la rama temprana de :295')
console.log('   ', JSON.stringify(await v.checkRecordingAvailability()))

console.log('\n[2] CLAUDE_CODE_REMOTE vaciada — la cadena llega a loadAudioNapi()')
delete process.env.CLAUDE_CODE_REMOTE
v._resetAlsaCardsForTesting?.()
v._resetArecordProbeForTesting?.()
const dos = await v.checkRecordingAvailability()
console.log('   ', JSON.stringify(dos))
console.log('    -> no lanzo: el import de @thyrox/audio-capture-napi RESOLVIO')
