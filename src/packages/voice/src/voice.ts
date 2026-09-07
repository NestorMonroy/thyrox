/**
 * Servicio de voz: grabacion de audio para input de voz push-to-talk.
 *
 * La grabacion usa captura de audio nativa (cpal) en macOS, Linux, y
 * Windows para acceso al microfono en-proceso. Cae a SoX `rec` o
 * arecord (ALSA) en Linux si el modulo nativo no esta disponible.
 *
 * Puerto de `ccnmt: packages/voice/src/voice.ts` (525 líneas fuente,
 * 100% portado).
 *
 * Divergencias declaradas:
 *
 *   - `audio-capture-napi` — un módulo N-API NATIVO (compilado, no
 *     TypeScript) de ccnmt, ausente de este árbol como paquete de
 *     workspace. La fuente YA lo carga con `import()` DIFERIDO y ya
 *     diseña su propio fallback (arecord/SoX) para cuando no esté
 *     disponible — no es una divergencia que este agente introduzca:
 *     es el mecanismo de resiliencia de la propia fuente, que aquí
 *     simplemente se activa siempre (el import falla con "Cannot find
 *     package", exactamente como "módulo nativo no cargó").
 *   - `isRunningOnHomespace` (`config/env/utils.ts`, porte parcial
 *     declarado que no la incluye) — se reimplementa localmente,
 *     verbatim contra la fuente.
 */

import { type ChildProcess, spawn, spawnSync } from 'child_process'
import { readFile } from 'fs/promises'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { logError } from '@thyrox/local-observability/logging'
import { getPlatform } from '@thyrox/config/platform'

/** Ver docstring del módulo — sustituto local verbatim. */
function isRunningOnHomespace(): boolean {
  return (
    process.env.USER_TYPE === 'ant' &&
    isEnvTruthy(process.env.COO_RUNNING_ON_HOMESPACE)
  )
}

// Modulo nativo de audio, cargado perezosamente. audio-capture.node
// enlaza contra CoreAudio.framework + AudioUnit.framework; dlopen es
// sincrono y bloquea el event loop por ~1s en caliente, hasta ~8s en
// coreaudiod frio (post-wake, post-boot). La carga ocurre en la primera
// pulsacion de tecla de voz — sin preload, porque no hay forma de hacer
// dlopen no-bloqueante y un freeze de arranque es peor que un retraso
// en la primera pulsacion.
type AudioNapi = {
  isNativeAudioAvailable: () => boolean
  isNativeRecordingActive: () => boolean
  startNativeRecording: (
    onData: (data: Buffer) => void,
    onSilenceEnd: () => void,
  ) => boolean
  stopNativeRecording: () => void
}
let audioNapi: AudioNapi | null = null
let audioNapiPromise: Promise<AudioNapi> | null = null

function loadAudioNapi(): Promise<AudioNapi> {
  audioNapiPromise ??= (async () => {
    const t0 = Date.now()
    try {
      const mod = (await import('audio-capture-napi')) as AudioNapi
      // packages/audio-capture-napi/src/index.ts difiere el require(...node)
      // hasta la primera llamada a funcion — se dispara aqui para que el
      // timing refleje el costo real.
      mod.isNativeAudioAvailable()
      audioNapi = mod
      logForDebugging(`[voice] audio-capture-napi loaded in ${Date.now() - t0}ms`)
      return mod
    } catch {
      // Ver docstring del módulo: `audio-capture-napi` es un paquete
      // N-API nativo ausente de este árbol de workspace. La fuente ya
      // diseña un fallback completo (arecord/SoX) para este caso.
      const stub: AudioNapi = {
        isNativeAudioAvailable: () => false,
        isNativeRecordingActive: () => false,
        startNativeRecording: () => false,
        stopNativeRecording: () => {},
      }
      audioNapi = stub
      return stub
    }
  })()
  return audioNapiPromise
}

// ─── Constantes ──────────────────────────────────────────────────────

const RECORDING_SAMPLE_RATE = 16000
const RECORDING_CHANNELS = 1

