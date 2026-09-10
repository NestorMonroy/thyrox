/**
 * Puerto de `ccnmt: packages/shell/src/genericProcessUtils.ts` (verbatim,
 * 100 % de sus 6 exports). Implementaciones agnósticas de plataforma para
 * los equivalentes de `ps`/`pgrep`/`kill -0` que el resto del árbol
 * necesita — probes de vivacidad, cadena de ancestros, hijos y el kill de
 * subárbol completo (proceso + descendientes) para el supervisor de
 * agentes en background.
 *
 * Dependencias: `./execFileNoThrow.ts` (hermano, ya portado —
 * `execFileNoThrowWithCwd`) y `./execFileNoThrowPortable.ts` (hermano, ya
 * portado — `execSyncWithDefaults`), más
 * `@thyrox/local-observability/debug.js` (`logForDebugging`, añadida como
 * dependencia del paquete en este pase).
 */
import { spawn } from 'node:child_process'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import {
  execFileNoThrowWithCwd,
} from './execFileNoThrow.ts'
import { execSyncWithDefaults } from './execFileNoThrowPortable.ts'

// Este archivo contiene implementaciones agnósticas de plataforma de
// comandos tipo `ps`. Al añadir código aquí, considerar:
// - Win32, porque `ps` dentro de cygwin/WSL puede no comportarse como se
//   espera, sobre todo al acceder a procesos del host.
// - Unix vs BSD-style `ps` tienen opciones distintas.

/**
 * Comprueba si un proceso con el PID dado está corriendo (probe con
 * señal 0).
 *
 * PID ≤ 1 devuelve false (0 es el grupo de proceso actual, 1 es init).
 *
 * Nota: `process.kill(pid, 0)` lanza EPERM cuando el proceso existe pero
 * es de otro usuario. Esto reporta tales procesos como NO corriendo, lo
 * cual es conservador para recuperación de locks (no robamos un lock
 * vivo).
 *
 * Usar `isPidAlive` en su lugar cuando se necesite la semántica opuesta —
 * p. ej. para probes de "¿este worker en background sigue ahí para
 * recibir una señal?" donde EPERM significa "sí, el proceso existe, sólo
 * que no es nuestro para matarlo".
 */
