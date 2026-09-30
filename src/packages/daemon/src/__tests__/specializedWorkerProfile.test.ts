import { describe, expect, test } from 'bun:test'

import { DEFAULT_WORKER_RESOURCE_PROFILE, InvalidWorkerResourceProfileError } from '../podman/workerResourceProfile.js'
import {
  DEFAULT_SPECIALIZED_WORKER_REGISTRY,
  SPECIALIZED_WORKER_DIST_PATH,
  createSpecializedWorkerProfile,
  specializedWorkerBuildArgv,
  specializedWorkerContainerfile,
  specializedWorkerImageReference,
  specializedWorkerProfileArgv,
  specializedWorkerRuntimeTag,
  validateSpecializedWorkerProfile,
  type SpecializedWorkerProfile,
  type SpecializedWorkerRuntimeStack,
} from '../podman/specializedWorkerProfile.js'

const STACK: SpecializedWorkerRuntimeStack = { pythonVersion: '3.11', torchVersion: '2.4.0', cudaVersion: '12.4.1' }

function expectRefusedField(run: () => unknown, field: string): void {
  try {
    run()
    throw new Error('debía rehusar')
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidWorkerResourceProfileError)
    expect((error as InvalidWorkerResourceProfileError).field).toBe(field)
  }
}

describe('createSpecializedWorkerProfile', () => {
  test('usa los límites por defecto y conserva los campos declarados', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', 'daemon/main.js')
    expect(profile.workerKind).toBe('semantic-search')
    expect(profile.runtimeStack).toBe(STACK)
    expect(profile.distHostPath).toBe('/host/dist')
    expect(profile.entryRelativePath).toBe('daemon/main.js')
    expect(profile.resources).toBe(DEFAULT_WORKER_RESOURCE_PROFILE)
  })

  test('valida sin rehusar', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', 'daemon/main.js')
    expect(() => validateSpecializedWorkerProfile(profile)).not.toThrow()
  })
})

describe('specializedWorkerRuntimeTag', () => {
  test('junta las tres versiones fijadas en el orden py-torch-cuda', () => {
    expect(specializedWorkerRuntimeTag(STACK)).toBe('py3.11-torch2.4.0-cuda12.4.1')
  })
})

describe('specializedWorkerImageReference', () => {
  test('usa el registro por defecto y el sufijo -worker', () => {
    expect(specializedWorkerImageReference('semantic-search', STACK)).toBe(
      `${DEFAULT_SPECIALIZED_WORKER_REGISTRY}/semantic-search-worker:py3.11-torch2.4.0-cuda12.4.1`,
    )
  })

  test('acepta un registro declarado explícitamente', () => {
    expect(specializedWorkerImageReference('semantic-search', STACK, 'registry.example.org/thyrox')).toBe(
      'registry.example.org/thyrox/semantic-search-worker:py3.11-torch2.4.0-cuda12.4.1',
    )
  })
})

describe('specializedWorkerContainerfile', () => {
  test('contenido exacto: CUDA base, Python+Torch fijados, COPY de dist/, ENTRYPOINT con bun', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', 'daemon/main.js')
    expect(specializedWorkerContainerfile(profile)).toBe(
      [
        'FROM docker.io/nvidia/cuda:12.4.1-runtime-ubuntu22.04',
        'RUN apt-get update \\',
        '    && apt-get install -y --no-install-recommends curl ca-certificates python3.11 python3-pip \\',
        '    && rm -rf /var/lib/apt/lists/*',
        'RUN python3.11 -m pip install --no-cache-dir torch==2.4.0',
        'RUN curl -fsSL https://bun.sh/install | bash',
        'ENV PATH="/root/.bun/bin:${PATH}"',
        `COPY . ${SPECIALIZED_WORKER_DIST_PATH}`,
        `WORKDIR ${SPECIALIZED_WORKER_DIST_PATH}`,
        `ENTRYPOINT ["bun", "${SPECIALIZED_WORKER_DIST_PATH}/daemon/main.js", "--daemon-worker=semantic-search"]`,
        '',
      ].join('\n'),
    )
  })

  test('nunca emite --rootfs ni un montaje overlay de la raíz (ADR-THYROX-007)', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', 'daemon/main.js')
    const content = specializedWorkerContainerfile(profile)
    expect(content).not.toContain('--rootfs')
    expect(content).not.toContain(':O')
  })

  test('rehúsa sin emitir contenido cuando el perfil es inválido', () => {
    const profile = createSpecializedWorkerProfile('Semantic_Search', STACK, '/host/dist', 'daemon/main.js')
    expect(() => specializedWorkerContainerfile(profile)).toThrow(InvalidWorkerResourceProfileError)
  })
})

