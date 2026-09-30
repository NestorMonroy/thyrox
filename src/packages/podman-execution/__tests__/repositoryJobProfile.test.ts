import { describe, expect, test } from 'bun:test'

import { DEFAULT_WORKER_RESOURCE_PROFILE, InvalidWorkerResourceProfileError } from '../workerResourceProfile.js'
import {
  REPOSITORY_CONTAINER_PATH,
  UnsupportedRepositoryJobCredentialError,
  createRepositoryJobProfile,
  repositoryJobProfileArgv,
  validateRepositoryJobProfile,
  type RepositoryJobProfile,
} from '../repositoryJobProfile.js'

describe('createRepositoryJobProfile', () => {
  test('monta el repositorio en /w y usa los límites por defecto', () => {
    const profile = createRepositoryJobProfile('/host/repo')
    expect(profile.repositoryHostPath).toBe('/host/repo')
    expect(profile.resources).toBe(DEFAULT_WORKER_RESOURCE_PROFILE)
    expect(profile.credential).toBeUndefined()
  })

  test('valida sin rehusar', () => {
    expect(() => validateRepositoryJobProfile(createRepositoryJobProfile('/host/repo'))).not.toThrow()
  })
})

describe('repositoryJobProfileArgv', () => {
  test('argv exacto del perfil por defecto: límites de recursos + montaje overlay del repo', () => {
    const profile = createRepositoryJobProfile('/host/repo')
    expect(repositoryJobProfileArgv(profile)).toEqual([
      '--cpus', String(DEFAULT_WORKER_RESOURCE_PROFILE.cpus),
      '--memory', `${DEFAULT_WORKER_RESOURCE_PROFILE.memoryMib}m`,
      '--pids-limit', String(DEFAULT_WORKER_RESOURCE_PROFILE.pidsLimit),
      '--network', 'none',
      '--read-only', '--read-only-tmpfs=false',
      '-v', `/host/repo:${REPOSITORY_CONTAINER_PATH}:O`,
    ])
  })

  test('REPOSITORY_CONTAINER_PATH es /w', () => {
    expect(REPOSITORY_CONTAINER_PATH).toBe('/w')
  })

  test('argv de un perfil con red y montajes adicionales declarados explícitamente', () => {
    const profile: RepositoryJobProfile = {
      repositoryHostPath: '/host/other-repo',
      resources: {
        ...DEFAULT_WORKER_RESOURCE_PROFILE,
        network: 'bridge',
        mounts: [{ source: '/host/skills', destination: '/workspace/skills', mode: 'ro' }],
      },
    }
    expect(repositoryJobProfileArgv(profile)).toEqual([
      '--cpus', String(DEFAULT_WORKER_RESOURCE_PROFILE.cpus),
      '--memory', `${DEFAULT_WORKER_RESOURCE_PROFILE.memoryMib}m`,
      '--pids-limit', String(DEFAULT_WORKER_RESOURCE_PROFILE.pidsLimit),
      '--network', 'bridge',
      '--read-only', '--read-only-tmpfs=false',
      '-v', '/host/skills:/workspace/skills:ro',
      '-v', '/host/other-repo:/w:O',
    ])
  })

  test('no emite ningún argumento cuando el perfil es inválido', () => {
    const profile: RepositoryJobProfile = { ...createRepositoryJobProfile('relative/path') }
    expect(() => repositoryJobProfileArgv(profile)).toThrow(InvalidWorkerResourceProfileError)
  })
})

describe('validateRepositoryJobProfile — rehúsos', () => {
  test('repositoryHostPath no absoluto nombra el campo', () => {
    const profile = createRepositoryJobProfile('relative/path')
    try {
      validateRepositoryJobProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidWorkerResourceProfileError)
      expect((error as InvalidWorkerResourceProfileError).field).toBe('repositoryHostPath')
    }
  })

  test('un recurso inválido dentro del perfil también rehúsa, nombrando su propio campo', () => {
    const profile: RepositoryJobProfile = {
      repositoryHostPath: '/host/repo',
      resources: { ...DEFAULT_WORKER_RESOURCE_PROFILE, cpus: 0 },
    }
    try {
      validateRepositoryJobProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('cpus')
    }
  })

  test('declarar una credencial rehúsa: hoy ningún mecanismo mide efectivo', () => {
    const profile: RepositoryJobProfile = {
      repositoryHostPath: '/host/repo',
      credential: { name: 'github-token', target: 'GITHUB_TOKEN' },
      resources: DEFAULT_WORKER_RESOURCE_PROFILE,
    }
    expect(() => validateRepositoryJobProfile(profile)).toThrow(UnsupportedRepositoryJobCredentialError)
    try {
      validateRepositoryJobProfile(profile)
    } catch (error) {
      expect((error as UnsupportedRepositoryJobCredentialError).credentialName).toBe('github-token')
    }
  })

  test('el valor de una credencial nunca aparece en el argv — el rehúso ocurre antes de componer nada', () => {
    const profile: RepositoryJobProfile = {
      repositoryHostPath: '/host/repo',
      credential: { name: 'github-token', target: 'GITHUB_TOKEN' },
      resources: DEFAULT_WORKER_RESOURCE_PROFILE,
    }
    let argv: string[] = []
    try {
      argv = repositoryJobProfileArgv(profile)
    } catch {
      // se espera el rehuso
    }
    expect(argv).toEqual([])
  })
})
