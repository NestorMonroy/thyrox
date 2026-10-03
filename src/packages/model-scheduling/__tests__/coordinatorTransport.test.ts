/**
 * El transporte del coordinador de un anfitrión (ADR-007 1.14.0): servidor de
 * instancia única sobre un socket UNIX y su cliente. Qué haría fallar a esta
 * suite: un segundo servidor que arranca con el primero vivo; un ticket que
 * sobrevive a la conexión del cliente que lo pidió; una petición malformada
 * que tumba el servidor; un socket que otro usuario puede abrir; o un cliente
 * que, sin coordinador, falla en silencio en vez de decirlo.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CoordinatorUnavailableError, ModelCoordinatorClient } from '../coordinatorClient.ts'
import { CoordinatorAlreadyRunningError, type ModelCoordinatorServer, type ServedCoordinator, startModelCoordinatorServer } from '../coordinatorServer.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from '../hostCoordinator.ts'

const SOCKET_MODE_OWNER_ONLY = 0o600
const PERMISSION_BITS = 0o777

/** Un coordinador doble: admite todo y anota lo que suelta. */
class RecordingCoordinator implements ServedCoordinator {
  readonly finished: string[] = []
  private readonly live = new Map<string, AdmissionTicket>()
  private counter = 0

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    const ticket = { admissionId: `admission-${++this.counter}`, requestId: request.requestId, client: request.client } as AdmissionTicket
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
let socketPath: string
let coordinator: RecordingCoordinator
let server: ModelCoordinatorServer | undefined

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'model-coordinator-'))
  socketPath = join(directory, 'coordinator.sock')
  coordinator = new RecordingCoordinator()
})

afterEach(async () => {
  await server?.close()
  server = undefined
  rmSync(directory, { recursive: true, force: true })
})

async function started(): Promise<ModelCoordinatorServer> {
  server = await startModelCoordinatorServer(coordinator, { socketPath })
  return server
}

function request(requestId: string): AdmissionRequest {
  return { requestId, client: 'proxy-a', model: 'thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf' }
}

async function untilFinished(admissionIds: readonly string[]): Promise<void> {
  for (let attempt = 0; attempt < 100 && !admissionIds.every(id => coordinator.finished.includes(id)); attempt += 1) {
    await Bun.sleep(10)
  }
}

describe('servidor del coordinador', () => {
  test('admit, list y finish de ida y vuelta', async () => {
    await started()
    const client = await ModelCoordinatorClient.connect(socketPath)
    const admission = await client.admit(request('request-1'))
    expect(admission).toMatchObject({ status: 'admitted', ticket: { admissionId: 'admission-1', requestId: 'request-1' } })
    expect((await client.list()).map(ticket => ticket.admissionId)).toEqual(['admission-1'])
    expect(await client.finish('admission-1')).toBe('finished')
    expect(await client.finish('admission-1')).toBe('absent')
    await client.close()
  })

  test('un ticket vive en la conexión que lo pidió: al cerrarla se suelta', async () => {
    await started()
    const client = await ModelCoordinatorClient.connect(socketPath)
    await client.admit(request('request-1'))
    await client.admit(request('request-2'))
    await client.close()
    await untilFinished(['admission-1', 'admission-2'])
    expect(coordinator.finished.sort()).toEqual(['admission-1', 'admission-2'])
  })

  test('los tickets de otra conexión no se sueltan al cerrar una', async () => {
    await started()
    const proxyA = await ModelCoordinatorClient.connect(socketPath)
    const proxyB = await ModelCoordinatorClient.connect(socketPath)
    await proxyA.admit(request('request-1'))
    await proxyB.admit(request('request-2'))
    await proxyA.close()
    await untilFinished(['admission-1'])
    expect(coordinator.finished).toEqual(['admission-1'])
    expect(coordinator.admissions().map(ticket => ticket.admissionId)).toEqual(['admission-2'])
    await proxyB.close()
  })

  test('uno por anfitrión: un segundo servidor con el primero vivo se rehúsa', async () => {
    await started()
    await expect(startModelCoordinatorServer(new RecordingCoordinator(), { socketPath })).rejects.toBeInstanceOf(CoordinatorAlreadyRunningError)
  })

  test('el lock de un dueño muerto se reemplaza', async () => {
    writeFileSync(`${socketPath}.lock`, '999999\n')
    await started()
    const client = await ModelCoordinatorClient.connect(socketPath)
    expect((await client.admit(request('request-1'))).status).toBe('admitted')
    await client.close()
  })

  test('el socket sólo lo abre su usuario', async () => {
    await started()
    expect(statSync(socketPath).mode & PERMISSION_BITS).toBe(SOCKET_MODE_OWNER_ONLY)
  })

  test('una petición malformada recibe un error y el servidor sigue sirviendo', async () => {
    await started()
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = connect(socketPath, () => socket.write('esto no es json\n'))
      socket.once('data', chunk => { resolve(String(chunk)); socket.destroy() })
      socket.once('error', reject)
    })
    expect(JSON.parse(reply)).toMatchObject({ ok: false, code: 'EBADREQ' })
    const client = await ModelCoordinatorClient.connect(socketPath)
    expect((await client.admit(request('request-1'))).status).toBe('admitted')
    await client.close()
  })

  test('cerrar el servidor retira el socket y el lock', async () => {
    const running = await started()
    await running.close()
    server = undefined
    expect(() => statSync(socketPath)).toThrow()
    expect(() => statSync(`${socketPath}.lock`)).toThrow()
  })
})

describe('cliente del coordinador', () => {
  test('sin coordinador escuchando lo dice con CoordinatorUnavailableError', async () => {
    await expect(ModelCoordinatorClient.connect(socketPath)).rejects.toBeInstanceOf(CoordinatorUnavailableError)
  })
})
