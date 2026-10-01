/**
 * File-spool dispatch fallback — ant 5165.js XF3/EFK/fF3.
 *
 * Watches `~/.claude/daemon/dispatch/` for incoming dispatch envelope
 * files. Each file is one dispatch request that the CLI couldn't deliver
 * via socket (e.g. daemon mid-restart). Daemon picks up via fs.watch on
 * boot + every 5s rescan, validates schema/size/age, applies as if it
 * were a socket dispatch, deletes on success or moves to `rejected/` on
 * failure.
 *
 * Survives daemon restart between CLI write and daemon read — the file
 * just sits there until next daemon comes up. socket-only dispatch
 * loses any in-flight request when daemon dies mid-handle.
 *
 * ccb uses Node `fs.watch` instead of chokidar (one less dep). On macOS
 * fs.watch fires 'rename' events on file create AND delete — we filter
 * by lstat to distinguish, plus poll every 5s as backup since fs.watch
 * can miss events under load.
 *
 * Referencia 2.1.283, `chunk-92tvramn.js`, resuelta con `bin/binary
 * symbol`: `Me` (rejectFile), `Ie` (evento de rechazo), `gt` (mensaje
 * oversized), `mt` (ingestEnvelope), `Qt` (ensureSpoolDir, rama disco),
 * `_t` (parseo/validación inline en ingestEnvelope), `qe`
 * (removeSpoolEntry), `kt` (removeNonRegularEntry), `St` (isTempFile),
 * `Ye` (shouldIgnoreSpoolEntry), `bt`+`tr` (startSpoolWatcher) y la rama
 * de disco de `er` (drainSpool). La rama key-value (`vt`, `ze`, `Zt` y la
 * rama v5 de `Qt`/`er`) es latente en 2.1.283 — no se porta
 * (H-THYROX-250, `.claude/workbench/daemon-inventory-20260929T065202/
 * spool-kv-reachability.md`).
 *
 * @dynamicRequire
 */