// Deteccion de silencio de SoX: se detiene tras esta duracion de silencio
const SILENCE_DURATION_SECS = '2.0'
const SILENCE_THRESHOLD = '3%'

// ─── Chequeo de dependencias ─────────────────────────────────────────

function hasCommand(cmd: string): boolean {
  // Spawnea el target directamente en vez de `which cmd`. En
  // Termux/Android `which` es un builtin del shell — el binario
  // externo esta ausente o bloqueado por el kernel (EPERM) al
  // spawnearse desde Node. Solo se alcanza en no-Windows (win32 sale
  // temprano en todos los llamadores), sin problema de PATHEXT.
  // result.error se setea sii el spawn en si falla (ENOENT/EACCES); el
  // codigo de salida es irrelevante — un --version no reconocido igual
  // significa que el comando existe.
  const result = spawnSync(cmd, ['--version'], {
    stdio: 'ignore',
    timeout: 3000,
  })
  return result.error === undefined
}

// Sondea si arecord realmente puede abrir un dispositivo de captura.
// hasCommand() solo chequea PATH; en WSL1/Win10-WSL2/Linux headless el
// binario existe pero falla en open() porque no hay tarjeta ALSA ni
// servidor PulseAudio. En WSL2+WSLg (Win11), PulseAudio funciona via
// pipes RDP y arecord tiene exito. Se spawnea con los mismos args que
// startArecordRecording() y se compite con un timer corto: si el
// proceso sigue vivo despues de 150ms, abrio el dispositivo; si sale
// temprano, el stderr dice por que. Memoizado — la disponibilidad del
// dispositivo de audio no cambia a mitad de sesion, y esto se llama en
// cada pulsacion de tecla de voz via checkRecordingAvailability().
type ArecordProbeResult = { ok: boolean; stderr: string }
let arecordProbe: Promise<ArecordProbeResult> | null = null

