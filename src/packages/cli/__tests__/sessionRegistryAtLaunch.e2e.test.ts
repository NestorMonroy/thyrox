/**
 * TASK-THYROX-0503 — el alta de la sesión al arrancar `bin/cli`, de punta a
 * punta: un proceso REAL (no una llamada en el mismo proceso de test), con
 * `--provider recorded` y `THYROX_CONFIG_DIR` propio para no tocar el
 * registro real del contenedor.
 *
 * Mientras el proceso vive, `sessions/<pid>.json` existe y su `sessionId`
 * es el mismo que el del transcript (el que `session_start` anuncia) — no
 * el id de arranque de `@thyrox/app-host`, que es otro hasta que
 * `adoptLoopSessionId` los une. Al salir, el archivo desaparece.
 *
 * `--chat` espera en stdin entre turnos: ese hueco es la ventana natural
 * para sondear "vivo". `-p` no tiene ese hueco —lee su prompt posicional y
 * corre un único turno—, así que la ventana la abre un `tool_use` real de
 * `Bash` con `sleep`: mientras el comando corre, el proceso sigue vivo con
 * el registro ya publicado y ya adoptado (la adopción, sin E/S de red, se
 * asienta en milisegundos — muy por debajo del margen del `sleep`).
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

describe('bin/cli registra su sesión al arrancar (TASK-THYROX-0503)', () => {
  test('--chat: el registro nace con el sessionId del transcript y se retira al cerrar stdin', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'chat-registro-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    const tr = join(cwd, 'tr')
    writeFileSync(join(cwd, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: usage, content: [{ type: 'text', text: 'ok' }] },
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
      expect(readRecord(pidFile).pid).toBe(proc.pid)

      // El transcript aparece justo tras `session_start`, en el mismo turno
      // síncrono que lo emite (`loop/index.ts`): su nombre de archivo ES el
      // sessionId real, la referencia contra la que se mide el registro.
      await waitUntil(() => existsSync(tr) && readdirSync(tr).length === 1)
      const sessionId = readdirSync(tr)[0]!.replace(/\.jsonl$/, '')
      await waitUntil(() => readRecord(pidFile).sessionId === sessionId)

      // Cerrar stdin termina la conversación (`stdinLines()` agota su fuente)
      // y el proceso sale solo — sin `/salir`, como describe el ítem.
      await proc.stdin.end()
      const exitCode = await proc.exited
      expect(exitCode).toBe(0)
      expect(existsSync(pidFile)).toBe(false)
    } finally {
      proc.kill()
    }
  })

  test('-p: el registro nace, vive y queda adopted mientras corre una herramienta real, y se retira al salir', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'print-registro-'))
    const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
    writeFileSync(join(cwd, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: usage,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'sleep 1' } }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: usage, content: [{ type: 'text', text: 'listo' }] },
    ]))

    const proc = Bun.spawn(
      ['bun', 'run', BIN, '-p', 'hola', '--provider', 'recorded', '--grabacion', join(cwd, 'turnos.json'),
        '--no-session-persistence', '--output-format', 'json'],
      { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', env: { ...process.env, THYROX_CONFIG_DIR: cfg } },
    )
    try {
      const pidFile = join(cfg, 'sessions', `${proc.pid}.json`)
      // El proceso sigue vivo aquí: el `sleep 1` de la herramienta real
      // todavía no terminó cuando el registro ya se publicó.
      await waitUntil(() => existsSync(pidFile))
      const initial = readRecord(pidFile)
      expect(initial.pid).toBe(proc.pid)

      // La adopción (`switchSession` al recibir `session_start`) reescribe
      // `sessionId` sobre el mismo archivo: se sondea el cambio, no un
      // plazo fijo — sigue vivo (el `sleep` no ha terminado) mientras dura.
      await waitUntil(() => readRecord(pidFile).sessionId !== initial.sessionId)
      const adopted = readRecord(pidFile)

      const stdoutText = await new Response(proc.stdout).text()
      const exitCode = await proc.exited
      expect(exitCode).toBe(0)
      expect(existsSync(pidFile)).toBe(false)

      const result = JSON.parse(stdoutText.trim().split('\n').at(-1)!)
      expect(adopted.sessionId).toBe(result.session_id)
    } finally {
      proc.kill()
    }
  })
})
