/**
 * TASK-THYROX-0505 — `/rename <nombre>` del chat de `bin/cli`, de punta a
 * punta: proceso REAL con `--provider recorded` y `THYROX_CONFIG_DIR`
 * propio, misma forma que `sessionRegistryAtLaunch.e2e.test.ts`.
 *
 * Medido contra 2.1.283 antes de escribir (`_references/claude-code-bin/
 * 2.1.283/bunfs-root/`): el comando `rename` (`chunk-csayct82.js`) llama a
 * `LTn` (`chunk-myby092r.js`) vía su variante `local`
 * (`chunk-sn2j4wz5.js`) — la que corresponde a un CLI sin Ink, como este
 * árbol. `LTn` escribe con `ARt(n,"user",…)` y arma "Session renamed to: X"
 * ("... (\"Y\" is held by another live session on this machine)" si cede,
 * "That name is empty once invisible characters are removed. Usage:
 * /rename <name>" si el nombre saneado queda vacío). El detalle completo —
 * las dos divergencias declaradas (sin argumento no genera nombre por LLM;
 * el aviso a correspondientes es inerte sin mensajería UDS portada)— vive en
 * el docstring de `renameCurrentSession`,
 * `@thyrox/app-host/runtime/sessionRegistryAtLaunch.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BIN = join(import.meta.dir, '..', 'src', 'entry', 'cli.tsx')
const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

async function waitUntil(predicate: () => boolean, timeoutMs = 10000, stepMs = 20): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('tiempo agotado esperando la condición')
    await Bun.sleep(stepMs)
  }
}

function readRecord(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function writeSingleTurn(cwd: string): string {
  const path = join(cwd, 'turnos.json')
  writeFileSync(path, JSON.stringify([
    { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage, content: [{ type: 'text', text: 'ok' }] },
  ]))
  return path
}

/**
 * Bombea `stdout` a un buffer de líneas SIN cerrar el stream, para poder leer
 * lo que el proceso ya escribió y seguir escribiéndole por `stdin` después.
 * `new Response(stream).text()` no sirve aquí: bloquea hasta EOF, es decir
 * hasta que el proceso salga — y `/rename` hay que leerlo con el proceso
 * todavía vivo, antes de que al salir retire `sessions/<pid>.json`.
 */
function pumpLines(readable: ReadableStream<Uint8Array>): { lines: () => string[] } {
  let buffer = ''
  const reader = readable.getReader()
  const decoder = new TextDecoder()
  void (async () => {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
    }
  })()
  return { lines: () => buffer.split('\n') }
}

/** Arranca un `--chat` con un único turno grabado y espera su pid file. */
function spawnChat(cwd: string, cfg: string, extraArgs: string[] = [], env: Record<string, string | undefined> = {}) {
  return Bun.spawn(
    ['bun', 'run', BIN, '--chat', '--provider', 'recorded', '--grabacion', writeSingleTurn(cwd),
      '--cwd', cwd, '--transcript-dir', join(cwd, 'tr'), '--output-style', 'quiet', ...extraArgs],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', env: { ...process.env, THYROX_CONFIG_DIR: cfg, ...env } },
  )
}

