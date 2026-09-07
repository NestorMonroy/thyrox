/**
 * Resolución de rutas de socket del daemon.
 *
 * Espeja el layout de rutas de `ant 4138.js` / `4137.js`, adaptado a la
 * convención de prefijo de proveedor de ccb:
 *
 *   $TMPDIR/cc-daemon-<uid>/<hash-repo>/control.sock        rendezvous
 *   $TMPDIR/cc-daemon-<uid>/<hash-repo>/<short>.pty.sock    PTY por job
 *   $TMPDIR/cc-daemon-<uid>/<hash-repo>/<short>.claim.sock  claim por job
 *   ~/.claude/daemon/pty-pids/<short>.pid                   miga de pid
 *   ~/.claude/daemon/pty-pids/<short>.err                   miga de crash
 *
 * El hash de repo es sha256(realpath(cwd-al-arrancar)) recortado a 8
 * caracteres hex. ant usa el cwd para acotar los daemons a un solo árbol de
 * cwd a la vez; ccb conserva el mismo acotamiento para que un daemon de
 * `/repo-A` no intente adoptar jobs de `/repo-B`.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/socketPaths.ts`.
 */

import { createHash } from 'node:crypto'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/** Hash cacheado del realpath del cwd, para estabilidad entre sub-llamadas. */
let cachedRepoHash: string | undefined

function getTmpRoot(): string {
  // Termux tiene un default distinto a /tmp; se respeta.
  const termuxPrefix = process.env.PREFIX
  if (process.env.TERMUX_VERSION && termuxPrefix) {
    return join(termuxPrefix, 'tmp')
  }
  return tmpdir() || '/tmp'
}

function getRepoHash(): string {
  if (cachedRepoHash) return cachedRepoHash
  cachedRepoHash = createHash('sha256')
    .update(resolve(process.cwd()))
    .digest('hex')
    .slice(0, 8)
  return cachedRepoHash
}

/** ant He() — `<tmp>/cc-daemon-<uid>/<hash-repo>` */
export function getDaemonScopeDir(): string {
  const uid = process.getuid?.() ?? 0
  return join(getTmpRoot(), `cc-daemon-${uid}`, getRepoHash())
}

/** ant oU() — ruta del socket de control. */
export function getControlSocketPath(): string {
  if (process.platform === 'win32') {
    // Windows usa un named pipe; ant tiene WV8('control'). Aquí se
    // conserva el mismo nombre; el soporte completo del daemon en Windows
    // queda fuera de alcance de esta iteración (disponibilidad de
    // Bun.Terminal + el modelo de señales difiere).
    return `\\\\.\\pipe\\ccb-control`
  }
  return join(getDaemonScopeDir(), 'control.sock')
}

/** Ruta del socket PTY para un id corto de job dado. */
export function getPtySocketPath(short: string): string {
  return join(getDaemonScopeDir(), `${short}.pty.sock`)
}

/**
 * Ruta del socket de rendezvous (control), dado un directorio de job.
 *
 * ant corre DOS sockets por worker bg: el socket PTY lleva los bytes de
 * pantalla (attach/replay), y un socket de rendezvous SEPARADO lleva el
 * canal de control fuera de banda (ant 4291.js — servidor del lado worker
 * atado a `CLAUDE_BG_RENDEZVOUS_SOCK`; ant 5016.js `naK` — cliente del lado
 * supervisor). El layout de ant es `<scope>/rv/<short>.sock`; ccb conserva
 * su convención plana existente por-directorio-de-job (el socket PTY es
 * `<jobDir>/pty.sock` — ver `spawnPty.ts`), así que el socket de rendezvous
 * queda junto a él como `<jobDir>/rv.sock`.
 *
 * El socket de rendezvous es lo que permite al REPL bg INTERNO empujar
 * tramas `state` / `done` / `heartbeat` autoritativas al supervisor del
 * daemon sin dar la vuelta por disco. ccb antes no tenía ese canal — el
 * REPL interno está sandboxed dentro del PTY (stdout son bytes de
 * pantalla), así que el daemon sólo podía inferir vivacidad de las tramas
 * de control heartbeat del PTY y adivinar el desenlace del turno con un
 * regex sobre el texto del asistente (`useBgFleetStateSync`).
 */
export function getRendezvousSocketPath(jobDir: string): string {
  return join(jobDir, 'rv.sock')
}

/** Ruta del socket de claim (usado por el handshake de attach). */
export function getClaimSocketPath(short: string): string {
  return join(getDaemonScopeDir(), `${short}.claim.sock`)
}

/**
 * Directorio ~/.claude/daemon para archivos de miga. Respeta
 * CLAUDE_CONFIG_HOME por consistencia con bgWorkerRegistry.getJobsRoot()
 * y para que los tests unitarios puedan aislarse apuntando la variable de
 * entorno a un tmpdir.
 */
export function getDaemonHomeDir(): string {
  const root = process.env.CLAUDE_CONFIG_HOME
  return root ? join(root, 'daemon') : join(homedir(), '.claude', 'daemon')
}

/** Directorio ~/.claude/daemon/pty-pids. */
export function getPtyPidsDir(): string {
  return join(getDaemonHomeDir(), 'pty-pids')
}
