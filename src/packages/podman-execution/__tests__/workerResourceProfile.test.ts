import { describe, expect, test } from 'bun:test'

import {
  DEFAULT_WORKER_RESOURCE_PROFILE,
  InvalidWorkerResourceProfileError,
  validateWorkerResourceProfile,
  workerResourceLimitArgv,
  type WorkerResourceProfile,
} from '../workerResourceProfile.js'

describe('DEFAULT_WORKER_RESOURCE_PROFILE', () => {
  test('es el perfil más restrictivo medido: sin red, rootfs de sólo lectura, sin montajes', () => {
    expect(DEFAULT_WORKER_RESOURCE_PROFILE.network).toBe('none')
    expect(DEFAULT_WORKER_RESOURCE_PROFILE.readOnlyRootfs).toBe(true)
    expect(DEFAULT_WORKER_RESOURCE_PROFILE.mounts).toEqual([])
  })

  test('valida sin rehusar', () => {
    expect(() => validateWorkerResourceProfile(DEFAULT_WORKER_RESOURCE_PROFILE)).not.toThrow()
  })
})

describe('workerResourceLimitArgv', () => {
  test('argv exacto del perfil por defecto', () => {
    expect(workerResourceLimitArgv(DEFAULT_WORKER_RESOURCE_PROFILE)).toEqual([
      '--cpus', String(DEFAULT_WORKER_RESOURCE_PROFILE.cpus),
      '--memory', `${DEFAULT_WORKER_RESOURCE_PROFILE.memoryMib}m`,
      '--pids-limit', String(DEFAULT_WORKER_RESOURCE_PROFILE.pidsLimit),
      '--network', 'none',
      '--read-only', '--read-only-tmpfs=false',
    ])
  })

  test('argv exacto de un perfil relajado, con red bridge, rootfs escribible y montajes', () => {
    const profile: WorkerResourceProfile = {
      cpus: 2,
      memoryMib: 2048,
      pidsLimit: 256,
      network: 'bridge',
      readOnlyRootfs: false,
      mounts: [
        { source: '/host/skills', destination: '/workspace/skills', mode: 'ro' },
        { source: '/host/scratch', destination: '/workspace/scratch', mode: 'rw' },
      ],
    }
    expect(workerResourceLimitArgv(profile)).toEqual([
      '--cpus', '2',
      '--memory', '2048m',
      '--pids-limit', '256',
      '--network', 'bridge',
      '-v', '/host/skills:/workspace/skills:ro',
      '-v', '/host/scratch:/workspace/scratch:rw',
    ])
  })

  test('no emite ningún argumento cuando el perfil es inválido', () => {
    const profile: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, cpus: 0 }
    expect(() => workerResourceLimitArgv(profile)).toThrow(InvalidWorkerResourceProfileError)
  })
})

describe('validateWorkerResourceProfile — rehúsos, cada uno nombrando su campo', () => {
  test('cpus <= 0', () => {
    const profile: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, cpus: 0 }
    expect(() => validateWorkerResourceProfile(profile)).toThrow(InvalidWorkerResourceProfileError)
    try {
      validateWorkerResourceProfile(profile)
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('cpus')
    }
  })

  test('cpus negativo', () => {
    const profile: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, cpus: -0.5 }
    expect(() => validateWorkerResourceProfile(profile)).toThrow(InvalidWorkerResourceProfileError)
  })

  test('memoryMib <= 0', () => {
    const profile: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, memoryMib: 0 }
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('memoryMib')
    }
  })

  test('pidsLimit < 1', () => {
    const profile: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, pidsLimit: 0 }
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('pidsLimit')
    }
  })

  test('pidsLimit no entero', () => {
    const profile: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, pidsLimit: 1.5 }
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('pidsLimit')
    }
  })

  test('montaje sin destino absoluto', () => {
    const profile: WorkerResourceProfile = {
      ...DEFAULT_WORKER_RESOURCE_PROFILE,
      mounts: [{ source: '/host/skills', destination: 'workspace/skills', mode: 'ro' }],
    }
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('mounts[0].destination')
    }
  })

  test('montaje con origen vacío', () => {
    const profile: WorkerResourceProfile = {
      ...DEFAULT_WORKER_RESOURCE_PROFILE,
      mounts: [{ source: '', destination: '/workspace/skills', mode: 'ro' }],
    }
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('mounts[0].source')
    }
  })

  test('modo de montaje desconocido', () => {
    const profile = {
      ...DEFAULT_WORKER_RESOURCE_PROFILE,
      mounts: [{ source: '/host/skills', destination: '/workspace/skills', mode: 'rx' }],
    } as unknown as WorkerResourceProfile
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('mounts[0].mode')
    }
  })

  test('red desconocida', () => {
    const profile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, network: 'host' } as unknown as WorkerResourceProfile
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('network')
    }
  })
})
