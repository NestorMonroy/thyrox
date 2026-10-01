/**
 * TASK-THYROX-0450 — el buzón por socket de la sesión al arrancar `bin/cli`,
 * de punta a punta: un proceso REAL (no una llamada en el mismo proceso de
 * test), con `--provider recorded` y `THYROX_CONFIG_DIR` propio, igual que
 * `sessionRegistryAtLaunch.e2e.test.ts` — misma forma, otro eje.
 *
 * `feature('UDS_INBOX')` es un macro de `bun:bundle`: se enciende con la
 * bandera de línea de comando del propio `bun` (`--feature=UDS_INBOX`), el
 * mismo mecanismo que `scripts/dev.ts` ya usa para `BG_SESSIONS`
 * (`messagingInboxAtLaunch.ts`, docstring). `Bun.spawn` antepone esa
 * bandera al `run`.
 *
 * Mientras el proceso vive: el socket existe con modo 0600 dentro de un
 * directorio 0700, y `sessions/<pid>.json` publica `messagingSocketPath`
 * con esa misma ruta. Al salir (cierre de stdin, sin señal), el socket ya
 * no existe — lo cierra el `finally` de `runLoop`/`print.ts`, no un
 * handler de señal.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

const BIN = join(import.meta.dir, '..', 'src', 'entry', 'cli.tsx')
const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

/** Sondea `predicate` hasta que sea verdadera, o rinde tras `timeoutMs`. */
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

describe('bin/cli arranca el buzón de la sesión (TASK-THYROX-0450)', () => {
  test('--chat con UDS_INBOX: el socket existe con 0600/0700 mientras vive, sessions/<pid>.json publica su ruta, y desaparece al salir', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'chat-buzon-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    const tr = join(cwd, 'tr')
    writeFileSync(join(cwd, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage, content: [{ type: 'text', text: 'ok' }] },
    ]))

    const proc = Bun.spawn(
      ['bun', '--feature=UDS_INBOX', 'run', BIN, '--chat', '--provider', 'recorded', '--grabacion', join(cwd, 'turnos.json'),
        '--cwd', cwd, '--transcript-dir', tr, '--output-style', 'quiet'],
      { stdin: 'pipe', stdout: 'ignore', stderr: 'pipe', env: { ...process.env, THYROX_CONFIG_DIR: cfg } },
    )
    try {
      proc.stdin.write('hola\n')
      proc.stdin.flush()

      const pidFile = join(cfg, 'sessions', `${proc.pid}.json`)
      await waitUntil(() => existsSync(pidFile))
      await waitUntil(() => typeof readRecord(pidFile).messagingSocketPath === 'string')
      const socketPath = readRecord(pidFile).messagingSocketPath as string

      await waitUntil(() => existsSync(socketPath))
      const socketStat = statSync(socketPath)
      expect(socketStat.isSocket()).toBe(true)
      expect(socketStat.mode & 0o777).toBe(0o600)
      const dirStat = statSync(dirname(socketPath))
      expect(dirStat.mode & 0o777).toBe(0o700)

      await proc.stdin.end()
      const exitCode = await proc.exited
      expect(exitCode).toBe(0)
      expect(existsSync(pidFile)).toBe(false)
      expect(existsSync(socketPath)).toBe(false)
    } finally {
      proc.kill()
    }
  })

  test('--chat SIN la bandera --feature=UDS_INBOX: ningún socket se publica', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'chat-sin-buzon-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    const tr = join(cwd, 'tr')
    writeFileSync(join(cwd, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage, content: [{ type: 'text', text: 'ok' }] },
    ]))

    const proc = Bun.spawn(
      ['bun', 'run', BIN, '--chat', '--provider', 'recorded', '--grabacion', join(cwd, 'turnos.json'),
        '--cwd', cwd, '--transcript-dir', tr, '--output-style', 'quiet'],
      { stdin: 'pipe', stdout: 'ignore', stderr: 'pipe', env: { ...process.env, THYROX_CONFIG_DIR: cfg } },
    )
    try {
      proc.stdin.write('hola\n')
      proc.stdin.flush()
      const pidFile = join(cfg, 'sessions', `${proc.pid}.json`)
      await waitUntil(() => existsSync(pidFile))
      expect(readRecord(pidFile).messagingSocketPath).toBeUndefined()

      await proc.stdin.end()
      await proc.exited
    } finally {
      proc.kill()
    }
  })
})
