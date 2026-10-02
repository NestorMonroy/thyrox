/**
 * La generación seq2seq de un modelo de Transformers, alcanzable sólo con una
 * admisión (ADR-007 1.14.0, M8; TASK-THYROX-0776): recibe el ticket —grant y
 * unidad— y habla con el endpoint de ESA unidad. El modelo lo fija el grant que la
 * unidad cargó; quien llama sólo pone las entradas, con su prefijo de tarea
 * (`<2es>` en MADLAD-400, `translate English to French:` en T5).
 */
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { TransformersRuntimeApi, type Seq2seqReply } from './transformersRuntimeApi.ts'

export async function admittedSeq2seq(ticket: AdmissionTicket, inputs: readonly string[], maxNewTokens: number): Promise<Seq2seqReply> {
  return new TransformersRuntimeApi(ticket.unit.endpoint).seq2seq(inputs, maxNewTokens)
}
