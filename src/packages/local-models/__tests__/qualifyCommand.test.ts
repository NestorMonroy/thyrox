/**
 * `local-models-qualify` por admisión (ADR-007 1.14.0, M8): pide el modelo al
 * coordinador del anfitrión por su socket y corre la suite sólo contra la
 * unidad del ticket; no asegura `thyrox-ollama` ni conoce su puerto.
 *
 * Qué haría fallar a esta suite: una cualificación que llegue al runtime sin
 * admisión, que no suelte la admisión, que oculte la causa de un rechazo o
 * que siga dependiendo del contenedor `thyrox-ollama`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import { modelCoordinatorSocketPath } from '@thyrox/model-scheduling/coordinatorProtocol.ts'
import { type ModelCoordinatorServer, type ServedCoordinator, startModelCoordinatorServer } from '@thyrox/model-scheduling/coordinatorServer.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from '@thyrox/model-scheduling/hostCoordinator.ts'

import type { CommandContext } from '../catalogCommand.js'
import { EXIT_NOT_APPROVED, EXIT_OK, EXIT_REFUSED } from '../commandOutput.js'
import { runQualifyCommand } from '../qualifyCommand.js'
import { REPO_CODE_CHANGE_SUITE_PATH } from '../workflowSuite.ts'
import { CORRECT_TOOL_CALLING_REPLIES, startFakeOllama, type FakeOllama } from '../testing/fakeOllama.js'

const ARTIFACT = resolvedArtifact()
const MODEL = ARTIFACT.modelId
const DEFAULT_CONTEXT = 8192

/** Un coordinador doble: admite hacia la unidad dada, o rehúsa; anota lo que pide y suelta. */
class FakeCoordinator implements ServedCoordinator {
  readonly admitted: AdmissionRequest[] = []
  readonly finished: string[] = []
  private readonly live = new Map<string, AdmissionTicket>()

  constructor(private readonly endpoint: string, private readonly refusal?: string) {}

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    this.admitted.push(request)
    if (this.refusal) return { status: 'refused', stage: 'placement', reason: this.refusal }
    const grant: ExecutionGrant = {
      grantId: 'grant-1', requestId: request.requestId, artifact: ARTIFACT, runtime: 'ollama', placement: { kind: 'cpu' },
      residency: { mode: 'create', instance: 'residency-1', generation: 1 }, residencyVramMib: 0, requestVramMib: 0,
      contextLength: request.contextLength ?? DEFAULT_CONTEXT, kvCacheType: 'f16',
      issuedAt: '2026-10-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z',
    }
    const ticket: AdmissionTicket = {
      admissionId: `admission-${this.admitted.length}`, requestId: request.requestId, client: request.client, grant,
      unit: {
        unitId: 'unit-1', grantId: grant.grantId, artifact: ARTIFACT, residencyKey: 'residency-1', generation: 1,
        runtime: 'ollama', endpoint: this.endpoint, containerId: 'container-1', devices: [],
        profile: { image: 'docker.io/ollama/ollama:0.35.0', cpus: 2, memoryMib: 8192, environment: { LLAMA_ARG_CACHE_RAM: '0' } },
      },
    }
    this.live.set(ticket.admissionId, ticket)
    return { status: 'admitted', ticket }
  }

  async finish(admissionId: string): Promise<'finished' | 'absent'> {
    this.finished.push(admissionId)
    return this.live.delete(admissionId) ? 'finished' : 'absent'
  }

  admissions(): readonly AdmissionTicket[] {
    return [...this.live.values()]
  }
}

let directory: string
let ollama: FakeOllama | undefined
let server: ModelCoordinatorServer | undefined
let ensured: string[][]
let stdout: string[]
let stderr: string[]

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'qualify-command-'))
  ensured = []
  stdout = []
  stderr = []
})

afterEach(async () => {
  await server?.close()
  await ollama?.stop()
  server = undefined
  ollama = undefined
  rmSync(directory, { recursive: true, force: true })
})

function contextFor(): CommandContext {
  return {
    env: { THYROX_RUNTIME_DIR: join(directory, 'runtime'), THYROX_MODEL_QUALIFICATIONS: join(directory, 'qualifications.json') },
    thyroxRoot: '/nonexistent-thyrox-root',
    output: { stdout: line => { stdout.push(line) }, stderr: line => { stderr.push(line) } },
    now: () => new Date('2026-10-01T05:00:00.000Z'),
    ensureInfrastructure: async containers => {
      ensured.push([...containers])
      return { exitCode: 0, stdout: '', stderr: '' }
    },
  }
}

