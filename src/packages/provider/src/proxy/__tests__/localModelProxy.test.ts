/**
 * `bin/localProxy.ts` con modelos locales del catálogo (ADR-007 1.14.0, M8):
 * `--local-model <id>` enruta ese modelo al relé admitido, que pide cada
 * petición al coordinador del anfitrión por su socket y sólo alcanza el
 * endpoint de la unidad del ticket. La declaración por entorno
 * `THYROX_OPENAI_COMPAT_*` —un modelo y una base URL, sin admisión— está
 * retirada: declararla rehúsa con exit 2.
 *
 * Qué haría fallar a esta suite: un proxy que llegue al runtime sin admisión,
 * que no suelte la admisión, que oculte la causa de un rechazo, o que acepte
 * en silencio la declaración retirada.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import { type ServedCoordinator, startModelCoordinatorServer } from '@thyrox/model-scheduling/coordinatorServer.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { startFakeOpenAIUpstream, type FakeOpenAIUpstream } from './fakeOpenAIUpstream.ts'

const LOCAL_PROXY = join(import.meta.dir, '..', '..', '..', 'bin', 'localProxy.ts')
const ARTIFACT = resolvedArtifact()
const LOCAL_MODEL = ARTIFACT.modelId
const RETIRED_DECLARATION = 'THYROX_OPENAI_COMPAT_BASE_URL'
const REFUSAL_EXIT_CODE = 2
const BAD_GATEWAY = 502
const SOCKET_ANNOUNCEMENT = /^socket=(.+)$/m

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function workDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'local-model-proxy-'))
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function fakeRuntime(): FakeOpenAIUpstream {
  const runtime = startFakeOpenAIUpstream()
  cleanups.push(runtime.stop)
  return runtime
}

function grantFor(requestId: string): ExecutionGrant {
  return {
    grantId: `grant-${requestId}`, requestId, artifact: ARTIFACT, runtime: 'ollama', placement: { kind: 'cpu' },
    residency: { mode: 'create', instance: 'residency-1', generation: 1 }, residencyVramMib: 0, requestVramMib: 0,
    contextLength: 4096, kvCacheType: 'f16', issuedAt: '2026-10-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z',
  }
}

/** Un coordinador doble: admite hacia `endpoint`, o rehúsa con `refusal`, y anota lo que suelta. */
class FakeCoordinator implements ServedCoordinator {
  readonly admitted: AdmissionRequest[] = []
  readonly finished: string[] = []
  private readonly live = new Map<string, AdmissionTicket>()

