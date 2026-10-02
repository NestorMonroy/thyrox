#!/usr/bin/env bun
/**
 * Doble del coordinador de model scheduling de un anfitrión, para la prueba de
 * extremo a extremo del modelo local en una unidad (TASK-THYROX-0774).
 *
 *   fake-model-coordinator.ts <socket> <registro.jsonl> <modelId del grant>
 *
 * Sirve el transporte REAL (`startModelCoordinatorServer`) con un coordinador
 * que admite todo y concede `modelId`, y levanta en loopback el endpoint de la
 * unidad: un runtime falso compatible con OpenAI. Anota cada admisión y cada
 * petición de chat en el registro, e imprime `ready` cuando escucha.
 */
import { appendFileSync } from 'node:fs'

import { startModelCoordinatorServer, type ServedCoordinator } from '../../../src/packages/model-scheduling/coordinatorServer.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from '../../../src/packages/model-scheduling/hostCoordinator.ts'

const [socketPath, logPath, grantModel] = process.argv.slice(2) as [string, string, string]
const REPLY = 'traducción de prueba'
const record = (entry: Record<string, unknown>): void => appendFileSync(logPath, `${JSON.stringify(entry)}\n`)

function chunk(model: string, delta: Record<string, unknown>, finish: string | null): string {
  return `data: ${JSON.stringify({ id: 'chat-1', object: 'chat.completion.chunk', created: 0, model,
    choices: [{ index: 0, delta, finish_reason: finish }],
    ...(finish ? { usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } } : {}) })}\n\n`
}

const runtime = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const body = await request.json() as { model?: string; stream?: boolean }
    record({ kind: 'chat', path: new URL(request.url).pathname, model: body.model, stream: body.stream === true })
    const model = body.model ?? grantModel
    if (body.stream) {
      const text = chunk(model, { role: 'assistant', content: REPLY }, null) + chunk(model, {}, 'stop') + 'data: [DONE]\n\n'
      return new Response(text, { headers: { 'content-type': 'text/event-stream' } })
    }
    return Response.json({ id: 'chat-1', object: 'chat.completion', created: 0, model,
      choices: [{ index: 0, message: { role: 'assistant', content: REPLY }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } })
  },
})

let counter = 0
const coordinator: ServedCoordinator = {
  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    record({ kind: 'admit', model: request.model, client: request.client })
    const ticket = { admissionId: `admission-${++counter}`, requestId: request.requestId, client: request.client,
      grant: { artifact: { modelId: grantModel } }, unit: { endpoint: `http://127.0.0.1:${runtime.port}` } }
    return { status: 'admitted', ticket: ticket as unknown as AdmissionTicket }
  },
  async finish(): Promise<'finished' | 'absent'> {
    return 'finished'
  },
  admissions(): readonly AdmissionTicket[] {
    return []
  },
}

await startModelCoordinatorServer(coordinator, { socketPath })
console.log('ready')