describe('bin/cli: /rename en el chat (TASK-THYROX-0505)', () => {
  test('/rename foo escribe name/nameSource en sessions/<pid>.json y responde "Session renamed to: foo"', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'chat-rename-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    const proc = spawnChat(cwd, cfg)
    const out = pumpLines(proc.stdout)
    try {
      const pidFile = join(cfg, 'sessions', `${proc.pid}.json`)
      await waitUntil(() => existsSync(pidFile))

      proc.stdin.write('hola\n')
      proc.stdin.flush()
      await waitUntil(() => existsSync(join(cwd, 'tr')))

      proc.stdin.write('/rename foo\n')
      proc.stdin.flush()
      await waitUntil(() => out.lines().includes('Session renamed to: foo'))

      const record = readRecord(pidFile)
      expect(record.name).toBe('foo')
      expect(record.nameSource).toBe('user')

      await proc.stdin.end()
      await proc.exited
      expect(existsSync(pidFile)).toBe(false)
    } finally {
      proc.kill()
    }
  })

  test('/rename sin argumento muestra el nombre actual (divergencia declarada: no genera con el modelo)', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'chat-rename-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    const proc = spawnChat(cwd, cfg, ['--name', 'ya-puesto'])
    const out = pumpLines(proc.stdout)
    try {
      const pidFile = join(cfg, 'sessions', `${proc.pid}.json`)
      await waitUntil(() => existsSync(pidFile) && readRecord(pidFile).name === 'ya-puesto')

      proc.stdin.write('hola\n')
      proc.stdin.flush()
      await waitUntil(() => existsSync(join(cwd, 'tr')))

      proc.stdin.write('/rename\n')
      proc.stdin.flush()
      await waitUntil(() => out.lines().includes('Session is named: ya-puesto. Usage: /rename <name>'))

      // sin escritura nueva: sigue con la fuente con la que arrancó
      expect(readRecord(pidFile).nameSource).toBe('user')

      await proc.stdin.end()
      await proc.exited
    } finally {
      proc.kill()
    }
  })

  test('/rename con sólo caracteres invisibles: mensaje verbatim de la referencia, sin escribir', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'chat-rename-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    const proc = spawnChat(cwd, cfg)
    const out = pumpLines(proc.stdout)
    try {
      const pidFile = join(cfg, 'sessions', `${proc.pid}.json`)
      await waitUntil(() => existsSync(pidFile))
      const before = readRecord(pidFile)

      proc.stdin.write('hola\n')
      proc.stdin.flush()
      await waitUntil(() => existsSync(join(cwd, 'tr')))

      proc.stdin.write('/rename \u0007\u0007\u0007\n')
      proc.stdin.flush()
      await waitUntil(() => out.lines().includes('That name is empty once invisible characters are removed. Usage: /rename <name>'))

      const after = readRecord(pidFile)
      expect(after.name).toBe(before.name)
      expect(after.nameSource).toBe(before.nameSource)

      await proc.stdin.end()
      await proc.exited
    } finally {
      proc.kill()
    }
  })

  test('/rename al nombre de una sesión viva cede a "<nombre>-adjetivo-sustantivo" con nameSource collision (uniqueness on)', async () => {
    const cwd1 = mkdtempSync(join(tmpdir(), 'chat-rename-'))
    const cwd2 = mkdtempSync(join(tmpdir(), 'chat-rename-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    const flags = { THYROX_FEATURE_FLAGS: JSON.stringify({ tengu_session_name_uniqueness: true }) }

    const holder = spawnChat(cwd1, cfg, ['--name', 'shared'], flags)
    const guest = spawnChat(cwd2, cfg, [], flags)
    const guestOut = pumpLines(guest.stdout)
    try {
      const holderPidFile = join(cfg, 'sessions', `${holder.pid}.json`)
      const guestPidFile = join(cfg, 'sessions', `${guest.pid}.json`)
      await waitUntil(() => existsSync(holderPidFile) && readRecord(holderPidFile).name === 'shared')
      await waitUntil(() => existsSync(guestPidFile))

      guest.stdin.write('hola\n')
      guest.stdin.flush()
      await waitUntil(() => existsSync(join(cwd2, 'tr')))

      guest.stdin.write('/rename shared\n')
      guest.stdin.flush()
      await waitUntil(() => readRecord(guestPidFile).nameSource === 'collision')

      const record = readRecord(guestPidFile)
      expect(typeof record.name).toBe('string')
      expect(record.name as string).toMatch(/^shared-[a-z]+-[a-z]+$/)

      await waitUntil(() => guestOut.lines().some(l =>
        l.startsWith(`Session renamed to: ${record.name} `) && l.includes('"shared" is held by another live session on this machine'),
      ))

      await guest.stdin.end()
      await guest.exited
    } finally {
      holder.kill()
      guest.kill()
    }
  })
})