import {
  type FSWatcher,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  watch,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import { logEvent } from '@thyrox/local-observability'

/** ant 5165.js DF3 — max age before a spool file is considered stale (24h). */
const MAX_AGE_MS = 86_400_000
/** ant 5165.js MF3 — max body size for a single dispatch envelope (256 KiB). */
const MAX_BODY_BYTES = 262_144

/** Nombre de funcionalidad usado por la telemetría genérica de `mt`/`_t`. */
const DISPATCH_INGEST_FEATURE = 'daemon_bg_dispatch_ingest'
/** Nombre de funcionalidad usado por la telemetría genérica de `bt`. */
const WATCHER_START_FEATURE = 'daemon_bg_watcher_start'

export interface DispatchEnvelope {
  /** ms-epoch when CLI wrote this envelope. Daemon rejects if too old. */
  createdAt: number
  /** Daemon op to invoke once envelope is ingested. Same as socket op. */
  op: string
  /** Op payload (passed to handler as msg.d). */
  d: Record<string, unknown>
  /** Optional nonce for await-ack pairing. */
  nonce?: string
}

function getSpoolDir(): string {
  return join(getConfigHomeDir(), 'daemon', 'dispatch')
}

function getRejectedDir(): string {
  return join(getSpoolDir(), 'rejected')
}

/** chunk-92tvramn.js:St — nombre de archivo temporal. */
function isTempFile(name: string): boolean {
  return name.endsWith('.tmp') || name.includes('.tmp.')
}

/**
 * chunk-92tvramn.js:Ye — si una entrada del spool debe ignorarse al
 * escanear: oculta, temporal, o es la carpeta "rejected". Antes vivía
 * como el mismo condicional inline duplicado en `drainSpool` y en el
 * callback de `fs.watch`; ahora es una sola definición reutilizada.
 */
function shouldIgnoreSpoolEntry(name: string): boolean {
  return name.startsWith('.') || isTempFile(name) || name === 'rejected'
}

/**
 * chunk-d09a8ccq.js:_ / chunk-d09a8ccq.js:m — telemetría genérica de
 * funcionalidad (`tengu_feature_ok`/`tengu_feature_bad`). El porte propio
 * vive en `@thyrox/local-observability/src/uds/featureTelemetry.ts`, pero
 * ese módulo no está en el `exports` público del paquete (no hay entrada
 * `./uds/featureTelemetry.js` en su `package.json`) — el mismo hueco que
 * `src/packages/daemon/src/main.ts:reportDaemonStartupCrash` ya declaró.
 * Se expone la forma del payload como función pura, para poder probarla
 * sin depender de qué evento local del sistema dispara cada rama.
 */
export function buildFeatureOkMetadata(feature: string): { feature_name: string } {
  return { feature_name: feature }
}

export function buildFeatureBadMetadata(feature: string, code: string): { feature_name: string; error_code: string } {
  return { feature_name: feature, error_code: code }
}

function reportFeatureOk(feature: string): void {
  logEvent('tengu_feature_ok', buildFeatureOkMetadata(feature))
}

function reportFeatureBad(feature: string, code: string): void {
  logEvent('tengu_feature_bad', buildFeatureBadMetadata(feature, code))
}

/**
 * chunk-92tvramn.js:Ie — payload del evento `tengu_bg_dispatch_rejected`.
 * La referencia no trunca `reason`; se expone aparte porque el código
 * previo sí truncaba a 100 caracteres, y así se prueba sin simular el
 * error del sistema de archivos que produciría un reason largo.
 */
export function buildRejectionEventMetadata(reason: string): { reason: string } {
  return { reason }
}

/**
 * chunk-92tvramn.js:qe — borra por nombre una entrada del spool (recursivo,
 * forzado, silencioso). En 2.1.283 sólo la invoca la rama v5/KV; aquí la usa
 * también `removeNonRegularEntry` para la rama de archivo plano.
 */
function removeSpoolEntry(name: string): void {
  try { rmSync(join(getSpoolDir(), name), { recursive: true, force: true }) } catch { /**/ }
}

/**
 * chunk-92tvramn.js:kt — entrada no regular del spool (directorio, FIFO,
 * socket...): telemetría de fallo y borrado directo, sin pasar por
 * `rejectFile`/`rejected/`. En 2.1.283 sólo la invoca la rama v5/KV de
 * `er`; `mt` inlinea la misma clasificación en la rama de disco — aquí se
 * factoriza para que ambas compartan una sola definición.
 *
 * pendiente: `t(`[bg-dispatch] removed non-regular ${name}`,
 * {level:"warn"})` — este daemon no tiene canal de log de texto plano
 * (sólo `logEvent`/`logError`), así que el mensaje de texto no se porta.
 */
function removeNonRegularEntry(name: string): void {
  reportFeatureBad(DISPATCH_INGEST_FEATURE, 'not_a_file')
  removeSpoolEntry(name)
}

/**
 * chunk-92tvramn.js:Me — move a bad envelope to rejected/ subdir.
 *
 * pendiente: `t(`[bg-dispatch] rejected ${basename(path)}: ${reason}`,
 * {level:"warn"})` (chunk-92tvramn.js:Ie) — no hay canal de log de texto
 * plano en este daemon; `basename(path)` sólo alimentaba ese mensaje y no
 * llega al evento (`Ie` sólo pone `reason` en el payload).
 */
function rejectFile(path: string, reason: string): void {
  try {
    mkdirSync(getRejectedDir(), { recursive: true, mode: 0o700 })
    const dest = join(getRejectedDir(), basename(path))
    try { renameSync(path, dest) } catch { unlinkSync(path) }
  } catch {
    // best-effort — can't reject, just unlink
    try { unlinkSync(path) } catch { /**/ }
  }
  logEvent('tengu_bg_dispatch_rejected', buildRejectionEventMetadata(reason))
}

/**
 * chunk-92tvramn.js:mt — process one envelope file. Returns `null` on
 * success (file consumed) or a rejection reason string. Sync because
 * daemon dispatch path is synchronous; the actual handler invocation is
 * async via the deliver callback which the caller awaits.
 *
 * pendiente: el saneado de `env`/`reattachEnv` contra listas de permitidos
 * (`chunk-92tvramn.js:_t`, vía `ror`/`Q7e`/`BPe`) — `DispatchEnvelope` no
 * lleva esos campos; portarlo exige el esquema `Nen` completo (zod), que
 * no es una dependencia de este paquete y excede "completitud del spool
 * filesystem" (D8).
 */
export async function ingestEnvelope(
  path: string,
  deliver: (env: DispatchEnvelope) => Promise<void> | void,
): Promise<string | null> {
  let stat
  try {
    stat = lstatSync(path)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    reportFeatureBad(DISPATCH_INGEST_FEATURE, 'read_failed')
    rejectFile(path, (e as Error).message)
    return 'read-failed'
  }
  if (stat.isSymbolicLink()) {
    reportFeatureBad(DISPATCH_INGEST_FEATURE, 'symlink')
    rejectFile(path, 'symlink')
    return 'symlink'
  }
  if (!stat.isFile()) {
    removeNonRegularEntry(basename(path))
    return 'not-a-file'
  }
  if (stat.size > MAX_BODY_BYTES) {
    reportFeatureBad(DISPATCH_INGEST_FEATURE, 'oversized')
    rejectFile(path, `oversized (${stat.size} bytes)`)
    return 'oversized'
  }
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    reportFeatureBad(DISPATCH_INGEST_FEATURE, 'read_failed')
    rejectFile(path, (e as Error).message)
    return 'read-failed'
  }
  let env: DispatchEnvelope
  try {
    env = JSON.parse(raw) as DispatchEnvelope
  } catch {
    reportFeatureBad(DISPATCH_INGEST_FEATURE, 'bad_json')
    rejectFile(path, 'bad-json')
    return 'bad-json'
  }
  if (!env || typeof env !== 'object' || typeof env.op !== 'string' || typeof env.createdAt !== 'number' || !env.d || typeof env.d !== 'object') {
    reportFeatureBad(DISPATCH_INGEST_FEATURE, 'schema')
    rejectFile(path, 'schema')
    return 'schema'
  }
  if (Date.now() - env.createdAt > MAX_AGE_MS) {
    reportFeatureBad(DISPATCH_INGEST_FEATURE, 'stale')
    rejectFile(path, 'stale')
    return 'stale'
  }
  try {
    await deliver(env)
  } catch (e) {
    rejectFile(path, `deliver-failed: ${(e as Error).message.slice(0, 60)}`)
    return 'deliver-failed'
  }
  reportFeatureOk(DISPATCH_INGEST_FEATURE)
  try { unlinkSync(path) } catch { /**/ }
  return null
}

