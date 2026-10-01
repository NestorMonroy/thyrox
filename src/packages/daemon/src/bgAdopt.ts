/**
 * BG-daemon adoption sweeps. ant 5166.js mxb (roster path) + 4639.js (jobs/
 * scan path). Extracted from bgDaemon.ts to keep the entry file under the
 * 800-LOC budget; behavior is identical, the helpers just take the workers
 * map + the daemon's process env explicitly instead of capturing them via
 * closure.
 *
 * @dynamicRequire
 */

import { existsSync as existsSyncFn } from 'node:fs'
import { readdir, unlink } from 'node:fs/promises'
import { connect } from 'node:net'
import { join } from 'node:path'

import { logEvent } from '@thyrox/local-observability'

import {
  type WorkerRecord,
  isPidAlive as isPidAliveSync,
  readAllWorkerRecords,
  readWorkerRecord,
  writeWorkerRecord,
} from './bgWorkerRegistry.js'
import { encodeCtrlFrame } from './internal/ptyFrame.js'
import { isCliVersionStale, readRoster } from './roster.js'
import { getDaemonScopeDir } from './socketPaths.js'
import { WorkerVm } from './workerVm.js'

/**
 * Boot adopt from roster.json. Supervisor loads the previous roster,
 * replays each entry as an adoption attempt (verifying pid + socket
 * exists), and orphans entries whose underlying process is gone.
 *
 * Roster mode adoptions take precedence over the jobs/ scan because the
 * roster carries cross-cwd entries the cwd-scoped jobs/ tree wouldn't
 * see. On parseFailed roster, we skip — the file has been quarantined
 * and we'll fall through to jobs/ scan + write a fresh empty roster.
 */
export async function adoptFromRoster(
  workers: Map<string, WorkerVm>,
): Promise<void> {
  const roster = await readRoster()
  if (roster.parseFailed) return
  let adopted = 0
  let dead = 0
  for (const [short, entry] of Object.entries(roster.workers)) {
    if (workers.has(short)) continue
    if (!isPidAliveSync(entry.pid)) {
      // ant 5166.js UB8: process is gone but supervisor was down. Mark
      // the meta.json as 'failed' so `ccb ps` and the tasks panel show
      // why it ended terminally.
      markAdoptionFailed(short, 'process gone while supervisor was down')
      dead++
      continue
    }
    // Do NOT fall back to entry.rendezvousSock here: since the rv channel
    // landed, rendezvousSock is a DISTINCT socket (the control socket), not
    // an alias for the PTY data socket. The old `?? entry.rendezvousSock`
    // fallback would mis-assign the rv socket as the PTY socket when ptySock
    // is absent — wrong socket, corrupts attach. A missing ptySock means the
    // worker is genuinely unreachable for attach (handled below).
    const ptySocket = entry.ptySock ?? ''
    const sockExists = ptySocket ? existsSyncFn(ptySocket) : false
    if (!sockExists) {
      logEvent('tengu_bg_adopt_sock_unlinked', { short, sock: ptySocket })
      // pid alive but socket gone — worker is unreachable for attach.
      // Mark failed with the specific reason so the user understands
      // why we can't recover the session.
      markAdoptionFailed(short, 'pty socket gone — worker unreachable')
      dead++
      continue
    }
    const record: WorkerRecord = {
      short,
      pid: entry.pid,
      cmd: [],
      cwd: entry.cwd,
      startedAt: entry.startedAt,
      status: 'running',
      mode: 'pty',
      ptySocket,
      rendezvousSocket: entry.rendezvousSock,
      procStart: entry.procStart,
      attempt: entry.attempt,
      cliVersion: entry.cliVersion,
    }
    // ant 2459.js Kv9 — orphan adoption: when the roster carries an
    // entry but the local jobs/<short>/ tree has no meta.json (cross-
    // cwd entry the previous supervisor wrote, fresh supervisor in a
    // different cwd-tree), persist meta.json now so `ccb ps`,
    // `ccb logs`, and the tasks panel can find it.
    const existing = readWorkerRecord(short)
    if (!existing) {
      try {
        writeWorkerRecord(record)
        logEvent('tengu_bg_roster_orphan_adopted', { short })
      } catch {
        // best-effort
      }
    }
    const vm = new WorkerVm(
      {
        short,
        cwd: entry.cwd,
        env: process.env,
        ptySocket,
        rvSocket: entry.rendezvousSock,
        cmd: [],
        cliVersion: process.env.THYROX_CODE_VERSION ?? 'dev',
      },
      record,
    )
    vm.adopt(record)
    workers.set(short, vm)
    adopted++
  }
  if (adopted + dead > 0) {
    logEvent('tengu_bg_adopt', {
      adopted: String(adopted),
      dead: String(dead),
      source: 'roster',
    })
  }
}

