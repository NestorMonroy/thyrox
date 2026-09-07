/**
 * La puerta de lectura de `storage` (`bin/storage.ts`).
 *
 * Cada caso construye su propio estado con los ESCRITORES reales del
 * paquete (`FileTranscriptStore`, `FileSessionMetadataStore`,
 * `BackendArtifactStore`, `appendTaskOutput`) — nunca a mano — así que un
 * verde aquí confirma que la puerta lee lo que el mecanismo real escribió,
 * no lo que el test imaginó que escribiría.
 *
 * `getProjectDir` (sessionPaths.ts) memoiza SÓLO por el `cwd` que recibe,
 * ignorando `CLAUDE_CONFIG_DIR` — por eso cada caso usa un `project` propio
 * (`mkdtempSync`): si dos casos compartieran cwd con estados distintos, el
 * segundo leería la caché del primero.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  BackendArtifactStore,
  FileSessionMetadataStore,
  FileTranscriptStore,
  LocalFileStorageBackend,
} from '../../src/index.ts'
import { getProjectDir, setOriginalCwd, setSessionId } from '../../src/sessionPaths.ts'
import { appendTaskOutput, flushTaskOutput } from '../../src/task/diskOutput.ts'
import { main } from '../storage.ts'

const backend = new LocalFileStorageBackend()

function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `storage-cli-${prefix}-`))
}

/** Captura stdout/stderr sin tocar el terminal de la suite (mismo patrón
 * que `harness/__tests__/premisesCli.test.ts`). */
async function run(argv: string[]) {
  const out: string[] = []
  const err: string[] = []
  const so = process.stdout.write.bind(process.stdout)
  const se = process.stderr.write.bind(process.stderr)
  process.stdout.write = ((s: string) => { out.push(String(s)); return true }) as typeof process.stdout.write
  process.stderr.write = ((s: string) => { err.push(String(s)); return true }) as typeof process.stderr.write
  try {
    const code = await main(argv)
    return { code, out: out.join(''), err: err.join('') }
  } finally {
    process.stdout.write = so
    process.stderr.write = se
  }
}

