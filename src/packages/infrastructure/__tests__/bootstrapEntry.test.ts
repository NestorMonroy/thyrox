import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

const ENTRY = join(import.meta.dir, '..', 'bin', 'bootstrap.ts')

/** Corre el entrypoint con un Podman que no existe: los casos de aquí rehúsan antes de invocarlo. */
async function runEntry(stdin: string, environment: Record<string, string> = {}) {
  const child = Bun.spawn(['bun', ENTRY], {
    stdin: new TextEncoder().encode(stdin),
    stdout: 'pipe',
    stderr: 'pipe',
    env: { PATH: process.env.PATH ?? '', THYROX_TOOLCHAIN_PODMAN_BIN: '/nonexistent/podman', ...environment },
  })
  const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { stdout, stderr, exitCode }
}

const POSTGRES = {
  name: 'thyrox-postgres',
  image: 'docker.io/pgvector/pgvector:0.8.0-pg16',
  network: { mode: 'named', name: 'thyrox-infra' },
  secrets: [{ secret: 'thyrox-postgres-password', target: 'postgres-password', valueFrom: 'THYROX_INFRA_POSTGRES_PASSWORD' }],
}

describe('infrastructure-bootstrap', () => {
  test('sin el valor del secreto declarado sale 2 y nombra la variable', async () => {
    const result = await runEntry(JSON.stringify([POSTGRES]))
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('THYROX_INFRA_POSTGRES_PASSWORD')
  })

  test('una entrada que no es un arreglo de declaraciones sale 2 y lo dice', async () => {
    const result = await runEntry('{"name":"x"}')
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('arreglo')
  })

  test('una entrada que no es JSON sale 2', async () => {
    const result = await runEntry('no es json')
    expect(result.exitCode).toBe(2)
  })
})
