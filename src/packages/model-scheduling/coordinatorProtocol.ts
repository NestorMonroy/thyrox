/**
 * El protocolo entre el coordinador de model scheduling de un anfitrión y sus
 * clientes (ADR-007 1.14.0): JSON por línea sobre un socket UNIX local.
 *
 * Un cliente pide `admit` y recibe la `CoordinatorAdmission`; con `finish`
 * suelta un ticket; `list` muestra los vigentes. Un ticket vive en la conexión
 * que lo pidió: si el cliente se desconecta, el servidor suelta los suyos.
 */
import { resolveDataDir } from '@thyrox/config/env/configHome'

import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from './hostCoordinator.ts'

export const MODEL_COORDINATOR_PROTO = 1
/** Variable del hogar de runtime donde vive el socket del coordinador. */
export const MODEL_COORDINATOR_RUNTIME_ENV = 'THYROX_RUNTIME_DIR'
const MODEL_COORDINATOR_SUBDIR = 'model-scheduling'
const MODEL_COORDINATOR_SOCKET = 'coordinator.sock'

export type CoordinatorRequest =
  | { readonly proto: number; readonly op: 'admit'; readonly request: AdmissionRequest }
  | { readonly proto: number; readonly op: 'finish'; readonly admissionId: string }
  | { readonly proto: number; readonly op: 'list' }

export type CoordinatorResponse =
  | { readonly ok: true; readonly op: 'admit'; readonly admission: CoordinatorAdmission }
  | { readonly ok: true; readonly op: 'finish'; readonly result: 'finished' | 'absent' }
  | { readonly ok: true; readonly op: 'list'; readonly tickets: readonly AdmissionTicket[] }
  | { readonly ok: false; readonly code: 'EBADREQ' | 'EPROTO' | 'EINTERNAL'; readonly error: string }

/** El socket del coordinador de este anfitrión, bajo el hogar de runtime de thyrox. */
export function modelCoordinatorSocketPath(env: Record<string, string | undefined> = process.env): string {
  return `${resolveDataDir(MODEL_COORDINATOR_RUNTIME_ENV, MODEL_COORDINATOR_SUBDIR, env)}/${MODEL_COORDINATOR_SOCKET}`
}
