/**
 * Si un mensaje que llegó al buzón lo envió esta misma sesión: un proceso
 * hijo suyo que escribe en su propio buzón. Con ancestría verificada lo decide
 * la cadena de padres; en macOS, sin ella, un veredicto que recorre los
 * padres del par con `ps`; en Windows y siendo init, el token de hijo.
 *
 * Porte de `ye`, `Le`, `Ke`, `he`, `Me`, `Fe` y `Ne` (`chunk-yg53q7yp.js`) y
 * de `hfn` (`chunk-x5vr5vwm.js`) de 2.1.283.
 */
import { type CommandRunner, spawnCommand, startTokenCache } from './processIdentity.ts'

/** `Me`: cuántos veredictos se recuerdan. */
export const VERDICT_CACHE_LIMIT = 500
/** Profundidad del primer recorrido de padres, y la del segundo si el primero se quedó corto (`Fe`). */
const DEFAULT_WALK_DEPTH = 10
const EXTENDED_WALK_DEPTH = 32
const WALK_TIMEOUT_MS = 3000

export type Verdict = 'self' | 'not-self' | 'no-evidence'
export type AncestorWalk = { ancestors: number[]; readFailed: boolean; truncated: boolean }

/** `Le`: si `pid` está en la cadena; init nunca se reconoce como ancestro propio. */
export function ancestryIncludes(ancestry: unknown, pid: number = process.pid): boolean {
  if (pid === 1) return false
  return Array.isArray(ancestry) && ancestry.includes(pid)
}

/** `hfn`: los padres de `pid` con `ps`, hasta `maxDepth`, diciendo si falló o se cortó. */
export async function walkAncestors(pid: number, maxDepth: number = DEFAULT_WALK_DEPTH, run: CommandRunner = spawnCommand): Promise<AncestorWalk> {
  const script = `pid=${String(pid)}; for i in $(seq 1 ${maxDepth}); do ppid=$(ps -o ppid= -p $pid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ]; then echo FAIL; exit 0; fi; if [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then echo END; exit 0; fi; echo $ppid; pid=$ppid; done`
  const result = await run('sh', ['-c', script], { timeout: WALK_TIMEOUT_MS, env: process.env })
  const lines = (result.stdout ?? '').trim().split('\n').filter(Boolean)
  const last = lines.at(-1)
  return {
    ancestors: lines
      .filter(line => line !== 'END' && line !== 'FAIL')
      .map(line => Number.parseInt(line, 10))
      .filter(value => !Number.isNaN(value)),
    readFailed: result.code !== 0 || last === 'FAIL',
    truncated: result.code === 0 && last !== 'END' && last !== 'FAIL',
  }
}

/** `he`: veredictos recordados por `pid:inicio`, expulsando el menos usado. */
export class VerdictCache {
  readonly #verdicts = new Map<string, boolean>()

  constructor(private readonly limit: number = VERDICT_CACHE_LIMIT) {}

  lookup(key: string): boolean | undefined {
    const value = this.#verdicts.get(key)
    if (value !== undefined) {
      this.#verdicts.delete(key)
      this.#verdicts.set(key, value)
    }
    return value
  }

  remember(key: string, value: boolean): void {
    if (this.#verdicts.size >= this.limit) {
      const oldest = this.#verdicts.keys().next().value
      if (oldest !== undefined) this.#verdicts.delete(oldest)
    }
    this.#verdicts.set(key, value)
  }
}

export interface VerdictReaders {
  readStartToken: (pid: number) => Promise<string | undefined>
  readAncestors: (pid: number) => Promise<number[]>
}

/**
 * `Ne`: los padres se leen con un recorrido corto y, si se cortó sin llegar a
 * esta sesión, con uno largo; un recorrido que no llega y además falló o se
 * cortó no prueba nada, y lanza.
 */
export function createVerdictReaders(
  walk: (pid: number, maxDepth?: number) => Promise<AncestorWalk> = walkAncestors,
  ownPid: number = process.pid,
): VerdictReaders {
  return {
    readAncestors: async pid => {
      let result = await walk(pid)
      if (result.truncated && !result.readFailed && !result.ancestors.includes(ownPid)) result = await walk(pid, EXTENDED_WALK_DEPTH)
      if (!result.ancestors.includes(ownPid)) {
        if (result.readFailed) throw new Error('ancestry walk failed')
        if (result.truncated) throw new Error('ancestry walk truncated (maxDepth) above the prefix')
      }
      return result.ancestors
    },
    readStartToken: pid => startTokenCache.get(pid, { skipCache: true }),
  }
}

export const processVerdictReaders: VerdictReaders = createVerdictReaders()

export const verdictCache = new VerdictCache()

/**
 * `Ke`: si el proceso `pid` desciende de esta sesión. El veredicto sólo vale
 * si el inicio del par no cambió mientras se leían sus padres; si cambió, el
 * pid se recicló a mitad de la lectura y no se recuerda nada.
 */
export async function peerVerdict(
  pid: number | undefined,
  readers: VerdictReaders = processVerdictReaders,
  cache: VerdictCache = verdictCache,
  ownPid: number = process.pid,
): Promise<Verdict> {
  if (pid === undefined || !Number.isInteger(pid) || pid <= 0) return 'no-evidence'
  const readToken = async () => {
    try {
      return await readers.readStartToken(pid)
    } catch {
      return undefined
    }
  }
  const before = await readToken()
  if (before === undefined) return 'no-evidence'
  const key = `${pid}:${before}`
  const known = cache.lookup(key)
  if (known !== undefined) return known ? 'self' : 'not-self'
  let ancestors: number[]
  try {
    ancestors = await readers.readAncestors(pid)
  } catch {
    return 'no-evidence'
  }
  if ((await readToken()) !== before) return 'no-evidence'
  const isSelf = ownPid !== 1 && ancestors.includes(ownPid)
  cache.remember(key, isSelf)
  return isSelf ? 'self' : 'not-self'
}

export interface SelfSentInput {
  /** La cadena de padres del par, cuando la conexión la verificó. */
  selfSentAncestry?: number[]
  selfPid?: number
  verifiedPeerPid?: number
  childTokenPresented: boolean
  /** `unr`: si el modo de permisos exige decidir. */
  needsVerdict: boolean
  platform: string
  verdictOf?: (pid: number | undefined) => Promise<Verdict>
}

/** `ye`: si el mensaje lo envió esta sesión. */
export async function isSelfSent(input: SelfSentInput): Promise<boolean> {
  const selfPid = input.selfPid ?? process.pid
  if (input.selfSentAncestry !== undefined && selfPid !== 1) return ancestryIncludes(input.selfSentAncestry, selfPid)
  if (!input.needsVerdict) return false
  if (selfPid === 1 || input.platform === 'windows') return input.childTokenPresented
  if (input.platform !== 'macos') return false
  const verdict = await (input.verdictOf ?? (pid => peerVerdict(pid)))(input.verifiedPeerPid)
  return verdict === 'self' || (verdict === 'no-evidence' && input.childTokenPresented)
}