/**
 * chunk-92tvramn.js:er (rama de disco) — drain any pre-existing files in
 * spool dir on boot. Called by daemon startup before fs.watch is set up
 * so any files written between previous daemon shutdown and this boot
 * get processed.
 *
 * pendiente: la rama v5/KV de `er` (listado por `listEntries`/`ht`) —
 * excluida de este ítem, H-THYROX-250.
 */
export async function drainSpool(
  deliver: (env: DispatchEnvelope) => Promise<void> | void,
): Promise<void> {
  const dir = getSpoolDir()
  if (!existsSync(dir)) return
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return
    throw e
  }
  for (const name of entries) {
    if (shouldIgnoreSpoolEntry(name)) continue
    await ingestEnvelope(join(dir, name), deliver)
  }
}

export interface SpoolWatcher {
  close(): void
}

/**
 * chunk-92tvramn.js:Qt (rama de disco) — asegura que el directorio de
 * spool exista.
 *
 * pendiente: la rama v5/KV (`r.ensureScope(ht)`) — excluida de este ítem,
 * H-THYROX-250. La referencia traga el error de `mkdir` en silencio
 * (`.catch(()=>{})`); thyrox además lo clasifica con un evento, más
 * estricto de lo que la paridad exige.
 */
function ensureSpoolDir(): void {
  try {
    mkdirSync(getSpoolDir(), { recursive: true, mode: 0o700 })
  } catch (e) {
    logEvent('tengu_bg_dispatch_watcher_failed', {
      errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
      reason: 'mkdir',
    })
  }
}

