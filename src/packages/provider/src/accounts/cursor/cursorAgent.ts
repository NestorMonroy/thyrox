/**
 * El proceso `cursor-agent` del anfitrión: se lanza con stdin cerrado, porque
 * con un descriptor en tubería espera entrada y no termina; un plazo lo
 * termina con SIGTERM y, si se declara, con un SIGKILL posterior. Su catálogo
 * de modelos se lee de `--list-models`, o de `--model --help` en las
 * versiones que no lo tienen.
 *
 * Porte de `omniroute: src/lib/providerModels/cursorAgent.ts` (MIT).
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

const DEFAULT_CATALOG_TIMEOUT_MS = 5000
const NOT_AUTHENTICATED = /Authentication required|Not logged in/i

export interface CursorAgentRun {
  stdout: string
  stderr: string
  code: number | null
  signal: NodeJS.Signals | null
}

export function runCursorAgent(binary: string, args: string[], timeoutMs: number, options: { sigkillFollowupMs?: number } = {}): Promise<CursorAgentRun> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      reject(error)
      return
    }
    let stdout = ''
    let stderr = ''
    let settled = false
    let sigkillTimer: ReturnType<typeof setTimeout> | undefined
    child.stdout!.setEncoding('utf8')
    child.stderr!.setEncoding('utf8')
    child.stdout!.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr!.on('data', (chunk: string) => {
      stderr += chunk
    })
    const killTimer = setTimeout(() => {
      child.kill('SIGTERM')
      // Nadie supervisa un proceso lanzado sin atención: si ignora SIGTERM, se mata.
      if (options.sigkillFollowupMs !== undefined) {
        sigkillTimer = setTimeout(() => {
          if (!settled) child.kill('SIGKILL')
        }, options.sigkillFollowupMs)
      }
    }, timeoutMs)
    const finish = () => {
      settled = true
      clearTimeout(killTimer)
      clearTimeout(sigkillTimer)
    }
    child.on('error', error => {
      finish()
      reject(error)
    })
    child.on('close', (code, signal) => {
      finish()
      resolve({ stdout, stderr, code, signal })
    })
  })
}

export interface CursorAgentLookup {
  /** Sin él, un binario fuera de las ubicaciones fijas no se busca en el PATH. */
  allowPathFallback?: boolean
  home?: string
  exists?: (path: string) => boolean
  path?: string
}

/** Las ubicaciones fijas primero: un servidor puede correr con un PATH que no incluye el bin del usuario. */
export function resolveCursorAgentBinary(lookup: CursorAgentLookup = {}): string | null {
  const exists = lookup.exists ?? existsSync
  const home = lookup.home ?? homedir()
  const candidates = [join(home, '.local', 'bin', 'cursor-agent'), '/root/.local/bin/cursor-agent', '/usr/local/bin/cursor-agent', '/usr/bin/cursor-agent', '/opt/homebrew/bin/cursor-agent']
  for (const candidate of candidates) if (exists(candidate)) return candidate
  if (lookup.allowPathFallback === false) return null
  for (const dir of (lookup.path ?? process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    const candidate = join(dir, 'cursor-agent')
    if (exists(candidate)) return candidate
  }
  return null
}

const SEGMENT_OVERRIDES: Readonly<Record<string, string>> = {
  gpt: 'GPT',
  xhigh: 'XHigh',
}

export function humanizeCursorModelId(id: string): string {
  if (id === 'auto') return 'Auto (Server Picks)'
  // Un sufijo dígito-guion-dígito es una versión: 4-7 se lee 4.7.
  return id
    .replace(/(\d+)-(\d+)(?=-|$)/g, '$1.$2')
    .split('-')
    .map(part => SEGMENT_OVERRIDES[part] ?? (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ')
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))]
}

export function parseCursorAgentModels(text: string): string[] {
  // Las versiones antiguas sólo lo publicaban en el error de `--model --help`.
  const legacy = text.match(/Available models:\s*([^\n]+)/)
  if (legacy) return uniqueIds(legacy[1]!.split(','))
  const header = /(?:^|\n)Available models\s*(?:\n|$)/.exec(text)
  if (!header) return []
  const ids: string[] = []
  for (const line of text.slice(header.index + header[0].length).split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('Tip:')) break
    const separator = trimmed.indexOf(' - ')
    if (separator > 0) ids.push(trimmed.slice(0, separator))
  }
  return uniqueIds(ids)
}

export interface CursorAgentModel {
  id: string
  name: string
  owned_by: 'cursor'
}

export async function fetchCursorAgentModels(options: { binary?: string; timeoutMs?: number; resolveBinary?: () => string | null } = {}): Promise<CursorAgentModel[]> {
  const binary = options.binary || (options.resolveBinary ?? resolveCursorAgentBinary)()
  const timeoutMs = options.timeoutMs ?? DEFAULT_CATALOG_TIMEOUT_MS
  if (!binary) throw new Error('cursor-agent binary not found. Install it (curl https://cursor.com/install -fsS | bash) so ~/.local/bin/cursor-agent exists, or pass a binary path explicitly.')
  const startedAt = Date.now()
  let run: CursorAgentRun
  try {
    run = await runCursorAgent(binary, ['--list-models'], timeoutMs)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') throw new Error(`cursor-agent binary not executable at ${binary}`)
    throw error
  }
  let combined = `${run.stdout}\n${run.stderr}`
  let ids = parseCursorAgentModels(combined)
  if (ids.length === 0 && !NOT_AUTHENTICATED.test(combined)) {
    const remainingMs = timeoutMs - (Date.now() - startedAt)
    if (remainingMs > 0) {
      run = await runCursorAgent(binary, ['--model', '--help'], remainingMs)
      combined = `${run.stdout}\n${run.stderr}`
      ids = parseCursorAgentModels(combined)
    }
  }
  if (ids.length === 0) {
    if (NOT_AUTHENTICATED.test(combined)) throw new Error("cursor-agent is not authenticated; run 'agent login' on this host")
    throw new Error("cursor-agent did not return a model catalog from 'agent --list-models'")
  }
  return ids.map(id => ({ id, name: humanizeCursorModelId(id), owned_by: 'cursor' as const }))
}
