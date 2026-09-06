import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { join } from 'path'
import {
  clearAgentTranscriptSubdir,
  getAgentTranscriptPath,
  getOriginalCwd,
  getProjectDir,
  getProjectsDir,
  getSessionId,
  getSessionProjectDir,
  getTranscriptPath,
  getTranscriptPathForSession,
  MAX_TRANSCRIPT_READ_BYTES,
  setAgentTranscriptSubdir,
  setOriginalCwd,
  setSessionId,
  setSessionProjectDir,
} from '../sessionPaths.js'

const ORIGINAL_ENV = process.env.CLAUDE_CONFIG_DIR

beforeEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR
  setSessionProjectDir(null)
})

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_ENV
  setSessionProjectDir(null)
})

describe('getProjectsDir', () => {
  test('usa CLAUDE_CONFIG_DIR + "projects"', () => {
    process.env.CLAUDE_CONFIG_DIR = '/tmp/config-a'
    expect(getProjectsDir()).toBe(join('/tmp/config-a', 'projects'))
  })
})

describe('getProjectDir', () => {
  test('sanea el cwd y lo une bajo projects/', () => {
    process.env.CLAUDE_CONFIG_DIR = '/tmp/config-b'
    const cwd = '/home/user/mi-proyecto-unico-1'
    expect(getProjectDir(cwd)).toBe(
      join('/tmp/config-b', 'projects', '-home-user-mi-proyecto-unico-1'),
    )
  })

  test('está memoizado — dos llamadas al mismo cwd devuelven el mismo string', () => {
    const cwd = '/home/user/mi-proyecto-unico-2'
    expect(getProjectDir(cwd)).toBe(getProjectDir(cwd))
  })
})

describe('getSessionId / setSessionId', () => {
  test('sin fijar explícitamente, es un string estable entre llamadas', () => {
    setSessionId('sesion-de-prueba-1')
    expect(getSessionId()).toBe('sesion-de-prueba-1')
    expect(getSessionId()).toBe('sesion-de-prueba-1')
  })

  test('setSessionId sustituye el id', () => {
    setSessionId('sesion-a')
    expect(getSessionId()).toBe('sesion-a')
    setSessionId('sesion-b')
    expect(getSessionId()).toBe('sesion-b')
  })
})

describe('getOriginalCwd / setOriginalCwd', () => {
  test('setOriginalCwd sustituye el valor', () => {
    setOriginalCwd('/ruta/de/prueba')
    expect(getOriginalCwd()).toBe('/ruta/de/prueba')
  })
})

describe('getTranscriptPath', () => {
  test('sin sessionProjectDir, deriva de getProjectDir(getOriginalCwd())', () => {
    process.env.CLAUDE_CONFIG_DIR = '/tmp/config-c'
    setOriginalCwd('/home/user/proyecto-transcript')
    setSessionId('sesion-transcript-1')

    expect(getTranscriptPath()).toBe(
      join(
        '/tmp/config-c',
        'projects',
        '-home-user-proyecto-transcript',
        'sesion-transcript-1.jsonl',
      ),
    )
  })

  test('con sessionProjectDir fijado, lo usa en vez de derivar de originalCwd', () => {
    setSessionProjectDir('/ruta/de/sesion/resumida')
    setSessionId('sesion-resumida-1')
    expect(getTranscriptPath()).toBe(
      join('/ruta/de/sesion/resumida', 'sesion-resumida-1.jsonl'),
    )
  })
})

describe('getTranscriptPathForSession', () => {
  test('para el id de la sesión ACTUAL, se comporta como getTranscriptPath', () => {
    setSessionProjectDir('/ruta/actual')
    setSessionId('sesion-actual-1')
    expect(getTranscriptPathForSession('sesion-actual-1')).toBe(
      getTranscriptPath(),
    )
  })

  test('para OTRO id de sesión, ignora sessionProjectDir y deriva de originalCwd', () => {
    process.env.CLAUDE_CONFIG_DIR = '/tmp/config-d'
    setSessionProjectDir('/ruta/actual/no-debe-usarse')
    setSessionId('sesion-actual-2')
    setOriginalCwd('/home/user/proyecto-otra-sesion')

    expect(getTranscriptPathForSession('sesion-remota-99')).toBe(
      join(
        '/tmp/config-d',
        'projects',
        '-home-user-proyecto-otra-sesion',
        'sesion-remota-99.jsonl',
      ),
    )
  })
})

describe('getAgentTranscriptPath', () => {
  afterEach(() => {
    clearAgentTranscriptSubdir('agent-sin-subdir')
    clearAgentTranscriptSubdir('agent-con-subdir')
  })

  test('sin subdir asignado, va directo bajo subagents/', () => {
    setSessionProjectDir('/ruta/agentes')
    setSessionId('sesion-agentes-1')
    expect(getAgentTranscriptPath('agent-sin-subdir')).toBe(
      join(
        '/ruta/agentes',
        'sesion-agentes-1',
        'subagents',
        'agent-agent-sin-subdir.jsonl',
      ),
    )
  })

  test('con subdir asignado (workflow run), anida bajo ese subdir', () => {
    setSessionProjectDir('/ruta/agentes')
    setSessionId('sesion-agentes-2')
    setAgentTranscriptSubdir('agent-con-subdir', 'workflows/run-42')
    expect(getAgentTranscriptPath('agent-con-subdir')).toBe(
      join(
        '/ruta/agentes',
        'sesion-agentes-2',
        'subagents',
        'workflows/run-42',
        'agent-agent-con-subdir.jsonl',
      ),
    )
  })
})

describe('MAX_TRANSCRIPT_READ_BYTES', () => {
  test('es 50 MB', () => {
    expect(MAX_TRANSCRIPT_READ_BYTES).toBe(50 * 1024 * 1024)
  })
})
