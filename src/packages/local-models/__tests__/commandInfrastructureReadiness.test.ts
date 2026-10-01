/**
 * Los cuatro consumidores de infraestructura reconcilian antes de usarla
 * (TASK-THYROX-0727): `quantize` e `import` piden Redis antes de tomar su
 * lease global; `qualify` y `catalog declare` piden Ollama antes de hablarle.
 * Con la reconciliación fallida rehúsan con EXIT_REFUSED y la causa, sin
 * abrir el almacén ni contactar al servicio.
 */
import { describe, expect, test } from 'bun:test'

import { runCatalogCommand, type CommandContext } from '../catalogCommand.js'
import { EXIT_REFUSED } from '../commandOutput.js'
import { runImportCommand } from '../importCommand.js'
import type { InfrastructureEnsure } from '../infrastructureReadiness.js'
import { runQualifyCommand } from '../qualifyCommand.js'
import { runQuantizeCommand } from '../quantizeCommand.js'

const REVISION = 'a'.repeat(40)

function failingContext(): { context: CommandContext; calls: string[][]; errors: string[] } {
  const calls: string[][] = []
  const errors: string[] = []
  const ensure: InfrastructureEnsure = async containers => {
    calls.push([...containers])
    return { exitCode: 1, stdout: '', stderr: `infrastructure_ensure: ${containers.join(',')}: unhealthy` }
  }
  const context: CommandContext = {
    env: { THYROX_REDIS_URL: 'redis://127.0.0.1:1' },
    thyroxRoot: '/nonexistent-thyrox-root',
    output: { stdout: () => {}, stderr: line => { errors.push(line) } },
    now: () => new Date(0),
    ensureInfrastructure: ensure,
  }
  return { context, calls, errors }
}

describe('un consumidor reconcilia su infraestructura antes de usarla', () => {
  const cases: ReadonlyArray<readonly [string, string, (context: CommandContext) => Promise<number>]> = [
    ['quantize', 'thyrox-redis', context => runQuantizeCommand(['run', '--repository', 'Qwen/x', '--revision', REVISION, '--scratch-dir', '/tmp/s', '--run-dir', '/tmp/r'], context)],
    ['import', 'thyrox-redis', context => runImportCommand(['run', '--repository', 'Qwen/x', '--revision', REVISION, '--file', 'm.gguf', '--sha256', 'b'.repeat(64), '--scratch-dir', '/tmp/s', '--run-dir', '/tmp/r'], context)],
    ['qualify', 'thyrox-ollama', context => runQualifyCommand(['modelo'], context)],
    ['catalog declare', 'thyrox-ollama', context => runCatalogCommand(['declare', 'qwen:1'], context)],
  ]
  for (const [name, container, run] of cases) {
    test(`${name}: pide ${container} y rehúsa con la causa si no queda sano`, async () => {
      const { context, calls, errors } = failingContext()
      expect(await run(context)).toBe(EXIT_REFUSED)
      expect(calls).toEqual([[container]])
      expect(errors.join('\n')).toContain(`${container}: unhealthy`)
    })
  }
})
