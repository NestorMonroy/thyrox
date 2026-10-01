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

export type CoordinatorErrorCode = Extract<CoordinatorResponse, { readonly ok: false }>['code']
export type CoordinatorFailure = Extract<CoordinatorResponse, { readonly ok: false }>

/** Una línea leída del socket: la petición reconocida, o la respuesta de error que le toca. */
export type ParsedCoordinatorRequest =
  | { readonly ok: true; readonly request: CoordinatorRequest }
  | { readonly ok: false; readonly failure: CoordinatorFailure }

const FRAME_TERMINATOR = '\n'

/** Una respuesta de error del coordinador recibida por el cliente. */
export class CoordinatorRequestError extends Error {
  constructor(readonly code: CoordinatorErrorCode, detail: string) {
    super(`el coordinador de model scheduling rechazó la petición (${code}): ${detail}`)
    this.name = 'CoordinatorRequestError'
  }
}

export function coordinatorFailure(code: CoordinatorErrorCode, error: string): CoordinatorFailure {
  return { ok: false, code, error }
}

/** Un mensaje del protocolo como línea del socket. */
export function encodeCoordinatorFrame(message: CoordinatorRequest | CoordinatorResponse): string {
  return `${JSON.stringify(message)}${FRAME_TERMINATOR}`
}

/**
 * Corta el flujo de un socket en líneas completas y entrega cada una; un
 * fragmento sin terminador espera al siguiente trozo.
 */
export function createCoordinatorLineReader(onLine: (line: string) => void): (chunk: Buffer | string) => void {
  let pending = ''
  return chunk => {
    pending += String(chunk)
    let end = pending.indexOf(FRAME_TERMINATOR)
    while (end >= 0) {
      const line = pending.slice(0, end)
      pending = pending.slice(end + FRAME_TERMINATOR.length)
      if (line.trim() !== '') onLine(line)
      end = pending.indexOf(FRAME_TERMINATOR)
    }
  }
}

/** Interpreta una línea recibida por el servidor: JSON, versión del protocolo y forma de la operación. */
export function parseCoordinatorRequest(line: string): ParsedCoordinatorRequest {
  const message = parseJsonObject(line)
  if (message === undefined) return rejected('EBADREQ', 'la petición no es un objeto JSON')
  if (message.proto !== MODEL_COORDINATOR_PROTO) {
    return rejected('EPROTO', `proto ${String(message.proto)} no es ${MODEL_COORDINATOR_PROTO}`)
  }
  const request = recognizedRequest(message)
  return request === undefined ? rejected('EBADREQ', `petición desconocida: op ${String(message.op)}`) : { ok: true, request }
}

function rejected(code: CoordinatorErrorCode, error: string): ParsedCoordinatorRequest {
  return { ok: false, failure: coordinatorFailure(code, error) }
}

function parseJsonObject(line: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(line)
    return isRecord(value) ? value : undefined
  } catch {
    return undefined
  }
}

function recognizedRequest(message: Record<string, unknown>): CoordinatorRequest | undefined {
  const proto = MODEL_COORDINATOR_PROTO
  if (message.op === 'list') return { proto, op: 'list' }
  if (message.op === 'finish' && typeof message.admissionId === 'string') return { proto, op: 'finish', admissionId: message.admissionId }
  if (message.op === 'admit' && isAdmissionRequest(message.request)) return { proto, op: 'admit', request: message.request }
  return undefined
}

function isAdmissionRequest(value: unknown): value is AdmissionRequest {
  return isRecord(value) && typeof value.requestId === 'string' && typeof value.client === 'string' && isModelReference(value.model)
}

/** Un nombre contractual o una petición por repositorio; el coordinador valida el resto al resolver. */
function isModelReference(value: unknown): boolean {
  return typeof value === 'string' || isRecord(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