/**
 * Periodic scan of jobs/<short>/meta.json for workers spawned outside
 * our spawn op (e.g. ccb --bg-pty fired by user). Adopts each running
 * pty record; reaps orphans whose pid is gone.
 */
export function adoptRunningPtyRecords(workers: Map<string, WorkerVm>): void {
  for (const record of readAllWorkerRecords()) {
    if (record.status !== 'running') continue
    if (record.mode !== 'pty') continue
    if (workers.has(record.short)) continue
    if (!isPidAliveSync(record.pid)) {
      logEvent('tengu_bg_orphan_reap', {
        short: record.short,
        pid: String(record.pid),
      })
      try {
        writeWorkerRecord({
          ...record,
          status: 'failed',
          failedReason: 'process gone while supervisor was down',
          exitedAt: Date.now(),
        })
      } catch {
        // best-effort
      }
      continue
    }
    const ptySocket = record.ptySocket ?? ''
    const sockExists = ptySocket ? existsSyncFn(ptySocket) : false
    if (ptySocket && !sockExists) {
      logEvent('tengu_bg_adopt_sock_unlinked', {
        short: record.short,
        sock: ptySocket,
      })
    }
    const currentCli = process.env.THYROX_CODE_VERSION ?? 'dev'
    if (isCliVersionStale(record.cliVersion, currentCli)) {
      logEvent('tengu_bg_adopt_upgrade_respawn', {
        short: record.short,
        was: record.cliVersion,
        now: currentCli,
      })
    }
    if (record.procStart === undefined || record.procStart === 0) {
      logEvent('tengu_bg_adopt_unverified', {
        short: record.short,
        pid: String(record.pid),
      })
    }
    const vm = new WorkerVm(
      {
        short: record.short,
        cwd: record.cwd,
        env: process.env,
        ptySocket,
        rvSocket: record.rendezvousSocket,
        cmd: record.cmd,
        cliVersion: currentCli,
      },
      record,
    )
    vm.adopt(record)
    workers.set(record.short, vm)
    logEvent('tengu_bg_adopt', {
      short: record.short,
      pid: String(record.pid),
      sock_exists: String(sockExists),
      verified: String(record.procStart !== undefined && record.procStart !== 0),
    })
  }
}

/** Sufijo del socket de PTY de un worker bajo el scope del daemon. */
const PTY_SOCKET_SUFFIX = '.pty.sock'

/**
 * Breadcrumbs que un host de PTY deja junto a su socket (`yw`/`nx`/`HV` y el
 * `.err.read` de `NIe`). `.err` va antes que `.err.read` como en la
 * referencia; el sufijo compuesto no termina en `.err`, así que no se pisan.
 */
const PTY_BREADCRUMB_SUFFIXES = ['.err', '.late', '.exec-exit', '.err.read']

/** Plazo de `NIe` para que un host huérfano cierre tras el SIGTERM. */
const ORPHAN_HOST_KILL_TIMEOUT_MS = 2000

const REAPED_REASON = 'reaped (roster gap)'

function unlinkQuietly(path: string): Promise<void> {
  return unlink(path).catch(() => {})
}

/**
 * Pide a un host de PTY huérfano que termine. Ref `NIe` (chunk-kc04kkkd.js):
 * conecta, envía el frame `kill` SIGTERM y resuelve `true` cuando el host
 * cierra; si la conexión falla, el socket está muerto: borra el socket y sus
 * breadcrumbs `.err`/`.err.read`/`.late` y resuelve `false`; pasado el plazo
 * destruye la conexión y resuelve `false`. Los `unlink` son silenciosos como
 * en la referencia; aquí se esperan antes de resolver, para que quien llama
 * observe el directorio ya limpio.
 */
export function terminateOrphanPtyHost(ptySocket: string): Promise<boolean> {
  return new Promise(resolveOutcome => {
    let settled = false
    const settle = (outcome: boolean): void => {
      if (settled) return
      settled = true
      resolveOutcome(outcome)
    }
    const socket = connect(ptySocket)
    socket.unref()
    socket.setTimeout(ORPHAN_HOST_KILL_TIMEOUT_MS, () => {
      socket.destroy()
      settle(false)
    })
    socket.on('error', () => {
      const deadFiles = [ptySocket, `${ptySocket}.err`, `${ptySocket}.err.read`, `${ptySocket}.late`]
      void Promise.all(deadFiles.map(unlinkQuietly)).then(() => settle(false))
    })
    socket.once('connect', () => {
      socket.resume()
      socket.write(encodeCtrlFrame({ t: 'kill', sig: 'SIGTERM' }))
    })
    socket.once('close', hadError => {
      if (!hadError) settle(true)
    })
  })
}

