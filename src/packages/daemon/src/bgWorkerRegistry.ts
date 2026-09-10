/**
 * Registro de workers de jobs bg — estado del lado del daemon.
 *
 * Espeja las instancias `vm` por-worker de `ant 4706.js`, pero recortado:
 * el daemon de ccb supervisa las mismas cosas que el de ant (subproceso
 * PTY-host, lista de attachers, poll de heartbeat, presupuesto de retry)
 * pero usa el esquema en disco existente de ccb
 * (`~/.claude/jobs/<short>/meta.json`) para persistencia, y se salta las
 * rutas de GrowthBook / telemetría / Datadog que no aplican a ccb.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/bgWorkerRegistry.ts`.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

import { isPidAlive } from './internal/pendingCrossPackageDeps.js'
export { isPidAlive }

/**
 * Máquina de estados del worker. Espeja las transiciones RW3 de ant
 * (4706.js:70-83):
 *
 *   spawning ⇄ running    (ruta inicial; los ciclos de respawn vuelven aquí)
 *   running   → upgrading (binario actualizado a mitad de vuelo)
 *   running   → retiring  (apagado ordenado O kill forzado)
 *   upgrading → spawning  (reinicio desde attempt=0)
 *   retiring  → retired   (terminal)
 *
 * Retiring lleva una `reason`: 'grace' (esperar a estar inactivo), 'reap'
 * (kill forzado ahora), 'stop' (desatender sin esperar; registrar que
 * salió externamente).
 */
export type WorkerPhase =
  | { kind: 'spawning'; attempt: number }
  | { kind: 'running' }
  | { kind: 'upgrading' }
  | {
      kind: 'retiring'
      reason: 'grace' | 'reap' | 'stop'
    }
  | { kind: 'retired'; outcome: 'done' | 'crashed' | 'killed' }

/** Registro de job persistido. Coincide con la forma existente de meta.json de ccb. */
export interface WorkerRecord {
  short: string
  pid: number
  cmd: readonly string[]
  cwd: string
  startedAt: number
  status: 'running' | 'exited' | 'stopped' | 'killed' | 'failed' | 'unknown'
  killedAt?: number
  exitedAt?: number
  exitCode?: number
  /**
   * Razón legible por humano que explica un estado terminal no natural —
   * fallo de adopción ("el proceso desapareció mientras el supervisor
   * estaba caído", ant 5166 UB8), agotamiento de respawn, etc. Se muestra
   * en `ccb ps` para que el usuario vea POR QUÉ un job terminó de forma
   * terminal.
   */
  failedReason?: string
  mode?: 'detached' | 'pty'
  ptySocket?: string
  /** Ruta del socket de rendezvous (control) — `<jobDir>/rv.sock`. El REPL
   *  interno lo ata; el cliente rv del daemon se conecta para recibir
   *  state/done/heartbeat fuera de banda. Persistido para que la ruta de
   *  adopción reconecte tras un reinicio del daemon (el rosterEntry de
   *  ant lleva `rendezvousSock`). */
  rendezvousSocket?: string
  /** Timestamp procStart de /proc/<pid>/stat o el fallback de ps. */
  procStart?: number
  /** Cantidad de intentos de respawn hasta ahora. Tope en 20. */
  attempt?: number
  /** Crashes consecutivos dentro de los 5s del spawn. >=3 → settle 'crashed'. */
  fastCrashStreak?: number
  /** Versión de ccb que generó este worker; usado por adopt para detectar upgrade. */
  cliVersion?: string
  /** Conteo de respawns disparados por attach-stall. ant 5164.js wF3:23. */
  attachStallRespawns?: number
}

/** Tope de intentos de respawn (ant hXK = 20). */
export const MAX_RESPAWN_ATTEMPTS = 20
/** Backoff antes de reintentar un worker crasheado (ant GW3 = 10000). */
export const RESPAWN_BACKOFF_MS = 10_000
/** Umbral para la clasificación "fast crash" (ant SXK = 5000). */
export const FAST_CRASH_WINDOW_MS = 5_000
/** Tras 3 fast crashes seguidos, settle del worker. */
export const FAST_CRASH_LIMIT = 3
/** Intervalo de poll de heartbeat (ant CXK = 5000). */
export const HEARTBEAT_POLL_MS = 5_000
/** Silencio máximo antes de registrar "stalled" (ant ZW3 = 120000). */
export const STALLED_THRESHOLD_MS = 120_000

function getJobsRoot(): string {
  const root = process.env.CLAUDE_CONFIG_HOME
  return root ? resolve(root, 'jobs') : join(homedir(), '.claude', 'jobs')
}

function getJobDir(short: string): string {
  return join(getJobsRoot(), short)
}

