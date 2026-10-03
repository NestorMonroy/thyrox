/**
 * TASK-THYROX-0324 parte C: `setCwd` emite `tengu_shell_set_cwd` sin
 * consultar NODE_ENV. El ejecutable 2.1.283 (`Ist`, chunk-csayct82.js) lo
 * emite siempre, sólo dentro de try/catch; la rama `!== 'test'` era conducta
 * que existía únicamente bajo `bun test`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, realpathSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  getLocalObservability,
  installLocalObservability,
} from '@thyrox/local-observability'
import { setCwd as execSetCwd } from '../exec.js'
import { setCwd as shellSetCwd } from '../Shell.js'

type Recorded = { name: string; metadata: unknown }

const original = getLocalObservability()

// Inyecta un logger que registra los eventos que antes decidía NODE_ENV.
function recordEvents(): Recorded[] {
  const events: Recorded[] = []
  installLocalObservability({
    logger: {
      ...original.logger,
      event: (name: string, metadata?: unknown) => {
        events.push({ name, metadata })
      },
    },
  })
  return events
}

afterEach(() => installLocalObservability(original))

describe('setCwd emite telemetría sin ramificar por NODE_ENV', () => {
  test('exec.setCwd registra tengu_shell_set_cwd bajo NODE_ENV=test', () => {
    expect(process.env.NODE_ENV).toBe('test')
    const events = recordEvents()
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'cwd-exec-')))
    execSetCwd({ setCwd: () => {} } as never, dir)
    expect(events.filter(e => e.name === 'tengu_shell_set_cwd')).toEqual([
      { name: 'tengu_shell_set_cwd', metadata: { success: true } },
    ])
  })

  test('Shell.setCwd registra tengu_shell_set_cwd bajo NODE_ENV=test', () => {
    const events = recordEvents()
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'cwd-shell-')))
    shellSetCwd(dir)
    expect(events.filter(e => e.name === 'tengu_shell_set_cwd')).toEqual([
      { name: 'tengu_shell_set_cwd', metadata: { success: true } },
    ])
  })
})
