/**
 * Barridos de adopción del bg-daemon. `ant 5166.js` mxb (ruta de roster) +
 * 4639.js (ruta de barrido de jobs/). Extraído de bgDaemon.ts para
 * mantener el archivo de entrada bajo el presupuesto de 800 LOC; el
 * comportamiento es idéntico, los helpers sólo toman el mapa de workers +
 * el env del proceso del daemon explícitamente en vez de capturarlos por
 * clausura.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/bgAdopt.ts`.
 */

import { existsSync as existsSyncFn } from 'node:fs'

import { logEvent } from './internal/pendingCrossPackageDeps.js'

import {
  type WorkerRecord,
  isPidAlive as isPidAliveSync,
  readAllWorkerRecords,
  readWorkerRecord,
  writeWorkerRecord,
} from './bgWorkerRegistry.js'
import { readRoster } from './roster.js'
import { WorkerVm } from './workerVm.js'

/**
 * Adopción al arrancar desde roster.json. El supervisor carga el roster
 * previo, reproduce cada entrada como un intento de adopción (verificando
 * que el pid + el socket existan), y da por huérfanas las entradas cuyo
 * proceso subyacente ya no está.
 *
 * Las adopciones en modo roster tienen precedencia sobre el barrido de
 * jobs/ porque el roster lleva entradas cross-cwd que el árbol jobs/
 * acotado por cwd no vería. Ante un roster con parseFailed, se salta — el
 * archivo fue puesto en cuarentena y se cae al barrido de jobs/ + se
 * escribe un roster vacío fresco.
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
      // ant 5166.js UB8: el proceso se fue pero el supervisor estaba
      // caído. Se marca el meta.json como 'failed' para que `ccb ps` y el
      // panel de tareas muestren por qué terminó de forma terminal.
      markAdoptionFailed(short, 'process gone while supervisor was down')
      dead++
      continue
    }
    // NO caer aquí a entry.rendezvousSock: desde que aterrizó el canal
    // rv, rendezvousSock es un socket DISTINTO (el socket de control), no
    // un alias del socket de datos PTY. El viejo fallback
    // `?? entry.rendezvousSock` asignaría mal el socket rv como el socket
    // PTY cuando ptySock está ausente — socket equivocado, corrompe el
    // attach. Un ptySock ausente significa que el worker es genuinamente
    // inalcanzable para attach (se maneja abajo).
    const ptySocket = entry.ptySock ?? ''
    const sockExists = ptySocket ? existsSyncFn(ptySocket) : false
    if (!sockExists) {
      logEvent('tengu_bg_adopt_sock_unlinked', { short, sock: ptySocket })
      // pid vivo pero el socket ya no está — el worker es inalcanzable
      // para attach. Se marca failed con la razón específica para que el
      // usuario entienda por qué no se puede recuperar la sesión.
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
    // ant 2459.js Kv9 — adopción huérfana: cuando el roster lleva una
    // entrada pero el árbol local jobs/<short>/ no tiene meta.json (una
    // entrada cross-cwd que escribió el supervisor anterior, un supervisor
    // fresco en un árbol-cwd distinto), se persiste meta.json ahora para
    // que `ccb ps`, `ccb logs` y el panel de tareas puedan encontrarlo.
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
        cliVersion: process.env.CLAUDE_CODE_VERSION ?? 'dev',
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
 * Barrido periódico de jobs/<short>/meta.json para workers generados
 * fuera de nuestro op spawn (p. ej. `ccb --bg-pty` disparado por el
 * usuario). Adopta cada registro pty corriendo; siega huérfanos cuyo pid
 * ya no está.
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
    const currentCli = process.env.CLAUDE_CODE_VERSION ?? 'dev'
    if (record.cliVersion && record.cliVersion !== currentCli) {
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

/**
 * Marca el meta.json de un worker como `status='failed'` con una razón
 * legible por humanos. `ant 5166.js` UB8 — cuando el supervisor adopta una
 * entrada de roster pero descubre que el proceso/socket subyacente ya no
 * está, se actualiza el estado del job de cara al usuario para que el
 * panel de tareas y `ccb ps` muestren "por qué" el job terminó de forma
 * terminal en vez de dejarlo como 'running'.
 *
 * No-op si falta el meta.json (p. ej. el roster llevaba una entrada
 * cross-cwd cuyo árbol jobs/ está en otro mount).
 */
function markAdoptionFailed(short: string, reason: string): void {
  try {
    const record = readWorkerRecord(short)
    if (!record) return
    // No arrasar un status que el usuario ya fijó (stopped/killed/failed).
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