export function isProcessRunning(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Probe de vivacidad — como `isProcessRunning` pero trata EPERM como vivo.
 *
 * Usar cuando sólo importa si ALGO está en el pid (p. ej. supervisión de
 * workers en background, adopción de daemons). El caso de otro usuario
 * cuenta igual como vivo porque sólo se quiere saber "¿el pid sigue
 * sosteniendo?"; no se intenta tomar un lock.
 *
 * PID ≤ 1 devuelve false (0 es el grupo de proceso actual, 1 es init).
 */
export function isPidAlive(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Obtiene la cadena de procesos ancestros de un pid (hasta maxDepth
 * niveles).
 * @param pid - El PID de proceso inicial
 * @param maxDepth - Máximo de ancestros a obtener (default: 10)
 * @returns Array de PIDs ancestros, del padre inmediato al más lejano
 */
export async function getAncestorPidsAsync(
  pid: string | number,
  maxDepth = 10,
): Promise<number[]> {
  if (process.platform === 'win32') {
    const script = `
      $pid = ${String(pid)}
      $ancestors = @()
      for ($i = 0; $i -lt ${maxDepth}; $i++) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
        if (-not $proc -or -not $proc.ParentProcessId -or $proc.ParentProcessId -eq 0) { break }
        $pid = $proc.ParentProcessId
        $ancestors += $pid
      }
      $ancestors -join ','
    `.trim()

    const result = await execFileNoThrowWithCwd(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      { timeout: 3000 },
    )
    if (result.code !== 0 || !result.stdout?.trim()) {
      return []
    }
    return result.stdout
      .trim()
      .split(',')
      .filter(Boolean)
      .map(p => parseInt(p, 10))
      .filter(p => !isNaN(p))
  }

  // Para Unix, un comando de shell que sube por el árbol de procesos —
  // una sola invocación en vez de N llamadas secuenciales.
  const script = `pid=${String(pid)}; for i in $(seq 1 ${maxDepth}); do ppid=$(ps -o ppid= -p $pid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ] || [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then break; fi; echo $ppid; pid=$ppid; done`

  const result = await execFileNoThrowWithCwd('sh', ['-c', script], {
    timeout: 3000,
  })
  if (result.code !== 0 || !result.stdout?.trim()) {
    return []
  }
  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(p => parseInt(p, 10))
    .filter(p => !isNaN(p))
}

/**
 * Obtiene la línea de comando de un proceso dado.
 * @param pid - El PID del proceso
 * @returns La línea de comando, o null si no se encuentra
 * @deprecated Usar getAncestorCommandsAsync en su lugar
 */
export function getProcessCommand(pid: string | number): string | null {
  try {
    const pidStr = String(pid)
    const command =
      process.platform === 'win32'
        ? `powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${pidStr}\\").CommandLine"`
        : `ps -o command= -p ${pidStr}`

    const result = execSyncWithDefaults(command, { timeout: 1000 })
    return result ? result.trim() : null
  } catch {
    return null
  }
}

/**
 * Obtiene las líneas de comando de un proceso y sus ancestros en una sola
 * llamada.
 * @param pid - El PID de proceso inicial
 * @param maxDepth - Profundidad máxima a recorrer (default: 10)
 * @returns Array de strings de comando de la cadena de procesos
 */
export async function getAncestorCommandsAsync(
  pid: string | number,
  maxDepth = 10,
): Promise<string[]> {
  if (process.platform === 'win32') {
    const script = `
      $currentPid = ${String(pid)}
      $commands = @()
      for ($i = 0; $i -lt ${maxDepth}; $i++) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -ErrorAction SilentlyContinue
        if (-not $proc) { break }
        if ($proc.CommandLine) { $commands += $proc.CommandLine }
        if (-not $proc.ParentProcessId -or $proc.ParentProcessId -eq 0) { break }
        $currentPid = $proc.ParentProcessId
      }
      $commands -join [char]0
    `.trim()

    const result = await execFileNoThrowWithCwd(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      { timeout: 3000 },
    )
    if (result.code !== 0 || !result.stdout?.trim()) {
      return []
    }
    return result.stdout.split('\0').filter(Boolean)
  }

  // Para Unix: sube por el árbol de procesos y recolecta comandos.
  // Usa byte nulo como separador para tolerar comandos con saltos de línea.
  const script = `currentpid=${String(pid)}; for i in $(seq 1 ${maxDepth}); do cmd=$(ps -o command= -p $currentpid 2>/dev/null); if [ -n "$cmd" ]; then printf '%s\\0' "$cmd"; fi; ppid=$(ps -o ppid= -p $currentpid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ] || [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then break; fi; currentpid=$ppid; done`

  const result = await execFileNoThrowWithCwd('sh', ['-c', script], {
    timeout: 3000,
  })
  if (result.code !== 0 || !result.stdout?.trim()) {
    return []
  }
  return result.stdout.split('\0').filter(Boolean)
}

/**
 * Obtiene los PIDs hijos de un proceso dado.
 * @param pid - El PID del proceso padre
 * @returns Array de PIDs hijos, como números
 */
export function getChildPids(pid: string | number): number[] {
  try {
    const pidStr = String(pid)
    const command =
      process.platform === 'win32'
        ? `powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ParentProcessId=${pidStr}\\").ProcessId"`
        : `pgrep -P ${pidStr}`

    const result = execSyncWithDefaults(command, { timeout: 1000 })
    if (!result) {
      return []
    }
    return result
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(p => parseInt(p, 10))
      .filter(p => !isNaN(p))
  } catch {
    return []
  }
}

/** Tope duro de la enumeración `ps -A` del fallback de killProcessTree. */
const KILL_PS_ENUM_TIMEOUT_MS = 500

/**
 * Telemetría de fallo para killProcessTree — el equivalente local a
 * `tengu_bash_tool_kill_error` de ant, surfaced por el log de debug ya que
 * este paquete no trae cable a statsig. `stage` distingue un group-kill
 * fallido de una enumeración `ps` fallida. `errno` sólo se registra cuando
 * parece un errno real (mayúsculas, ESRCH/EPERM/…) para no loguear objetos
 * stringificados.
 */
function logKillFailure(stage: string, err: unknown): void {
  try {
    const errno =
      err && typeof err === 'object' && 'code' in err
        ? (err as NodeJS.ErrnoException).code
        : undefined
    const errorCode =
      typeof errno === 'string' && /^[A-Z][A-Z0-9_]*$/.test(errno)
        ? errno
        : undefined
    logForDebugging(
      `killProcessTree ${stage} failed: ${errorCode ?? String(err)}`,
    )
  } catch {
    // nunca dejar que la telemetría rompa el camino de kill
  }
}

/**
 * Enumera cada par (pid, ppid) del sistema con un único spawn de
 * `ps -A -o pid= -o ppid=` desde `/` (cwd `/` evita sostener un handle de
 * un directorio que puede estar siendo desmontado).
 */
function enumeratePidPairs(): Promise<string> {
  return new Promise((resolve, reject) => {
    let child
    try {
      child = spawn('ps', ['-A', '-o', 'pid=', '-o', 'ppid='], {
        cwd: '/',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    } catch (err) {
      reject(err)
      return
    }
    let out = ''
    child.stdout?.on('data', chunk => {
      out += chunk
    })
    child.once('error', reject)
    child.once('close', () => resolve(out))
  })
}

/**
 * Recolecta el conjunto completo de pids descendientes de `rootPid`
 * parseando la tabla (pid, ppid) del sistema entero. Corre el spawn de
 * `ps` contra un timeout de 500ms para que un `ps` colgado no bloquee el
 * camino de kill; en timeout o fallo de spawn devuelve un set vacío (el
 * group-kill por sí solo ya cubre el caso común).
 */
async function collectDescendantPids(rootPid: number): Promise<Set<number>> {
  let raw: string
  try {
    raw = await Promise.race([
      enumeratePidPairs(),
      new Promise<string>(resolve => {
        const t = setTimeout(() => resolve(''), KILL_PS_ENUM_TIMEOUT_MS)
        if (typeof t === 'object') t.unref()
      }),
    ])
  } catch (err) {
    logKillFailure('enum_spawn', err)
    return new Set()
  }

  // ppid -> [pids hijos]
  const childrenByParent = new Map<number, number[]>()
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s*$/)
    if (!m) continue
    const pid = Number(m[1])
    const ppid = Number(m[2])
    const existing = childrenByParent.get(ppid)
    if (existing) existing.push(pid)
    else childrenByParent.set(ppid, [pid])
  }

  const descendants = new Set<number>()
  const queue = [rootPid]
  while (queue.length > 0) {
    const cur = queue.shift() as number
    for (const child of childrenByParent.get(cur) ?? []) {
      // pid > 1 protege init; salta la raíz misma y ya vistos.
      if (child > 1 && child !== rootPid && !descendants.has(child)) {
        descendants.add(child)
        queue.push(child)
      }
    }
  }
  return descendants
}

async function killProcessTreeUnix(pid: number, signal: string): Promise<void> {
  // Recolecta descendientes ANTES de matar — una vez muerto el grupo, la
  // tabla de `ps` ya no muestra los hijos, así que procesos escapados
  // (re-parented) no podrían recolectarse después.
  const descendants = await collectDescendantPids(pid)

  // 1. Group kill — el hijo se lanzó con `detached: true` (bashProvider),
  //    así que lidera su propio grupo de proceso; `kill(-pid)` recoge todo
  //    el grupo atómicamente en una sola syscall. Cubre la gran mayoría.
  try {
    process.kill(-pid, signal)
  } catch (err) {
    // Cae a matar al líder directamente, y reporta salvo que el proceso
    // ya no estuviera (ESRCH es esperado en una carrera de salida normal).
    try {
      process.kill(pid, signal)
    } catch {
      // el líder ya se había ido
    }
    if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
      logKillFailure('group_kill', err)
    }
  }

  // 2. Limpia cualquier descendiente que escapó del grupo (p. ej. daemons
  //    doble-forkeados que llamaron setsid). Best-effort; pids ausentes
  //    están bien.
  for (const child of descendants) {
    try {
      process.kill(child, signal)
    } catch {
      // ya se había ido
    }
  }
}

/**
 * Mata robustamente un proceso y todo su subárbol.
 *
 * En Unix usa group kill (`process.kill(-pid)`) como mecanismo primario —
 * atómico, una sola syscall, y correcto porque los procesos bash se lanzan
 * con `detached: true` así que el hijo es líder de su propio grupo — con
 * un barrido de descendientes derivado de `ps` como fallback para
 * escapados re-parented. En Windows no hay process groups; se recorre
 * `getChildPids` recursivamente y se señaliza cada pid.
 *
 * Fire-and-forget: la rechazo async se traga. Callers que usaban
 * `tree-kill(pid, 'SIGKILL')` pueden migrar a esto para el fast path de
 * group-kill y la telemetría de fallo.
 */
export function killProcessTree(
  pid: number,
  signal: NodeJS.Signals | string = 'SIGKILL',
): void {
  // PID <= 1 protege el grupo actual (0) e init (1).
  if (!Number.isInteger(pid) || pid <= 1) return

  if (process.platform === 'win32') {
    // No hay process groups en Windows: recorre hijos en profundidad y
    // señaliza cada uno. getChildPids es síncrono (pgrep/CIM), se recurre
    // inline.
    const killRec = (p: number): void => {
      for (const child of getChildPids(p)) {
        if (child > 1 && child !== p) killRec(child)
      }
      try {
        process.kill(p, signal)
      } catch {
        // ya se había ido
      }
    }
    try {
      killRec(pid)
    } catch (err) {
      logKillFailure('win_tree', err)
    }
    return
  }

  void killProcessTreeUnix(pid, signal).catch(() => {})
}