async function coordinatorWith(refusal?: string): Promise<FakeCoordinator> {
  ollama = startFakeOllama({
    chat: prompt => CORRECT_TOOL_CALLING_REPLIES[prompt] ?? { content: '' },
    embed: text => text.includes('cancel') ? [1, 0.1] : [0.1, 1],
  })
  const coordinator = new FakeCoordinator(ollama.baseUrl, refusal)
  server = await startModelCoordinatorServer(coordinator, { socketPath: modelCoordinatorSocketPath(contextFor().env) })
  return coordinator
}

function chats(): Record<string, unknown>[] {
  return (ollama?.requests ?? []).filter(request => request.path === '/api/chat').map(request => request.body as Record<string, unknown>)
}

describe('runQualifyCommand por admisión', () => {
  test('cualifica contra la unidad del ticket, suelta la admisión y no asegura thyrox-ollama', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL], contextFor())).toBe(EXIT_OK)
    expect(coordinator.admitted.map(request => [request.model, request.contextLength])).toEqual([[MODEL, DEFAULT_CONTEXT]])
    expect(chats()).toHaveLength(6)
    expect(chats().every(body => body.model === MODEL)).toBe(true)
    expect(coordinator.finished).toEqual(['admission-1'])
    expect(ensured).toEqual([])
    expect(existsSync(join(directory, 'qualifications.json'))).toBe(true)
    expect(readFileSync(join(directory, 'qualifications.json'), 'utf8')).toContain(MODEL)
  })

  test('--context viaja en la petición de admisión', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--context', '4096'], contextFor())).toBe(EXIT_OK)
    expect(coordinator.admitted[0]?.contextLength).toBe(4096)
    expect((chats()[0]?.options as { num_ctx: number }).num_ctx).toBe(4096)
  })

  test('una admisión rehusada rehúsa con su etapa y causa, sin tocar el runtime', async () => {
    await coordinatorWith('no cabe en memoria')
    expect(await runQualifyCommand([MODEL], contextFor())).toBe(EXIT_REFUSED)
    expect(stderr.join('\n')).toContain('placement')
    expect(stderr.join('\n')).toContain('no cabe en memoria')
    expect(chats()).toHaveLength(0)
  })

  test('sin coordinador rehúsa nombrando su socket', async () => {
    expect(await runQualifyCommand([MODEL], contextFor())).toBe(EXIT_REFUSED)
    expect(stderr.join('\n')).toContain(modelCoordinatorSocketPath(contextFor().env))
  })
})

describe('runQualifyCommand --suite: la cualificación de tarea de un consumidor (TASK-THYROX-0780)', () => {
  function taskSuiteFile(): string {
    const path = join(directory, 'task-suite.json')
    writeFileSync(path, JSON.stringify({
      id: 'es-mx-translation@1',
      taskClass: 'analisis',
      cases: [{ id: 'sin-han', messages: [{ role: 'user', content: '一' }], checks: [{ kind: 'excludes-pattern', pattern: '\\p{Script=Han}' }] }],
    }))
    return path
  }

  test('corre los casos de la suite y escribe una cualificación de tarea de su clase', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--suite', taskSuiteFile()], contextFor())).toBe(EXIT_OK)
    expect(chats()).toHaveLength(1)
    expect(coordinator.finished).toEqual(['admission-1'])
    const written = JSON.parse(readFileSync(join(directory, 'qualifications.json'), 'utf8'))
    expect(JSON.stringify(written)).toContain('"kind":"task"')
    expect(JSON.stringify(written)).toContain('"taskClass":"analisis"')
    expect(stdout.join('\n')).toContain('tarea analisis es-mx-translation@1')
  })

  test('una suite ilegible se rehúsa antes de pedir admisión', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--suite', join(directory, 'no-existe.json')], contextFor())).toBe(EXIT_REFUSED)
    expect(stderr.join('\n')).toContain('no-existe.json')
    expect(coordinator.admitted).toHaveLength(0)
  })
})

