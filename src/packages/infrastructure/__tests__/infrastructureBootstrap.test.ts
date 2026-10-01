import { beforeEach, describe, expect, test } from 'bun:test'

import { FakePodmanHost } from '@thyrox/podman-execution/testing/fakePodmanHost.ts'
import { OWNER_ID_LABEL_KEY, OWNER_KIND_LABEL_KEY } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import {
  EXIT_FAILED,
  EXIT_HEALTHY,
  EXIT_LOCK_COLLISION,
  EXIT_REFUSED,
  INFRASTRUCTURE_OWNER_ID,
  InvalidInfrastructureDeclarationError,
  bootstrapInfrastructure,
  parseInfrastructureDeclarations,
  type InfrastructureDeclaration,
} from '../infrastructureBootstrap.ts'

const PASSWORD = 'bootstrap-secret-8812'

function postgres(): InfrastructureDeclaration {
  return {
    name: 'thyrox-postgres',
    image: 'docker.io/pgvector/pgvector:0.8.0-pg16',
    network: { mode: 'named', name: 'thyrox-infra' },
    publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: 55432, containerPort: 5432 }],
    namedVolumes: [{ volume: 'thyrox-postgres-data', destination: '/var/lib/postgresql/data' }],
    bindMounts: [],
    environment: { POSTGRES_USER: 'thyrox', POSTGRES_DB: 'thyrox', POSTGRES_PASSWORD_FILE: '/run/secrets/postgres-password' },
    secrets: [{ secret: 'thyrox-postgres-password', target: 'postgres-password', valueFrom: 'THYROX_INFRA_POSTGRES_PASSWORD' }],
    command: [],
    restartPolicy: 'on-failure',
    labels: { 'io.thyrox.role': 'infrastructure', 'io.thyrox.service': 'postgres' },
    legacyRoleLabel: { key: 'io.thyrox.role', value: 'infrastructure' },
    health: { command: ['pg_isready', '-U', 'thyrox', '-d', 'thyrox'], timeoutSeconds: 2, intervalSeconds: 1 },
  }
}

function redis(): InfrastructureDeclaration {
  return {
    ...postgres(),
    name: 'thyrox-redis',
    image: 'docker.io/library/redis:7.4',
    publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: 56379, containerPort: 6379 }],
    namedVolumes: [],
    environment: {},
    secrets: [],
    command: ['redis-server', '--save', '', '--appendonly', 'no'],
    labels: { 'io.thyrox.role': 'infrastructure', 'io.thyrox.service': 'redis' },
    health: { command: ['redis-cli', 'ping'], timeoutSeconds: 2, intervalSeconds: 1 },
  }
}

const ENVIRONMENT = { THYROX_INFRA_POSTGRES_PASSWORD: PASSWORD }

let host: FakePodmanHost

beforeEach(() => {
  host = new FakePodmanHost()
})

function deps() {
  return { podman: host, isProcessAlive: host.isProcessAlive, sleep: async () => {} }
}

function everyText(report: { lines: string[]; problems: string[] }): string {
  return [...report.lines, ...report.problems, ...host.calls.map(argv => argv.join(' '))].join('\n')
}