/**
 * chunk-92tvramn.js:bt+tr — start the file-watcher on the spool dir.
 * Caller provides `deliver` which routes the envelope through the same op
 * dispatch table the socket server uses.
 *
 * fs.watch is best-effort — a 5s polling timer covers cases where the
 * watcher misses the event (high system load, FS event coalescing).
 *
 * pendiente:
 * - `tr` arranca sobre chokidar (`ignoreInitial`, `depth:0`, modo de
 *   polling en macOS, `awaitWriteFinish` en Windows) y espera su evento
 *   "ready" antes del drenado de arranque; portar eso exige la dependencia
 *   `chokidar`, que esta regla prohíbe añadir — de ahí el diseño ya
 *   declarado en la cabecera del archivo (`fs.watch` + poll de 5s).
 * - en `tr` el drenado de arranque (`er`) ocurre DESPUÉS de que el watcher
 *   esté listo; aquí `drainSpool` lo llama `bgDaemon.ts` ANTES de invocar
 *   `startSpoolWatcher` (fuera del alcance de este ítem: no se toca
 *   `bgDaemon.ts`).
 * - `bt` envuelve `tr` con `Or`, que en caso de error PROPAGA la excepción
 *   (tras clasificarla) al llamador; aquí, si el `watch()` síncrono falla,
 *   el error se traga (ya lo hacía antes de este porte, para no tumbar el
 *   arranque del daemon) y sólo se clasifica con `tengu_feature_bad`.
 */
export function startSpoolWatcher(
  deliver: (env: DispatchEnvelope) => Promise<void> | void,
): SpoolWatcher {
  const dir = getSpoolDir()
  ensureSpoolDir()
  let watcher: FSWatcher | undefined
  try {
    watcher = watch(dir, { persistent: false }, (_event, filename) => {
      if (!filename) return
      const fname = String(filename)
      if (shouldIgnoreSpoolEntry(fname)) return
      const path = join(dir, fname)
      // Only ingest on existence (i.e. add or rename-into); ENOENT means rename-out.
      if (!existsSync(path)) return
      void ingestEnvelope(path, deliver).catch(() => {})
    })
    watcher.on('error', e => {
      logEvent('tengu_bg_dispatch_watcher_failed', {
        errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
      })
    })
  } catch (e) {
    logEvent('tengu_bg_dispatch_watcher_failed', {
      errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
      reason: 'watch-setup',
    })
  }
  if (watcher) {
    reportFeatureOk(WATCHER_START_FEATURE)
  } else {
    reportFeatureBad(WATCHER_START_FEATURE, 'error')
  }
  // 5s poll backup (ant doesn't have this — chokidar polls internally on macOS).
  const pollTimer = setInterval(() => {
    void drainSpool(deliver).catch(() => {})
  }, 5000)
  pollTimer.unref()
  return {
    close(): void {
      if (watcher) try { watcher.close() } catch { /**/ }
      clearInterval(pollTimer)
    },
  }
}

/**
 * Write a dispatch envelope to the spool dir. Caller-side helper used
 * by CLI when daemon socket is unreachable.
 *
 * Atomic-write via tmp + rename (so the watcher never sees a partial
 * file). Returns the path to the spooled envelope.
 */
export function writeSpoolEnvelope(env: DispatchEnvelope): string {
  const dir = getSpoolDir()
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const id = `${env.createdAt}-${Math.random().toString(36).slice(2, 10)}`
  const tmp = join(dir, `${id}.tmp`)
  const dest = join(dir, `${id}.json`)
  writeFileSync(tmp, JSON.stringify(env), { mode: 0o600 })
  renameSync(tmp, dest)
  return dest
}