describe('runQualifyCommand --embedding-suite: la cualificación de embeddings', () => {
  function embeddingSuiteFile(): string {
    const path = join(directory, 'embedding-suite.json')
    writeFileSync(path, JSON.stringify({
      id: 'embedding-findings@1',
      cases: [{ id: 'cancel', query: 'cancel a job', relevant: 'cancel the running job', distractors: ['bake bread'] }],
    }))
    return path
  }

  test('embebe cada caso por la unidad del ticket y escribe una cualificación de embeddings', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--embedding-suite', embeddingSuiteFile()], contextFor())).toBe(EXIT_OK)
    expect((ollama?.requests ?? []).filter(request => request.path === '/api/embed')).toHaveLength(1)
    expect(chats()).toHaveLength(0)
    expect(coordinator.finished).toEqual(['admission-1'])
    const written = JSON.stringify(JSON.parse(readFileSync(join(directory, 'qualifications.json'), 'utf8')))
    expect(written).toContain('"kind":"embedding"')
    expect(stdout.join('\n')).toContain('embeddings embedding-findings@1')
  })

  test('--suite y --embedding-suite juntas se rehúsan antes de pedir admisión', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--suite', embeddingSuiteFile(), '--embedding-suite', embeddingSuiteFile()], contextFor())).toBe(EXIT_REFUSED)
    expect(coordinator.admitted).toHaveLength(0)
  })
})

describe('runQualifyCommand --workflow-suite: el flujo entero por el pool (TASK-THYROX-0931)', () => {
  /** Un `bin/headless-pool` falso bajo una raíz temporal: deja el verdict y el resultado del ítem. */
  function rootWithPool(verdict: string): string {
    const root = join(directory, 'root')
    mkdirSync(join(root, 'bin'), { recursive: true })
    const pool = join(root, 'bin', 'headless-pool')
    writeFileSync(pool, `#!/usr/bin/env bash
cat >/dev/null; out=""
while [[ $# -gt 0 ]]; do case "$1" in --out) out="$2"; shift 2 ;; *) shift ;; esac; done
mkdir -p "$out"; echo ${verdict} > "$out/1.verdict"
echo '{"type":"result","duration_ms":10000,"usage":{"output_tokens":50}}' > "$out/1.json"
`)
    chmodSync(pool, 0o755)
    return root
  }

  test('mantiene la admisión mientras corre el pool y escribe una cualificación de flujo', async () => {
    const coordinator = await coordinatorWith()
    const context = { ...contextFor(), thyroxRoot: rootWithPool('verificado') }
    const code = await runQualifyCommand([MODEL, '--workflow-suite', REPO_CODE_CHANGE_SUITE_PATH, '--out', join(directory, 'out'), '--isolated'], context)
    expect(code).toBe(EXIT_OK)
    expect(coordinator.finished).toEqual(['admission-1'])
    const [stored] = JSON.parse(readFileSync(join(directory, 'qualifications.json'), 'utf8')).qualifications
    expect(stored).toMatchObject({ kind: 'workflow', taskClass: 'mecanica', suite: 'repo-code-change@1', passed: true, tokensPerSecond: 5 })
    expect(stdout.join('\n')).toContain('flujo mecanica repo-code-change@1 1/1')
  })

  test('un caso rechazado por su verify suspende y también se escribe', async () => {
    await coordinatorWith()
    const context = { ...contextFor(), thyroxRoot: rootWithPool('rechazado') }
    expect(await runQualifyCommand([MODEL, '--workflow-suite', REPO_CODE_CHANGE_SUITE_PATH, '--out', join(directory, 'out')], context)).toBe(EXIT_NOT_APPROVED)
    expect(JSON.parse(readFileSync(join(directory, 'qualifications.json'), 'utf8')).qualifications[0].passed).toBe(false)
  })

  test('sin --out se rehúsa antes de pedir admisión: la evidencia del pool tiene destino declarado', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--workflow-suite', REPO_CODE_CHANGE_SUITE_PATH], contextFor())).toBe(EXIT_REFUSED)
    expect(coordinator.admitted).toHaveLength(0)
  })

  test('--workflow-suite con --suite se rehúsa: una medición por invocación', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--workflow-suite', REPO_CODE_CHANGE_SUITE_PATH, '--suite', REPO_CODE_CHANGE_SUITE_PATH, '--out', directory], contextFor())).toBe(EXIT_REFUSED)
    expect(coordinator.admitted).toHaveLength(0)
  })
})
