/**
 * Contrato de `audio-capture-napi`: el envoltorio de un módulo nativo que el
 * modo de voz carga bajo demanda.
 *
 * El contrato sale del ejecutable de referencia, no de nuestra fuente. Medido
 * con `bin/binary` sobre 2.1.283 (banco `napi-contracts-20260927T073211`):
 * `chunk-z4sfgzqt.js` publica los nueve nombres de EXPORTS, y
 * `references chunk-z4sfgzqt.js c` encuentra sus cinco consumidores en
 * `chunk-11jfjeh3.js`, que lo importan como namespace.
 *
 * Restricción técnica declarada: la conducta del módulo nativo sólo se puede
 * ejercitar donde el `.node` corresponde a la máquina. Esos casos corren en
 * linux-x64 —medido: carga y responde— y en otra plataforma se saltan con
 * esta razón. El formato de cada `.node` vendorizado se mide en todas.
 *
 * Control de anulación, medido mutando el producto y restaurándolo: sin la
 * rama `x64-linux` del cargador caen 3, 4 y 5; con un export renombrado,
 * 1, 5 y 6; si el estado del micrófono no se delega al módulo, sólo el 5. El
 * caso 2 discrimina por construcción —las cinco cabeceras dan cinco valores
 * distintos— y anularlo exigiría corromper un binario vendorizado.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as audio from '../src/index.ts'

const PACKAGE = join(import.meta.dir, '..')
const VENDOR = join(PACKAGE, 'vendor')

/** `export{…}` de `chunk-z4sfgzqt.js` en 2.1.283, nombre por nombre. */
const EXPORTS = [
  'isNativeAudioAvailable', 'isNativePlaying', 'isNativeRecordingActive',
  'microphoneAuthorizationStatus', 'startNativePlayback', 'startNativeRecording',
  'stopNativePlayback', 'stopNativeRecording', 'writeNativePlaybackData',
]

/** Los métodos que el tipo `AudioCaptureNapi` exige al módulo nativo. */
const NATIVE_METHODS = [
  'isPlaying', 'isRecording', 'microphoneAuthorizationStatus', 'startPlayback',
  'startRecording', 'stopPlayback', 'stopRecording', 'writePlaybackData',
]

/**
 * El formato que cada directorio promete, por su cabecera: ELF lleva la
 * arquitectura en `e_machine` (bytes 18-19), Mach-O en `cputype` (bytes 4-7),
 * y un PE empieza por `MZ`.
 */
function formatOf(bytes: Buffer): string {
  if (bytes.readUInt32BE(0) === 0x7f454c46) {
    const machine = bytes.readUInt16LE(18)
    return machine === 0x3e ? 'x64-linux' : machine === 0xb7 ? 'arm64-linux' : `elf-${machine}`
  }
  if (bytes.readUInt32LE(0) === 0xfeedfacf) {
    const cpu = bytes.readUInt32LE(4)
    return cpu === 0x01000007 ? 'x64-darwin' : cpu === 0x0100000c ? 'arm64-darwin' : `macho-${cpu}`
  }
  if (bytes.toString('latin1', 0, 2) === 'MZ') return 'x64-win32'
  return 'desconocido'
}

const HOST = `${process.arch}-${process.platform}`
const nativeHere = HOST === 'x64-linux'

describe('audio-capture-napi — superficie', () => {
  test('1. exporta exactamente los nueve nombres del envoltorio de referencia', () => {
    expect(Object.keys(audio).sort()).toEqual([...EXPORTS].sort())
  })

  test('2. cada .node vendorizado tiene el formato de la plataforma que su directorio nombra', () => {
    const dirs = readdirSync(VENDOR).sort()
    expect(dirs).toEqual(['arm64-darwin', 'arm64-linux', 'x64-darwin', 'x64-linux', 'x64-win32'])
    for (const dir of dirs) {
      expect([dir, formatOf(readFileSync(join(VENDOR, dir, 'audio-capture.node')))]).toEqual([dir, dir])
    }
  })

  test('3. el cargador tiene una rama por cada .node vendorizado, con require literal', () => {
    const source = readFileSync(join(PACKAGE, 'src', 'index.ts'), 'utf8')
    const branches = [...source.matchAll(/require\('\.\.\/vendor\/([^/]+)\/audio-capture\.node'\)/g)]
      .map(m => m[1]).sort()
    expect(branches).toEqual(readdirSync(VENDOR).sort())
  })
})

describe.skipIf(!nativeHere)(`audio-capture-napi — módulo nativo en ${HOST}`, () => {
  test('4. el módulo carga y expone los ocho métodos que el tipo exige', () => {
    expect(audio.isNativeAudioAvailable()).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require(join(VENDOR, HOST, 'audio-capture.node')) as Record<string, unknown>
    for (const name of NATIVE_METHODS) expect([name, typeof raw[name]]).toEqual([name, 'function'])
  })

  test('5. en reposo no graba ni reproduce, y Linux declara el micrófono autorizado (3)', () => {
    expect(audio.isNativeRecordingActive()).toBe(false)
    expect(audio.isNativePlaying()).toBe(false)
    expect(audio.microphoneAuthorizationStatus()).toBe(3)
  })

  // El vendorizado viene de 2.1.121 y su hash no es el de 2.1.283; lo que el
  // envoltorio exige es que los MÉTODOS coincidan, no los bytes.
  test('7. el .node vendorizado expone los mismos métodos que el que embebe 2.1.283', () => {
    const reference = join(PACKAGE, '..', '..', '..', '_references', 'claude-code-bin', '2.1.283',
                           'bunfs-root', 'audio-capture.node')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const methods = (file: string) => Object.keys(require(file) as object).sort()
    expect(methods(join(VENDOR, HOST, 'audio-capture.node'))).toEqual(methods(reference))
    expect(methods(reference)).toEqual([...NATIVE_METHODS].sort())
  })

  test('6. detener o escribir en reposo no lanza y deja el estado en reposo', () => {
    expect(() => audio.stopNativeRecording()).not.toThrow()
    expect(() => audio.stopNativePlayback()).not.toThrow()
    expect(() => audio.writeNativePlaybackData(Buffer.alloc(4))).not.toThrow()
    expect(audio.isNativeRecordingActive()).toBe(false)
    expect(audio.isNativePlaying()).toBe(false)
  })
})