describe('bootstrapInfrastructure', () => {
  test('materializa por la primitiva con dueño infrastructure y reporta una línea por recurso', async () => {
    host.healthyContainers.add('thyrox-postgres')
    host.healthyContainers.add('thyrox-redis')
    const report = await bootstrapInfrastructure(deps(), [postgres(), redis()], ENVIRONMENT, 4242)
    expect(report.exitCode).toBe(EXIT_HEALTHY)
    expect(report.outcomes.map(outcome => outcome.action)).toEqual(['created', 'created'])
    const labels = host.containers.get('thyrox-postgres')?.labels ?? {}
    expect(labels[OWNER_KIND_LABEL_KEY]).toBe('infrastructure')
    expect(labels[OWNER_ID_LABEL_KEY]).toBe(INFRASTRUCTURE_OWNER_ID)
    expect(report.lines).toEqual([
      'thyrox-postgres action=created drift=- created=yes started=yes health=healthy volumes=thyrox-postgres-data:created',
      'thyrox-redis action=created drift=- created=yes started=yes health=healthy volumes=-',
    ])
    expect(host.secrets.get('thyrox-postgres-password')?.value).toBe(PASSWORD)
    expect(everyText(report)).not.toContain(PASSWORD)
  })

  test('sin el valor de un secreto declarado rehúsa con exit 2, nombra la variable y no toca Podman', async () => {
    const report = await bootstrapInfrastructure(deps(), [postgres()], {}, 4242)
    expect(report.exitCode).toBe(EXIT_REFUSED)
    expect(report.problems.join('\n')).toContain('THYROX_INFRA_POSTGRES_PASSWORD')
    expect(host.calls).toEqual([])
  })

  test('un contenedor con ese nombre y otro dueño se rehúsa con exit 2 y queda intacto', async () => {
    host.seedContainer('thyrox-postgres', {
      status: 'running', pid: 50, image: 'x', mounts: [], env: [], secrets: [],
      labels: { [OWNER_KIND_LABEL_KEY]: 'daemon', [OWNER_ID_LABEL_KEY]: 'daemon-1' },
    })
    const report = await bootstrapInfrastructure(deps(), [postgres()], ENVIRONMENT, 4242)
    expect(report.exitCode).toBe(EXIT_REFUSED)
    expect(report.lines[0]).toContain('action=failed drift=ownership-collision')
    expect(host.containers.get('thyrox-postgres')?.labels[OWNER_KIND_LABEL_KEY]).toBe('daemon')
  })

  test('un recurso que no llega a sano sale con exit 1 y nombra su etapa', async () => {
    const report = await bootstrapInfrastructure(deps(), [postgres()], ENVIRONMENT, 4242)
    expect(report.exitCode).toBe(EXIT_FAILED)
    expect(report.lines[0]).toContain('health=unhealthy')
    expect(report.problems.join('\n')).toContain('thyrox-postgres: health:')
  })

  test('una colisión de locks sale con exit 3 y publica el remedio, sin el valor secreto', async () => {
    host.failNextCreate = { exitCode: 126, stdout: '', stderr: `Error: deadlock due to lock mismatch ${PASSWORD}` }
    const report = await bootstrapInfrastructure(deps(), [postgres()], ENVIRONMENT, 4242)
    expect(report.exitCode).toBe(EXIT_LOCK_COLLISION)
    expect(report.problems.join('\n')).toContain('podman system renumber')
    expect(everyText(report)).not.toContain(PASSWORD)
  })

  test('el exit refleja el fallo más severo: colisión de locks sobre fallo de salud', async () => {
    host.failNextCreate = null
    const healthFailing = postgres()
    const lockFailing = { ...redis() }
    const first = bootstrapInfrastructure(deps(), [healthFailing], ENVIRONMENT, 4242)
    expect((await first).exitCode).toBe(EXIT_FAILED)
    host.failNextCreate = { exitCode: 126, stdout: '', stderr: 'Error: deadlock due to lock mismatch' }
    const report = await bootstrapInfrastructure(deps(), [lockFailing, healthFailing], ENVIRONMENT, 4242)
    expect(report.exitCode).toBe(EXIT_LOCK_COLLISION)
  })
})

describe('parseInfrastructureDeclarations', () => {
  test('lee un arreglo JSON de declaraciones', () => {
    const parsed = parseInfrastructureDeclarations(JSON.stringify([postgres(), redis()]))
    expect(parsed.map(declaration => declaration.name)).toEqual(['thyrox-postgres', 'thyrox-redis'])
    expect(parsed[0]?.secrets?.[0]?.valueFrom).toBe('THYROX_INFRA_POSTGRES_PASSWORD')
  })

  test('un JSON que no es un arreglo se rehúsa', () => {
    expect(() => parseInfrastructureDeclarations('{"name":"x"}')).toThrow(InvalidInfrastructureDeclarationError)
  })

  test('una declaración sin nombre o sin imagen se rehúsa nombrando el campo', () => {
    const { name: _name, ...nameless } = postgres()
    expect(() => parseInfrastructureDeclarations(JSON.stringify([nameless]))).toThrow(/name/)
    const { image: _image, ...imageless } = postgres()
    expect(() => parseInfrastructureDeclarations(JSON.stringify([imageless]))).toThrow(/image/)
  })

  test('un secreto declarado con su valor en vez de la variable se rehúsa', () => {
    const withValue = { ...postgres(), secrets: [{ secret: 's', target: 't', value: PASSWORD }] }
    expect(() => parseInfrastructureDeclarations(JSON.stringify([withValue]))).toThrow(/valueFrom/)
  })
})
