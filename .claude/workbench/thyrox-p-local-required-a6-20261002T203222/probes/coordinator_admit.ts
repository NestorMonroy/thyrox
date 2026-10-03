#!/usr/bin/env bun
/**
 * Sonda: la admisión real que pediría el relé local para A6 —el modelo
 * contractual y el contexto declarado—, hecha desde una unidad. Imprime el
 * veredicto del coordinador y, si admite, suelta el ticket enseguida.
 * Uso: coordinator_admit.ts <modelo-contractual> <contexto>
 */
import { ModelCoordinatorClient } from '@thyrox/model-scheduling/coordinatorClient.ts'

const [model, context] = process.argv.slice(2)
const client = await ModelCoordinatorClient.connect(process.env.THYROX_MODEL_COORDINATOR_SOCKET ?? '')
const started = Date.now()
const admission = await client.admit({ requestId: `a6-probe-${started}`, client: 'a6-probe', model: model!, contextLength: Number(context) })
const elapsedMs = Date.now() - started
if (admission.status === 'admitted') {
  console.log(`admitted elapsedMs=${elapsedMs} endpoint=${JSON.stringify(admission.ticket.unit).slice(0, 300)}`)
  console.log(`finish=${await client.finish(admission.ticket.admissionId)}`)
} else {
  console.log(`${admission.status} stage=${admission.stage} elapsedMs=${elapsedMs} reason=${admission.reason}`)
}
await client.close()