const envSnapshot = { CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR, THYROX_ENV_FILE: process.env.THYROX_ENV_FILE }
afterEach(() => {
  if (envSnapshot.CLAUDE_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = envSnapshot.CLAUDE_CONFIG_DIR
  if (envSnapshot.THYROX_ENV_FILE === undefined) delete process.env.THYROX_ENV_FILE
  else process.env.THYROX_ENV_FILE = envSnapshot.THYROX_ENV_FILE
})

describe('--help / subcomando desconocido', () => {
  test('sin subcomando rehusa con exit 2 e imprime la ayuda', async () => {
    const r = await run([])
    expect(r.code).toBe(2)
    expect(r.out).toContain('SÓLO LECTURA')
  })

  test('--help imprime la ayuda con exit 0', async () => {
    const r = await run(['--help'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('sessions')
  })

  test('subcomando desconocido rehusa con exit 2', async () => {
    const r = await run(['inventado'])
    expect(r.code).toBe(2)
    expect(r.err).toContain('no es un subcomando')
  })
})

describe('sessions', () => {
  test('directorio ausente: 0 sesiones, nombra la ruta que miró', async () => {
    const stateRoot = tmp('state')
    const project = tmp('project')
    const r = await run(['sessions', '--state-root', stateRoot, '--project', project])
    expect(r.code).toBe(0)
    expect(r.out).toContain('sesiones: 0')
    expect(r.out).toContain(stateRoot)
  })

  test('lista los ids reales escritos por FileTranscriptStore', async () => {
    const stateRoot = tmp('state')
    const project = tmp('project')
    process.env.CLAUDE_CONFIG_DIR = stateRoot
    const dir = getProjectDir(project)
    const ts = new FileTranscriptStore(backend, dir)
    await ts.appendSessionEvent('sess-1', '{"a":1}\n')
    await ts.appendSessionEvent('sess-2', '{"b":2}\n')

    const r = await run(['sessions', '--state-root', stateRoot, '--project', project])
    expect(r.code).toBe(0)
    expect(r.out).toContain('sesiones: 2')
    expect(r.out).toContain('sess-1')
    expect(r.out).toContain('sess-2')
  })
})

describe('transcript', () => {
  test('sin id de sesión rehusa con exit 2', async () => {
    const r = await run(['transcript'])
    expect(r.code).toBe(2)
    expect(r.err).toContain('Falta el id de sesión')
  })

  test('sesión ausente: exit 1, no inventa contenido', async () => {
    const stateRoot = tmp('state')
    const project = tmp('project')
    const r = await run(['transcript', 'no-existe', '--state-root', stateRoot, '--project', project])
    expect(r.code).toBe(1)
    expect(r.err).toContain('no existe')
  })

  test('imprime los eventos reales, y --tail acota', async () => {
    const stateRoot = tmp('state')
    const project = tmp('project')
    process.env.CLAUDE_CONFIG_DIR = stateRoot
    const dir = getProjectDir(project)
    const ts = new FileTranscriptStore(backend, dir)
    await ts.appendSessionEvent('sess-1', '{"turno":1}\n')
    await ts.appendSessionEvent('sess-1', '{"turno":2}\n')
    await ts.appendSessionEvent('sess-1', '{"turno":3}\n')

    const full = await run(['transcript', 'sess-1', '--state-root', stateRoot, '--project', project])
    expect(full.code).toBe(0)
    expect(full.out).toContain('"turno":1')
    expect(full.out).toContain('"turno":3')
    expect(full.out).toContain('eventos: 3 de 3')

    const tail = await run(['transcript', 'sess-1', '--state-root', stateRoot, '--project', project, '--tail', '1'])
    expect(tail.code).toBe(0)
    expect(tail.out).not.toContain('"turno":1')
    expect(tail.out).toContain('"turno":3')
    expect(tail.out).toContain('eventos: 1 de 3')
  })
})

describe('metadata', () => {
  test('sin --dir rehusa con exit 2 — no hay directorio canónico que adivinar', async () => {
    const r = await run(['metadata', 'sess-1'])
    expect(r.code).toBe(2)
    expect(r.err).toContain('--dir')
  })

  test('sin id de sesión rehusa con exit 2', async () => {
    const r = await run(['metadata', '--dir', tmp('dir')])
    expect(r.code).toBe(2)
  })

  test('sesión ausente: exit 1', async () => {
    const dir = tmp('meta')
    const r = await run(['metadata', 'no-existe', '--dir', dir])
    expect(r.code).toBe(1)
    expect(r.err).toContain('no existe')
  })

  test('imprime la metadata real escrita por FileSessionMetadataStore', async () => {
    const dir = tmp('meta')
    const store = new FileSessionMetadataStore(backend, dir)
    await store.writeSessionMetadata('sess-1', { model: 'claude-opus-5', turns: 7 })

    const r = await run(['metadata', 'sess-1', '--dir', dir])
    expect(r.code).toBe(0)
    expect(JSON.parse(r.out)).toEqual({ model: 'claude-opus-5', turns: 7 })
  })
})

describe('artifact', () => {
  test('sin ruta rehusa con exit 2', async () => {
    const r = await run(['artifact'])
    expect(r.code).toBe(2)
  })

  test('ruta ausente: exit 1', async () => {
    const dir = tmp('art')
    const r = await run(['artifact', join(dir, 'nope.txt')])
    expect(r.code).toBe(1)
    expect(r.err).toContain('no existe')
  })

  test('imprime el contenido real escrito por BackendArtifactStore', async () => {
    const dir = tmp('art')
    const path = join(dir, 'nota.txt')
    const store = new BackendArtifactStore(backend)
    await store.writeArtifact(path, 'contenido de prueba')

    const r = await run(['artifact', path])
    expect(r.code).toBe(0)
    expect(r.out).toContain('contenido de prueba')
  })
})

describe('task-output', () => {
  test('sin --session-id rehusa con exit 2 — evita leer la sesión equivocada', async () => {
    const r = await run(['task-output', 'tarea-1'])
    expect(r.code).toBe(2)
    expect(r.err).toContain('--session-id')
  })

  test('tarea ausente: exit 1', async () => {
    const project = tmp('project')
    const r = await run(['task-output', 'no-existe', '--session-id', 'sess-1', '--cwd', project])
    expect(r.code).toBe(1)
    expect(r.err).toContain('no existe')
  })

  test('imprime la salida real escrita por appendTaskOutput', async () => {
    const project = tmp('project')
    setOriginalCwd(project)
    setSessionId('sess-1')
    appendTaskOutput('tarea-1', 'línea A\n')
    appendTaskOutput('tarea-1', 'línea B\n')
    await flushTaskOutput('tarea-1')

    const r = await run(['task-output', 'tarea-1', '--session-id', 'sess-1', '--cwd', project])
    expect(r.code).toBe(0)
    expect(r.out).toContain('línea A')
    expect(r.out).toContain('línea B')
  })
})

describe('cache-paths', () => {
  test('imprime las tres rutas resueltas', async () => {
    const r = await run(['cache-paths', '--cwd', tmp('cache')])
    expect(r.code).toBe(0)
    expect(r.out).toContain('baseLogs')
    expect(r.out).toContain('errors')
    expect(r.out).toContain('messages')
  })
})

describe('lock-status', () => {
  test('ruta ausente: exit 1', async () => {
    const r = await run(['lock-status', join(tmp('lock'), 'nope')])
    expect(r.code).toBe(1)
    expect(r.err).toContain('no existe')
  })

  test('sin ruta rehusa con exit 2', async () => {
    const r = await run(['lock-status'])
    expect(r.code).toBe(2)
  })

  test('ruta existente: reporta bloqueada/libre, o rehúsa nombrando la dependencia ausente', async () => {
    const dir = tmp('lock')
    const path = join(dir, 'archivo.txt')
    writeFileSync(path, 'x')
    const r = await run(['lock-status', path])
    if (r.code === 0) {
      expect(r.out).toMatch(/bloqueada|libre/)
    } else {
      // proper-lockfile es una dependencia perezosa (§docstring de
      // lockfile.ts) ausente de node_modules en este contenedor — el
      // subcomando lo declara, no lo esconde.
      expect(r.code).toBe(2)
      expect(r.err).toContain('proper-lockfile')
    }
  })
})

describe('la raíz del estado es un parámetro, con dos entradas de precedencia', () => {
  test('--state-root gana sobre CLAUDE_CONFIG_DIR del proceso', async () => {
    const fromEnv = tmp('env-root')
    const fromFlag = tmp('flag-root')
    const project = tmp('project')
    process.env.CLAUDE_CONFIG_DIR = fromEnv

    const r = await run(['sessions', '--state-root', fromFlag, '--project', project])
    expect(r.code).toBe(0)
    expect(r.out).toContain(fromFlag)
    expect(r.out).not.toContain(fromEnv)
  })

  test('sin flag ni CLAUDE_CONFIG_DIR directo, se lee de un .env vía THYROX_ENV_FILE — la SEGUNDA entrada', async () => {
    delete process.env.CLAUDE_CONFIG_DIR
    const declaredRoot = tmp('declared-root')
    const envDir = tmp('envfile')
    const envFile = join(envDir, '.env')
    writeFileSync(envFile, `CLAUDE_CONFIG_DIR=${declaredRoot}\n`)
    process.env.THYROX_ENV_FILE = envFile
    const project = tmp('project')

    const r = await run(['sessions', '--project', project])
    expect(r.code).toBe(0)
    expect(r.out).toContain(declaredRoot)
  })
})