describe('specializedWorkerBuildArgv', () => {
  test('argv exacto: -f, -t con la imagen fijada, y el contexto es distHostPath', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', 'daemon/main.js')
    expect(specializedWorkerBuildArgv(profile, '/host/dist/Containerfile')).toEqual([
      'build',
      '-f', '/host/dist/Containerfile',
      '-t', 'docker.io/thyrox/semantic-search-worker:py3.11-torch2.4.0-cuda12.4.1',
      '/host/dist',
    ])
  })

  test('no emite ningún argumento cuando el perfil es inválido', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, 'relative/dist', 'daemon/main.js')
    expect(() => specializedWorkerBuildArgv(profile, '/host/dist/Containerfile')).toThrow(InvalidWorkerResourceProfileError)
  })
})

describe('specializedWorkerProfileArgv', () => {
  test('argv exacto del perfil por defecto: sólo límites de recursos, sin ningún montaje', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', 'daemon/main.js')
    expect(specializedWorkerProfileArgv(profile)).toEqual([
      '--cpus', String(DEFAULT_WORKER_RESOURCE_PROFILE.cpus),
      '--memory', `${DEFAULT_WORKER_RESOURCE_PROFILE.memoryMib}m`,
      '--pids-limit', String(DEFAULT_WORKER_RESOURCE_PROFILE.pidsLimit),
      '--network', 'none',
      '--read-only', '--read-only-tmpfs=false',
    ])
  })

  test('nunca emite --rootfs, con cualquier perfil de recursos declarado', () => {
    const profile: SpecializedWorkerProfile = {
      workerKind: 'semantic-search',
      runtimeStack: STACK,
      distHostPath: '/host/dist',
      entryRelativePath: 'daemon/main.js',
      resources: { ...DEFAULT_WORKER_RESOURCE_PROFILE, network: 'bridge', readOnlyRootfs: false },
    }
    expect(specializedWorkerProfileArgv(profile).join(' ')).not.toContain('--rootfs')
  })

  test('no emite ningún argumento cuando el perfil es inválido', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', '/absolute/entry.js')
    expect(() => specializedWorkerProfileArgv(profile)).toThrow(InvalidWorkerResourceProfileError)
  })
})

describe('validateSpecializedWorkerProfile — rehúsos, cada uno nombrando su campo', () => {
  test('workerKind con mayúsculas', () => {
    const profile = createSpecializedWorkerProfile('Semantic-Search', STACK, '/host/dist', 'daemon/main.js')
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'workerKind')
  })

  test('workerKind que empieza con un dígito', () => {
    const profile = createSpecializedWorkerProfile('1-semantic', STACK, '/host/dist', 'daemon/main.js')
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'workerKind')
  })

  test('pythonVersion no numérica', () => {
    const profile = createSpecializedWorkerProfile(
      'semantic-search', { ...STACK, pythonVersion: 'three-eleven' }, '/host/dist', 'daemon/main.js',
    )
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'runtimeStack.pythonVersion')
  })

  test('torchVersion no numérica', () => {
    const profile = createSpecializedWorkerProfile(
      'semantic-search', { ...STACK, torchVersion: 'latest' }, '/host/dist', 'daemon/main.js',
    )
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'runtimeStack.torchVersion')
  })

  test('cudaVersion no numérica', () => {
    const profile = createSpecializedWorkerProfile(
      'semantic-search', { ...STACK, cudaVersion: 'latest' }, '/host/dist', 'daemon/main.js',
    )
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'runtimeStack.cudaVersion')
  })

  test('distHostPath no absoluto', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, 'relative/dist', 'daemon/main.js')
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'distHostPath')
  })

  test('distHostPath es la raíz del anfitrión — el equivalente de --rootfs /', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/', 'daemon/main.js')
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'distHostPath')
  })

  test('entryRelativePath vacío', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', '')
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'entryRelativePath')
  })

  test('entryRelativePath absoluto', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', '/daemon/main.js')
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'entryRelativePath')
  })

  test('entryRelativePath con un segmento ".." intenta salir de dist/', () => {
    const profile = createSpecializedWorkerProfile('semantic-search', STACK, '/host/dist', '../escape/main.js')
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'entryRelativePath')
  })

  test('un recurso inválido dentro del perfil también rehúsa, nombrando su propio campo', () => {
    const profile: SpecializedWorkerProfile = {
      workerKind: 'semantic-search',
      runtimeStack: STACK,
      distHostPath: '/host/dist',
      entryRelativePath: 'daemon/main.js',
      resources: { ...DEFAULT_WORKER_RESOURCE_PROFILE, cpus: 0 },
    }
    expectRefusedField(() => validateSpecializedWorkerProfile(profile), 'cpus')
  })
})