function probeArecord(): Promise<ArecordProbeResult> {
  arecordProbe ??= new Promise(resolve => {
    const child = spawn(
      'arecord',
      [
        '-f',
        'S16_LE',
        '-r',
        String(RECORDING_SAMPLE_RATE),
        '-c',
        String(RECORDING_CHANNELS),
        '-t',
        'raw',
        '/dev/null',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    const timer = setTimeout(
      (c: ChildProcess, r: (v: ArecordProbeResult) => void) => {
        c.kill('SIGTERM')
        r({ ok: true, stderr: '' })
      },
      150,
      child,
      resolve,
    )
    child.once('close', code => {
      clearTimeout(timer)
      // El close de SIGTERM (code=null) tras dispararse el timer ya
      // esta resuelto. Un close temprano con code=0 es inusual (arecord
      // no deberia salir por su cuenta) pero se trata como ok.
      void resolve({ ok: code === 0, stderr: stderr.trim() })
    })
    child.once('error', () => {
      clearTimeout(timer)
      void resolve({ ok: false, stderr: 'arecord: command not found' })
    })
  })
  return arecordProbe
}

export function _resetArecordProbeForTesting(): void {
  arecordProbe = null
}

// El backend ALSA de cpal escribe a nuestro stderr de proceso cuando no
// encuentra tarjetas de sonido (corre en-proceso — sin pipe de
// subproceso para capturarlo). Los fallbacks de spawn de abajo hacen
// pipe del stderr correctamente, asi que se salta nativo cuando ALSA no
// tiene nada que abrir. Memoizado: la presencia de tarjeta no cambia a
// mitad de sesion.
let linuxAlsaCardsMemo: Promise<boolean> | null = null

function linuxHasAlsaCards(): Promise<boolean> {
  linuxAlsaCardsMemo ??= readFile('/proc/asound/cards', 'utf8').then(
    cards => {
      const c = cards.trim()
      return c !== '' && !c.includes('no soundcards')
    },
    () => false,
  )
  return linuxAlsaCardsMemo
}

export function _resetAlsaCardsForTesting(): void {
  linuxAlsaCardsMemo = null
}

type PackageManagerInfo = {
  cmd: string
  args: string[]
  displayCommand: string
}

function detectPackageManager(): PackageManagerInfo | null {
  if (process.platform === 'darwin') {
    if (hasCommand('brew')) {
      return {
        cmd: 'brew',
        args: ['install', 'sox'],
        displayCommand: 'brew install sox',
      }
    }
    return null
  }

  if (process.platform === 'linux') {
    if (hasCommand('apt-get')) {
      return {
        cmd: 'sudo',
        args: ['apt-get', 'install', '-y', 'sox'],
        displayCommand: 'sudo apt-get install sox',
      }
    }
    if (hasCommand('dnf')) {
      return {
        cmd: 'sudo',
        args: ['dnf', 'install', '-y', 'sox'],
        displayCommand: 'sudo dnf install sox',
      }
    }
    if (hasCommand('pacman')) {
      return {
        cmd: 'sudo',
        args: ['pacman', '-S', '--noconfirm', 'sox'],
        displayCommand: 'sudo pacman -S sox',
      }
    }
  }

  return null
}

export async function checkVoiceDependencies(): Promise<{
  available: boolean
  missing: string[]
  installCommand: string | null
}> {
  // El modulo nativo de audio (cpal) maneja todo en macOS, Linux, y Windows
  const napi = await loadAudioNapi()
  if (napi.isNativeAudioAvailable()) {
    return { available: true, missing: [], installCommand: null }
  }

  // Windows no tiene fallback soportado — el modulo nativo es requerido
  if (process.platform === 'win32') {
    return {
      available: false,
      missing: ['Voice mode requires the native audio module (not loaded)'],
      installCommand: null,
    }
  }

  // En Linux, arecord (ALSA utils) es un backend de grabacion de fallback valido
  if (process.platform === 'linux' && hasCommand('arecord')) {
    return { available: true, missing: [], installCommand: null }
  }

  const missing: string[] = []

  if (!hasCommand('rec')) {
    missing.push('sox (rec command)')
  }

  const pm = missing.length > 0 ? detectPackageManager() : null
  return {
    available: missing.length === 0,
    missing,
    installCommand: pm?.displayCommand ?? null,
  }
}

// ─── Disponibilidad de grabacion ─────────────────────────────────────

export type RecordingAvailability = {
  available: boolean
  reason: string | null
}

// Sondea-graba a traves de toda la cadena de fallback (nativo → arecord
// → SoX) para verificar que al menos un backend puede grabar. En macOS
// esto tambien dispara el dialogo de permiso TCC en el primer uso. Se
// confia en el resultado de la sonda por sobre la API de estado TCC,
// que puede ser poco confiable para binarios firmados ad-hoc o
// cross-arquitectura (p.ej. x64-en-arm64).
export async function requestMicrophonePermission(): Promise<boolean> {
  const napi = await loadAudioNapi()
  if (!napi.isNativeAudioAvailable()) {
    return true // las plataformas no-nativas se saltan este chequeo
  }

  const started = await startRecording(
    _chunk => {}, // descarta datos de audio — esto es solo una sonda de permiso
    () => {}, // ignora la señal de fin de deteccion-de-silencio
    { silenceDetection: false },
  )
  if (started) {
    stopRecording()
    return true
  }
  return false
}

export async function checkRecordingAvailability(): Promise<RecordingAvailability> {
  // Los entornos remotos no tienen microfono local
  if (isRunningOnHomespace() || isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
    return {
      available: false,
      reason:
        'Voice mode requires microphone access, but no audio device is available in this environment.\n\nTo use voice mode, run Claude Code locally instead.',
    }
  }

  // El modulo nativo de audio (cpal) maneja todo en macOS, Linux, y Windows
  const napi = await loadAudioNapi()
  if (napi.isNativeAudioAvailable()) {
    return { available: true, reason: null }
  }

  // Windows no tiene fallback soportado
  if (process.platform === 'win32') {
    return {
      available: false,
      reason:
        'Voice recording requires the native audio module, which could not be loaded.',
    }
  }

  const wslNoAudioReason =
    'Voice mode could not access an audio device in WSL.\n\nWSL2 with WSLg (Windows 11) provides audio via PulseAudio — if you are on Windows 10 or WSL1, run Claude Code in native Windows instead.'

  // En Linux (incluido WSL), sondea arecord. hasCommand() es
  // insuficiente: el binario puede existir mientras el open() del
  // dispositivo falla (WSL1, Win10-WSL2, Linux headless). WSL2+WSLg
  // (Win11 default) funciona via pipes RDP de PulseAudio — cpal falla
  // (sin /proc/asound/cards) pero arecord tiene exito.
  if (process.platform === 'linux' && hasCommand('arecord')) {
    const probe = await probeArecord()
    if (probe.ok) {
      return { available: true, reason: null }
    }
    if (getPlatform() === 'wsl') {
      return { available: false, reason: wslNoAudioReason }
    }
    logForDebugging(`[voice] arecord probe failed: ${probe.stderr}`)
    // sigue a SoX
  }

  // Fallback: chequea SoX
  if (!hasCommand('rec')) {
    // WSL sin arecord Y sin SoX: el hint generico de "instala SoX" de
    // abajo es enganoso en WSL1/Win10 (sin dispositivos de audio en
    // absoluto), pero correcto en WSL2+WSLg (SoX funciona via
    // PulseAudio). Como no se puede distinguir WSLg-vs-no sin un
    // backend que sondear, se muestra la guia de WSLg — apunta a los
    // usuarios WSL1 a Windows nativo Y les dice a los usuarios WSLg que
    // su setup deberia funcionar (pueden instalar sox o alsa-utils).
    // Hueco conocido: WSL con SoX pero SIN arecord se salta tanto esta
    // rama como la sonda de arriba — hasCommand('rec') miente de la
    // misma forma. Se confia optimistamente en ello (WSLg+SoX
    // funcionaria) en vez de probeSox() para una poblacion casi-cero
    // (WSL1 × distro minima × SoX-pero-no-alsa-utils).
    if (getPlatform() === 'wsl') {
      return { available: false, reason: wslNoAudioReason }
    }
    const pm = detectPackageManager()
    return {
      available: false,
      reason: pm
        ? `Voice mode requires SoX for audio recording. Install it with: ${pm.displayCommand}`
        : 'Voice mode requires SoX for audio recording. Install SoX manually:\n  macOS: brew install sox\n  Ubuntu/Debian: sudo apt-get install sox\n  Fedora: sudo dnf install sox',
    }
  }

  return { available: true, reason: null }
}

// ─── Grabacion (audio nativo en macOS/Linux/Windows, fallback SoX/arecord en Linux) ─────────────

let activeRecorder: ChildProcess | null = null
let nativeRecordingActive = false

export async function startRecording(
  onData: (chunk: Buffer) => void,
  onEnd: () => void,
  options?: { silenceDetection?: boolean },
): Promise<boolean> {
  logForDebugging(`[voice] startRecording called, platform=${process.platform}`)

  // Intenta primero el modulo nativo de audio (macOS, Linux, Windows via cpal)
  const napi = await loadAudioNapi()
  const nativeAvailable =
    napi.isNativeAudioAvailable() &&
    (process.platform !== 'linux' || (await linuxHasAlsaCards()))
  const useSilenceDetection = options?.silenceDetection !== false
  if (nativeAvailable) {
    // Asegura que cualquier grabacion previa este completamente detenida
    if (nativeRecordingActive || napi.isNativeRecordingActive()) {
      napi.stopNativeRecording()
      nativeRecordingActive = false
    }
    const started = napi.startNativeRecording(
      (data: Buffer) => {
        onData(data)
      },
      () => {
        if (useSilenceDetection) {
          nativeRecordingActive = false
          onEnd()
        }
        // En modo push-to-talk, ignora el onEnd disparado-por-silencio
        // del modulo nativo. La grabacion continua hasta que el
        // llamador llame explicitamente stopRecording() (p.ej. cuando
        // el usuario presiona Ctrl+X).
      },
    )
    if (started) {
      nativeRecordingActive = true
      return true
    }
    // La grabacion nativa fallo — sigue a los fallbacks de plataforma
  }

  // Windows no tiene fallback soportado
  if (process.platform === 'win32') {
    logForDebugging('[voice] Windows native recording unavailable, no fallback')
    return false
  }

  // En Linux, intenta arecord (ALSA utils) antes que SoX. Consulta la
  // sonda para que la seleccion de backend calce con
  // checkRecordingAvailability() — si no, en Linux headless con tanto
  // alsa-utils como SoX, el chequeo de disponibilidad cae a SoX
  // (probe.ok=false, no WSL) pero esta ruta igual elegiria arecord roto.
  // La sonda esta memoizada; latencia cero.
  if (
    process.platform === 'linux' &&
    hasCommand('arecord') &&
    (await probeArecord()).ok
  ) {
    return startArecordRecording(onData, onEnd)
  }

  // Fallback: SoX rec (Linux, o macOS si el modulo nativo no esta disponible)
  return startSoxRecording(onData, onEnd, options)
}

function startSoxRecording(
  onData: (chunk: Buffer) => void,
  onEnd: () => void,
  options?: { silenceDetection?: boolean },
): boolean {
  const useSilenceDetection = options?.silenceDetection !== false

  // Graba PCM crudo: 16 kHz, 16-bit signed, mono, a stdout.
  // --buffer 1024 fuerza a SoX a volcar audio en chunks pequeños en vez
  // de acumular datos en su buffer interno. Sin esto, SoX puede
  // bufferear varios segundos de audio antes de escribir nada a stdout
  // cuando se hace pipe, causando cero flujo de datos hasta que el
  // proceso sale.
  const args = [
    '-q', // quiet
    '--buffer',
    '1024',
    '-t',
    'raw',
    '-r',
    String(RECORDING_SAMPLE_RATE),
    '-e',
    'signed',
    '-b',
    '16',
    '-c',
    String(RECORDING_CHANNELS),
    '-', // stdout
  ]

  // Agrega el filtro de deteccion de silencio (auto-stop en silencio).
  // Se omite para push-to-talk donde el usuario controla manualmente start/stop.
  if (useSilenceDetection) {
    args.push(
      'silence', // start/stop en silencio
      '1',
      '0.1',
      SILENCE_THRESHOLD,
      '1',
      SILENCE_DURATION_SECS,
      SILENCE_THRESHOLD,
    )
  }

  const child = spawn('rec', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  activeRecorder = child

  child.stdout?.on('data', (chunk: Buffer) => {
    onData(chunk)
  })

  // Consume stderr para prevenir backpressure
  child.stderr?.on('data', () => {})

  child.on('close', () => {
    activeRecorder = null
    onEnd()
  })

  child.on('error', err => {
    logError(err)
    activeRecorder = null
    onEnd()
  })

  return true
}

function startArecordRecording(
  onData: (chunk: Buffer) => void,
  onEnd: () => void,
): boolean {
  // Graba PCM crudo: 16 kHz, 16-bit signed little-endian, mono, a
  // stdout. arecord no soporta deteccion de silencio incorporada, asi
  // que este backend es mas adecuado para push-to-talk
  // (silenceDetection: false).
  const args = [
    '-f',
    'S16_LE', // signed 16-bit little-endian
    '-r',
    String(RECORDING_SAMPLE_RATE),
    '-c',
    String(RECORDING_CHANNELS),
    '-t',
    'raw', // PCM crudo, sin cabecera WAV
    '-q', // quiet — sin output de progreso
    '-', // escribe a stdout
  ]

  const child = spawn('arecord', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  activeRecorder = child

  child.stdout?.on('data', (chunk: Buffer) => {
    onData(chunk)
  })

  // Consume stderr para prevenir backpressure
  child.stderr?.on('data', () => {})

  child.on('close', () => {
    activeRecorder = null
    onEnd()
  })

  child.on('error', err => {
    logError(err)
    activeRecorder = null
    onEnd()
  })

  return true
}

export function stopRecording(): void {
  if (nativeRecordingActive && audioNapi) {
    audioNapi.stopNativeRecording()
    nativeRecordingActive = false
    return
  }
  if (activeRecorder) {
    activeRecorder.kill('SIGTERM')
    activeRecorder = null
  }
}
