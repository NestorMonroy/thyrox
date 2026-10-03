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
    const profile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, network: 'container:other' } as unknown as WorkerResourceProfile
    try {
      validateWorkerResourceProfile(profile)
      throw new Error('debía rehusar')
    } catch (error) {
      expect((error as InvalidWorkerResourceProfileError).field).toBe('network')
    }
  })
})

describe('red host y entorno declarado', () => {
  const base: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, network: 'host' }

  test('la red host se declara y se emite tal cual', () => {
    expect(workerResourceLimitArgv(base)).toContain('host')
    expect(workerResourceLimitArgv(base).slice(6, 8)).toEqual(['--network', 'host'])
  })

  test('el entorno declarado se emite como --env, en orden de nombre', () => {
    const profile: WorkerResourceProfile = {
      ...base,
      environment: { NODE_EXTRA_CA_CERTS: '/certs/ca.crt', HTTPS_PROXY: 'http://127.0.0.1:43003' },
    }
    expect(workerResourceLimitArgv(profile).slice(-4)).toEqual([
      '--env', 'HTTPS_PROXY=http://127.0.0.1:43003',
      '--env', 'NODE_EXTRA_CA_CERTS=/certs/ca.crt',
    ])
  })

  test('rehúsa un nombre de credencial: su valor quedaría en podman inspect', () => {
    for (const name of ['REGISTRY_TOKEN', 'DB_PASSWORD', 'API_KEY', 'CLIENT_SECRET']) {
      const profile: WorkerResourceProfile = { ...base, environment: { [name]: 'x' } }
      try {
        validateWorkerResourceProfile(profile)
        throw new Error('debía rehusar')
      } catch (error) {
        expect((error as InvalidWorkerResourceProfileError).field).toBe(`environment.${name}`)
      }
    }
  })

  test('rehúsa un nombre de variable inválido', () => {
    const profile: WorkerResourceProfile = { ...base, environment: { 'A=B': 'x' } }
    expect(() => validateWorkerResourceProfile(profile)).toThrow(InvalidWorkerResourceProfileError)
  })
})

describe('puertos publicados en loopback y dispositivos CDI', () => {
  const bridge: WorkerResourceProfile = { ...DEFAULT_WORKER_RESOURCE_PROFILE, network: 'bridge', readOnlyRootfs: false }

  function rejectedField(profile: WorkerResourceProfile): string | undefined {
    try {
      validateWorkerResourceProfile(profile)
      return undefined
    } catch (error) {
      return (error as InvalidWorkerResourceProfileError).field
    }
  }

  test('un puerto se publica sólo en 127.0.0.1', () => {
    const argv = workerResourceLimitArgv({ ...bridge, publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: 61_234, containerPort: 11_434 }] })
    expect(argv.join(' ')).toContain('-p 127.0.0.1:61234:11434')
  })

  test('una dirección que no es loopback se rehúsa', () => {
    expect(rejectedField({ ...bridge, publishedPorts: [{ hostAddress: '0.0.0.0' as '127.0.0.1', hostPort: 61_234, containerPort: 11_434 }] })).toBe('publishedPorts.0.hostAddress')
  })

  test('un puerto fuera de 1–65535 se rehúsa', () => {
    expect(rejectedField({ ...bridge, publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: 0, containerPort: 11_434 }] })).toBe('publishedPorts.0.hostPort')
    expect(rejectedField({ ...bridge, publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: 61_234, containerPort: 70_000 }] })).toBe('publishedPorts.0.containerPort')
  })

  test('publicar puertos exige red bridge: sin red no hay a dónde, y en host no hace falta', () => {
    const port = [{ hostAddress: '127.0.0.1' as const, hostPort: 61_234, containerPort: 11_434 }]
    expect(rejectedField({ ...bridge, network: 'none', publishedPorts: port })).toBe('publishedPorts')
    expect(rejectedField({ ...bridge, network: 'host', publishedPorts: port })).toBe('publishedPorts')
  })

  test('un dispositivo se emite en forma CDI', () => {
    const argv = workerResourceLimitArgv({ ...bridge, devices: ['nvidia.com/gpu=GPU-6a9c1d2e-0000-0000-0000-000000000000'] })
    expect(argv.join(' ')).toContain('--device nvidia.com/gpu=GPU-6a9c1d2e-0000-0000-0000-000000000000')
  })

  test('una ruta de /dev o un nombre que no es CDI se rehúsa', () => {
    expect(rejectedField({ ...bridge, devices: ['/dev/nvidia0'] })).toBe('devices.0')
    expect(rejectedField({ ...bridge, devices: ['gpu0'] })).toBe('devices.0')
  })
})