/** Lee un meta.json a un WorkerRecord. Devuelve null si falta o está corrupto. */
export function readWorkerRecord(short: string): WorkerRecord | null {
  const path = join(getJobDir(short), 'meta.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as WorkerRecord
  } catch {
    return null
  }
}

/** Persiste un registro de vuelta a meta.json. */
export function writeWorkerRecord(record: WorkerRecord): void {
  const dir = getJobDir(record.short)
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(record, null, 2) + '\n')
}

/** Recorre el directorio jobs/ y lee todos los registros. Salta los no parseables. */
export function readAllWorkerRecords(): WorkerRecord[] {
  const root = getJobsRoot()
  if (!existsSync(root)) return []
  const out: WorkerRecord[] = []
  for (const short of readdirSync(root)) {
    const r = readWorkerRecord(short)
    if (r) out.push(r)
  }
  return out
}

// (la implementación canónica vive en el sustituto local de este paquete
// — ver `internal/pendingCrossPackageDeps.ts` — porque
// `@claude-code-how-works/shell/genericProcessUtils` no tiene hoy un
// `@thyrox/shell` equivalente. El import + re-export arriba lo trae tanto
// para el uso interno de este archivo como para quien importe isPidAlive
// desde bgWorkerRegistry.)

/**
 * Lee el campo 22 (starttime) de /proc/<pid>/stat en Linux. Cae al
 * parseo de `ps -o lstart= -p <pid>` en macOS/BSD. Devuelve 0 si ninguno
 * funciona (p. ej. WSL con /proc sin mapear). 0 significa "no se puede
 * verificar"; el llamador decide si usar la ruta de adopción no-verificada.
 *
 * Se usa para detectar el reciclaje de PID: si `procStart` no coincide
 * entre intentos de adopción, el SO reasignó el PID a un proceso nuevo.
 */
export function readProcStart(pid: number): number {
  try {
    if (process.platform === 'linux') {
      // /proc/<pid>/stat: el campo 22 es starttime en ticks de reloj desde el boot
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
      // Tras el campo comm (que puede contener espacios), los campos van
      // separados por espacio. Se necesita el campo 22 = starttime, pero
      // saltando los paréntesis del comm.
      const closeParen = stat.lastIndexOf(')')
      if (closeParen < 0) return 0
      const tail = stat.slice(closeParen + 2).split(' ')
      // tail[0] = campo 3 (state), tail[19] = campo 22 (starttime)
      const starttime = parseInt(tail[19] ?? '0', 10)
      return Number.isFinite(starttime) ? starttime : 0
    }
    // Fallback macOS/BSD: lee el epoch de lstart de ps vía shell
    const r = spawnSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
      encoding: 'utf8',
    })
    if (r.status !== 0) return 0
    const lstart = (r.stdout ?? '').trim()
    if (!lstart) return 0
    const t = Date.parse(lstart)
    return Number.isFinite(t) ? t : 0
  } catch {
    return 0
  }
}

/**
 * Verifica que el pid registrado en `record` sigue siendo el mismo
 * proceso que se generó. Compara timestamps procStart. Devuelve:
 *   'verified'   — pid vivo, procStart coincide → adoptar
 *   'recycled'   — pid vivo pero procStart no coincide → settle (se reusó)
 *   'dead'       — pid no vivo → settle exited
 *   'unverified' — no se puede leer procStart → adoptar con salvedad (poll)
 */
export function verifyAdoption(
  record: WorkerRecord,
): 'verified' | 'recycled' | 'dead' | 'unverified' {
  if (!isPidAlive(record.pid)) return 'dead'
  const current = readProcStart(record.pid)
  if (current === 0) return 'unverified'
  if (record.procStart === undefined) {
    // Nunca se registró procStart para este worker. Se confía en el pid
    // vivo, pero se captura procStart ahora para que verificaciones
    // futuras puedan comparar.
    return 'verified'
  }
  return current === record.procStart ? 'verified' : 'recycled'
}

/**
 * Reconcilia el estado de un registro contra el estado real del proceso.
 * Lo usa `list` para mostrar el estado correcto sin un round-trip al
 * daemon.
 */
export function reconcileWorkerRecord(record: WorkerRecord): WorkerRecord {
  if (record.status !== 'running') return record
  const v = verifyAdoption(record)
  if (v === 'verified' || v === 'unverified') return record
  // Muerto O pid reciclado → marcar exited.
  const updated: WorkerRecord = {
    ...record,
    status: 'exited',
    exitedAt: Date.now(),
  }
  try {
    writeWorkerRecord(updated)
  } catch {
    // Best-effort; el daemon puede no tener acceso de escritura si el uid cambió.
  }
  return updated
}