  constructor(private readonly endpoint: string, private readonly refusal?: string) {}

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    this.admitted.push(request)
    if (this.refusal) return { status: 'refused', stage: 'resolve', reason: this.refusal }
    const grant = grantFor(request.requestId)
    const ticket: AdmissionTicket = {
      admissionId: `admission-${this.admitted.length}`, requestId: request.requestId, client: request.client, grant,
      unit: {
        unitId: 'unit-1', grantId: grant.grantId, artifact: ARTIFACT, residencyKey: 'residency-1', generation: 1,
        runtime: 'ollama', endpoint: this.endpoint, containerId: 'container-1', devices: [],
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

async function servedCoordinator(coordinator: FakeCoordinator): Promise<string> {
  const socketPath = join(workDir(), 'coordinator.sock')
  const server = await startModelCoordinatorServer(coordinator, { socketPath })
  cleanups.push(() => server.close())
  return socketPath
}

/** Sin `claude` en el PATH: el proxy sirve sólo los modelos locales. */
function withoutCli(): Record<string, string> {
  const emptyPath = join(workDir(), 'empty-path')
  mkdirSync(emptyPath)
  return { PATH: emptyPath }
}

function launch(args: string[], env: Record<string, string> = {}) {
  const socket = join(workDir(), 'proxy.sock')
  return Bun.spawn([process.execPath, LOCAL_PROXY, '--socket', socket, ...args], {
    env: { ...withoutCli(), ...env }, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe',
  })
}

async function listeningProxy(args: string[], env: Record<string, string> = {}): Promise<string> {
  const child = launch(args, env)
  cleanups.push(async () => {
    child.kill('SIGTERM')
    await child.exited
  })
  const decoder = new TextDecoder()
  let seen = ''
  for await (const chunk of child.stdout) {
    seen += decoder.decode(chunk, { stream: true })
    const announced = SOCKET_ANNOUNCEMENT.exec(seen)
    if (announced) return announced[1] as string
  }
  throw new Error(`localProxy no anunció su socket: ${await new Response(child.stderr).text()}`)
}

function sendOverSocket(socket: string, body: unknown): Promise<Response> {
  return fetch('http://localhost/v1/messages', {
    unix: socket, method: 'POST',
    headers: { 'x-api-key': 'ssh-placeholder', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const HELLO = { model: LOCAL_MODEL, max_tokens: 16, messages: [{ role: 'user', content: 'hola' }] }

async function untilFinished(coordinator: FakeCoordinator, count: number): Promise<void> {
  for (let attempt = 0; attempt < 100 && coordinator.finished.length < count; attempt += 1) await Bun.sleep(10)
}

async function errorMessage(response: Response): Promise<string> {
  return ((await response.json()) as { error: { message: string } }).error.message
}

describe('localProxy con modelos locales admitidos', () => {
  test('un modelo local llega a la unidad del ticket por una admisión, que se suelta', async () => {
    const runtime = fakeRuntime()
    const coordinator = new FakeCoordinator(runtime.baseUrl.replace(/\/v1$/, ''))
    const socket = await listeningProxy(['--local-model', LOCAL_MODEL, '--coordinator-socket', await servedCoordinator(coordinator)])
    const response = await sendOverSocket(socket, HELLO)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { content: unknown }).content).toEqual([{ type: 'text', text: 'eco: hola' }])
    expect(coordinator.admitted.map(request => request.model)).toEqual([LOCAL_MODEL])
    expect(runtime.received[0]?.model).toBe(LOCAL_MODEL)
    await untilFinished(coordinator, 1)
    expect(coordinator.finished).toEqual(['admission-1'])
  })

  test('--context-tokens N llega a la admisión de cada petición local como contextLength', async () => {
    const runtime = fakeRuntime()
    const coordinator = new FakeCoordinator(runtime.baseUrl.replace(/\/v1$/, ''))
    const socket = await listeningProxy(['--local-model', LOCAL_MODEL, '--context-tokens', '24663', '--coordinator-socket', await servedCoordinator(coordinator)])
    expect((await sendOverSocket(socket, HELLO)).status).toBe(200)
    expect(coordinator.admitted.map(request => request.contextLength)).toEqual([24_663])
  })

  test('--context-tokens que no es un entero positivo rehúsa con exit 2 y no escucha', async () => {
    const child = launch(['--local-model', LOCAL_MODEL, '--context-tokens', 'mucho'], withoutCli())
    expect(await child.exited).toBe(REFUSAL_EXIT_CODE)
    expect(await new Response(child.stderr).text()).toContain('--context-tokens')
  })

  test('una admisión rehusada llega al cliente con su causa y el runtime no recibe nada', async () => {
    const runtime = fakeRuntime()
    const coordinator = new FakeCoordinator(runtime.baseUrl, 'modelo fuera del catálogo')
    const socket = await listeningProxy(['--local-model', LOCAL_MODEL, '--coordinator-socket', await servedCoordinator(coordinator)])
    const response = await sendOverSocket(socket, HELLO)
    expect(response.status).toBe(BAD_GATEWAY)
    expect(await errorMessage(response)).toContain('modelo fuera del catálogo')
    expect(runtime.received).toHaveLength(0)
  })

  // A6 r2/r3 (TASK-THYROX-0912): thyrox -p reintenta, el primer fallo enfría la
  // credencial del relé y los siguientes sólo decían «no auth available». La
  // causa del primero tiene que seguir en la respuesta del reintento.
  test('un reintento tras un fallo del relé conserva la causa inicial, no sólo «no auth available»', async () => {
    const runtime = fakeRuntime()
    const coordinator = new FakeCoordinator(runtime.baseUrl, 'modelo fuera del catálogo')
    const socket = await listeningProxy(['--local-model', LOCAL_MODEL, '--coordinator-socket', await servedCoordinator(coordinator)])
    expect(await errorMessage(await sendOverSocket(socket, HELLO))).toContain('modelo fuera del catálogo')
    const retry = await sendOverSocket(socket, HELLO)
    expect(retry.status).toBe(BAD_GATEWAY)
    expect(await errorMessage(retry)).toContain('modelo fuera del catálogo')
  })

  test('sin coordinador escuchando arranca, y la petición nombra el socket que falta', async () => {
    const missingSocket = join(workDir(), 'absent.sock')
    const socket = await listeningProxy(['--local-model', LOCAL_MODEL, '--coordinator-socket', missingSocket])
    const response = await sendOverSocket(socket, HELLO)
    expect(response.status).toBe(BAD_GATEWAY)
    expect(await errorMessage(response)).toContain(missingSocket)
  })

  test('sin claude, otro modelo responde 400 nombrando el modelo y la falta de claude-cli', async () => {
    const runtime = fakeRuntime()
    const coordinator = new FakeCoordinator(runtime.baseUrl)
    const socket = await listeningProxy(['--local-model', LOCAL_MODEL, '--coordinator-socket', await servedCoordinator(coordinator)])
    const response = await sendOverSocket(socket, { ...HELLO, model: 'claude-sonnet-5' })
    expect(response.status).toBe(400)
    const message = await errorMessage(response)
    expect(message).toContain('claude-sonnet-5')
    expect(message).toContain('claude-cli')
    expect(coordinator.admitted).toHaveLength(0)
  })

  test('la declaración retirada THYROX_OPENAI_COMPAT_* rehúsa con exit 2 nombrando --local-model', async () => {
    const child = launch(['--local-model', LOCAL_MODEL], { [RETIRED_DECLARATION]: 'http://127.0.0.1:9/v1' })
    expect(await child.exited).toBe(REFUSAL_EXIT_CODE)
    const stderr = await new Response(child.stderr).text()
    expect(stderr).toContain(RETIRED_DECLARATION)
    expect(stderr).toContain('--local-model')
  })

  test('la declaración retirada por THYROX_OPENAI_COMPAT_MODEL también rehúsa con exit 2', async () => {
    const child = launch(['--local-model', LOCAL_MODEL], { THYROX_OPENAI_COMPAT_MODEL: 'some-model' })
    expect(await child.exited).toBe(REFUSAL_EXIT_CODE)
    expect(await new Response(child.stderr).text()).toContain('THYROX_OPENAI_COMPAT_MODEL')
  })

  test('una credencial de la familia retirada no es una declaración: el proxy local escucha igual', async () => {
    const coordinator = new FakeCoordinator(fakeRuntime().baseUrl)
    const socket = await listeningProxy(['--local-model', LOCAL_MODEL, '--coordinator-socket', await servedCoordinator(coordinator)],
      { THYROX_OPENAI_COMPAT_API_KEY: 'placeholder-not-a-secret' })
    expect(socket.length).toBeGreaterThan(0)
  })

  test('sin modelo local ni claude rehúsa con exit 2 nombrando --cli', async () => {
    const child = launch([])
    expect(await child.exited).toBe(REFUSAL_EXIT_CODE)
    expect(await new Response(child.stderr).text()).toContain('--cli')
  })
})

// TASK-THYROX-0921: `--fallback-model` (repetible) da al relé sus respaldos
// locales; cada salto queda en stderr como `model_fallback <json>`, la línea
// que printDelegation reenvía al stderr del ítem.
describe('localProxy --fallback-model', () => {
  const FALLBACK = 'thyrox-fallback-b'

  /** Rehúsa por falta de sitio sólo el modelo pedido; los respaldos se admiten. */
  class PrimaryRefusingCoordinator extends FakeCoordinator {
    override async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
      if (request.model !== LOCAL_MODEL) return super.admit(request)
      this.admitted.push(request)
      return { status: 'refused', stage: 'reserve', reason: 'sin memoria para la residencia' }
    }
  }

  async function announcedSocket(child: ReturnType<typeof launch>): Promise<string> {
    const decoder = new TextDecoder()
    let seen = ''
    for await (const chunk of child.stdout) {
      seen += decoder.decode(chunk, { stream: true })
      const announced = SOCKET_ANNOUNCEMENT.exec(seen)
      if (announced) return announced[1] as string
    }
    throw new Error(`localProxy no anunció su socket: ${await new Response(child.stderr).text()}`)
  }

  test('una admisión rehusada avanza al respaldo y el salto queda en stderr', async () => {
    const runtime = fakeRuntime()
    const coordinator = new PrimaryRefusingCoordinator(runtime.baseUrl.replace(/\/v1$/, ''))
    const child = launch(['--local-model', LOCAL_MODEL, '--fallback-model', FALLBACK, '--context-tokens', '24663',
      '--coordinator-socket', await servedCoordinator(coordinator)])
    const response = await sendOverSocket(await announcedSocket(child), HELLO)
    const status = response.status
    await response.text()
    child.kill('SIGTERM')
    await child.exited
    const event = (await new Response(child.stderr).text()).split('\n').find(line => line.startsWith('model_fallback '))
    expect([status, coordinator.admitted.map(request => request.model)]).toEqual([200, [LOCAL_MODEL, FALLBACK]])
    expect(JSON.parse((event ?? 'model_fallback {}').slice('model_fallback '.length))).toMatchObject({
      type: 'model_fallback', originalModel: LOCAL_MODEL, fallbackModel: FALLBACK, trigger: 'overloaded', chainIndex: 1, contextLength: 24_663,
    })
  })
})
