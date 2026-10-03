/**
 * Un consumidor no confía en el estado persistido de la infraestructura
 * (TASK-THYROX-0727): antes de usar Redis u Ollama pide a
 * `infrastructure_ensure` que reconcilie lo declarado, lo persistido y lo
 * que corre de verdad: tras un reinicio, Podman puede reportar `running` para
 * un contenedor cuyo proceso ya no existe.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  InfrastructureNotReadyError,
  localControlPlaneReadyCommand,
  requireInfrastructure,
  type InfrastructureEnsure,
} from '../infrastructureReadiness.js'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

function recordingEnsure(exitCode: number, stderr = ''): InfrastructureEnsure & { readonly calls: string[][] } {
  const calls: string[][] = []
  const ensure = async (containers: readonly string[]) => {
    calls.push([...containers])
    return { exitCode, stdout: '', stderr }
  }
  return Object.assign(ensure, { calls })
}

describe('requireInfrastructure', () => {
  test('reconcilia los contenedores pedidos y sigue si quedan sanos', async () => {
    const ensure = recordingEnsure(0)
    await requireInfrastructure(['thyrox-redis'], ensure)
    expect(ensure.calls).toEqual([['thyrox-redis']])
  })

  test('si la reconciliación no deja la infraestructura sana, rehúsa con su causa', async () => {
    const ensure = recordingEnsure(1, 'infrastructure_ensure: thyrox-redis: unhealthy')
    const error = await requireInfrastructure(['thyrox-redis'], ensure).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(InfrastructureNotReadyError)
    expect((error as InfrastructureNotReadyError).exitCode).toBe(1)
    expect((error as Error).message).toContain('thyrox-redis: unhealthy')
  })
})

describe('localControlPlaneReadyCommand', () => {
  // P0d: tras un reinicio, `infrastructure_ensure` a secas sale 3 ante el
  // desfase de locks. El consumidor pide `local_control_plane_ready`, que
  // recupera el motor y después converge; nunca el ensure directamente.
  test('corre bin/local_control_plane_ready del árbol con los contenedores como argumentos, nunca el ensure', async () => {
    const root = mkdtempSync(join(tmpdir(), 'readiness-'))
    roots.push(root)
    mkdirSync(join(root, 'bin'))
    const script = join(root, 'bin', 'local_control_plane_ready')
    writeFileSync(script, `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${root}/argv"\necho listo\nexit 0\n`)
    chmodSync(script, 0o755)
    const decoy = join(root, 'bin', 'infrastructure_ensure')
    writeFileSync(decoy, `#!/usr/bin/env bash\ntouch "${root}/ensure-called"\nexit 99\n`)
    chmodSync(decoy, 0o755)
    const result = await localControlPlaneReadyCommand(root)(['thyrox-redis', 'thyrox-ollama'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('listo')
    expect(readFileSync(join(root, 'argv'), 'utf8')).toBe('thyrox-redis\nthyrox-ollama\n')
    expect(existsSync(join(root, 'ensure-called'))).toBe(false)
  })
})