/** Breadcrumb cuyo socket de PTY ya no está en el directorio. */
function isOrphanBreadcrumb(entry: string, present: ReadonlySet<string>): boolean {
  const suffix = PTY_BREADCRUMB_SUFFIXES.find(s => entry.endsWith(`${PTY_SOCKET_SUFFIX}${s}`))
  return suffix !== undefined && !present.has(entry.slice(0, -suffix.length))
}

/**
 * Reapa un host sin entrada de roster: le pide terminar (`NIe`) y, en la
 * rama POSIX de `pr`, lo marca `failed` sea cual sea el desenlace y borra
 * sus breadcrumbs `.late` y `.exec-exit`.
 */
async function reapRosterlessHost(scopeDir: string, short: string): Promise<void> {
  const ptySocket = join(scopeDir, `${short}${PTY_SOCKET_SUFFIX}`)
  await terminateOrphanPtyHost(ptySocket)
  markAdoptionFailed(short, REAPED_REASON)
  await Promise.all([unlinkQuietly(`${ptySocket}.late`), unlinkQuietly(`${ptySocket}.exec-exit`)])
}

/**
 * Barrido archivo→roster de `<daemon-scope>`: la dirección opuesta a
 * `adoptRunningPtyRecords`. Ref `pr` (chunk-92tvramn.js), rama no-Windows:
 * 1. borra cada breadcrumb (`.err`/`.late`/`.exec-exit`/`.err.read`) cuyo
 *    `.pty.sock` ya no existe;
 * 2. cada `.pty.sock` sin handle en `workers` es un host "roster-less": se
 *    reapa con `reapRosterlessHost`.
 * El log agregado sale antes de esperar a los reapeos, como en la
 * referencia; a diferencia de ella, la función espera a que terminen, para
 * que quien la invoca sepa cuándo el directorio quedó consistente.
 *
 * Divergencias declaradas: la rama `storageV5` no aplica (ccb no tiene ese
 * store) y la rama Windows (`.pid` bajo pty-pids) tampoco (socketPaths.ts
 * deja el daemon de Windows fuera de alcance). La lectura fallida del
 * directorio da lista vacía en silencio (`nr(a).catch(()=>[])`).
 */
export async function reapOrphanPtySockets(
  workers: Map<string, WorkerVm>,
  log: (message: string) => void,
): Promise<void> {
  const scopeDir = getDaemonScopeDir()
  const entries = await readdir(scopeDir).catch(() => [] as string[])
  const present = new Set(entries.filter(entry => entry.endsWith(PTY_SOCKET_SUFFIX)))
  const breadcrumbs = entries.filter(entry => isOrphanBreadcrumb(entry, present))
  const rosterless = [...present]
    .map(entry => entry.slice(0, -PTY_SOCKET_SUFFIX.length))
    .filter(short => !workers.has(short))
  if (rosterless.length > 0) {
    log(`bg orphan-reap: ${rosterless.length} roster-less pty host(s)`)
    logEvent('tengu_bg_orphan_reap', { reaped: String(rosterless.length) })
  }
  await Promise.all([
    ...breadcrumbs.map(entry => unlinkQuietly(join(scopeDir, entry))),
    ...rosterless.map(short => reapRosterlessHost(scopeDir, short)),
  ])
}

/**
 * Mark a worker's meta.json as `status='failed'` with a human-readable
 * reason. ant 5166.js UB8 — when the supervisor adopts a roster entry
 * but discovers the underlying process / socket is gone, the user-
 * facing job state is updated so the tasks panel and `ccb ps` show
 * "why" the job ended terminally instead of leaving it as 'running'.
 *
 * No-op if the meta.json is missing (e.g. the roster carried a
 * cross-cwd entry whose jobs/ tree is on a different mount).
 */
function markAdoptionFailed(short: string, reason: string): void {
  try {
    const record = readWorkerRecord(short)
    if (!record) return
    // Don't trample a status the user already set (stopped/killed/failed).
    if (record.status !== 'running' && record.status !== 'unknown') return
    writeWorkerRecord({
      ...record,
      status: 'failed',
      failedReason: reason,
      exitedAt: Date.now(),
    })
  } catch {
    // best-effort
  }
}
