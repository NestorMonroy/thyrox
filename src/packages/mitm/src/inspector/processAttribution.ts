/**
 * A qué proceso pertenece una conexión entrante (Linux), para el inspector.
 *
 * El puerto efímero del *cliente* lleva, por `/proc/net/tcp{,6}`, al inodo de
 * su socket, y ese inodo, recorriendo `/proc/<pid>/fd`, al proceso que lo
 * tiene abierto. Una caché de un segundo acota el coste del recorrido bajo
 * carga. Fuera de Linux devuelve `null`: haría falta `lsof` o
 * `GetExtendedTcpTable`. Nunca bloquea la captura: cualquier fallo es `null`.
 *
 * Porte de `omniroute: src/mitm/inspector/processAttribution.ts` (MIT).
 */
import fs from 'node:fs'

const IS_LINUX = process.platform === 'linux'
const CACHE_TTL_MS = 1000
const cache = new Map<number, { value: ProcessInfo | null; expires: number }>()

export interface ProcessInfo {
  pid: number
  processName: string
}

/**
 * El inodo del socket cuyo puerto local es `localPort`, leído del contenido
 * de `/proc/net/tcp`; `null` sin fila. La columna `local_address` es
 * `HEXIP:HEXPORT` y el inodo, la décima columna.
 */
export function parseProcNetTcpForInode(content: string, localPort: number): string | null {
  const lines = content.split('\n')
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.trim().split(/\s+/)
    if (cols.length < 10) continue
    const portHex = cols[1]?.split(':')[1]
    if (!portHex) continue
    const port = parseInt(portHex, 16)
    if (Number.isNaN(port)) continue
    if (port === localPort) return cols[9]!
  }
  return null
}

/** El PID y el nombre del proceso cuyo socket usa `localPort`, si se puede saber. */
export function attributeProcess(localPort: number): ProcessInfo | null {
  if (!IS_LINUX) return null
  const now = Date.now()
  const hit = cache.get(localPort)
  if (hit && hit.expires > now) return hit.value

  let result: ProcessInfo | null = null
  try {
    const inode = findInode(localPort)
    if (inode) {
      const pid = findPidByInode(inode)
      if (pid) result = { pid, processName: readProcessName(pid) }
    }
  } catch {
    result = null
  }
  cache.set(localPort, { value: result, expires: now + CACHE_TTL_MS })
  return result
}

function findInode(localPort: number): string | null {
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    try {
      const inode = parseProcNetTcpForInode(fs.readFileSync(file, 'utf8'), localPort)
      if (inode && inode !== '0') return inode
    } catch {
      // El archivo puede no existir (sin tcp6): se sigue con el otro.
    }
  }
  return null
}

function findPidByInode(inode: string): number | null {
  const target = `socket:[${inode}]`
  let pids: string[]
  try {
    pids = fs.readdirSync('/proc').filter(entry => /^\d+$/.test(entry))
  } catch {
    return null
  }
  for (const pid of pids) {
    try {
      for (const fd of fs.readdirSync(`/proc/${pid}/fd`)) {
        try {
          if (fs.readlinkSync(`/proc/${pid}/fd/${fd}`) === target) return Number(pid)
        } catch {
          // El descriptor desapareció a mitad del recorrido.
        }
      }
    } catch {
      // El proceso terminó o no se puede leer.
    }
  }
  return null
}

function readProcessName(pid: number): string {
  try {
    return fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}
