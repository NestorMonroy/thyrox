/**
 * Suite de cualificación de tool calling, leída de un archivo de datos del
 * paquete (`suites/tool-calling-1.json`) para que quien mide y quien entrena
 * por refuerzo usen la misma recompensa (`scoreReply`).
 *
 * Los casos son los seis de `tool_calling_cases` del banco
 * `ollama-cpu-benchmark-20260930T191740`, exactos, pasados a la API nativa de
 * Ollama: los argumentos de una llamada previa van como objeto y el resultado
 * de herramienta se identifica por `tool_name`.
 */

import { readFile } from 'node:fs/promises'

import type { ChatReply } from './ollamaApi.js'

export const TOOL_CALLING_SUITE_PATH = `${import.meta.dir}/suites/tool-calling-1.json`

export type CaseExpectation =
  | { readonly kind: 'tool-call', readonly name: string, readonly arguments: Record<string, unknown> }
  | { readonly kind: 'no-tool-call' }
  | { readonly kind: 'content-includes', readonly text: string }

export interface SuiteCase {
  readonly id: string
  /** Definiciones completas de herramienta, en el orden del caso. */
  readonly tools: readonly unknown[]
  readonly messages: readonly unknown[]
  readonly expectation: CaseExpectation
}

export interface Suite {
  readonly id: string
  readonly cases: readonly SuiteCase[]
}

/** Lo que `scoreReply` mira de una respuesta. */
export type ScoredReply = Pick<ChatReply, 'content' | 'toolCalls'>

export class InvalidSuiteError extends Error {
  constructor(readonly path: string, readonly field: string, reason: string) {
    super(`suite inválida (${path}) en ${field}: ${reason}`)
    this.name = 'InvalidSuiteError'
  }
}

type JsonObject = Record<string, unknown>

const EXPECTATION_KINDS: ReadonlySet<string> = new Set(['tool-call', 'no-tool-call', 'content-includes'])

export async function loadSuite(path: string): Promise<Suite> {
  const document = parseDocument(path, await readFile(path, 'utf8'))
  const id = document.id
  if (typeof id !== 'string' || id === '') throw new InvalidSuiteError(path, 'id', 'se espera una cadena no vacía')
  const tools = (isObject(document.tools) ? document.tools : {}) as JsonObject
  const cases = document.cases
  if (!Array.isArray(cases) || cases.length === 0) throw new InvalidSuiteError(path, 'cases', 'se espera una lista no vacía')
  return { id, cases: cases.map((value, index) => suiteCase(path, tools, value, index)) }
}

/** Recompensa binaria de un caso: la usa la cualificación y la usará el RL. */
export function scoreReply(expectation: CaseExpectation, reply: ScoredReply): boolean {
  if (expectation.kind === 'no-tool-call') return reply.toolCalls.length === 0
  if (expectation.kind === 'content-includes') return reply.content.includes(expectation.text)
  const [first] = reply.toolCalls
  return first !== undefined && first.name === expectation.name && canonicalJson(first.arguments) === canonicalJson(expectation.arguments)
}

function parseDocument(path: string, text: string): JsonObject {
  let document: unknown
  try {
    document = JSON.parse(text) as unknown
  } catch (error) {
    throw new InvalidSuiteError(path, '<raíz>', `no es JSON (${(error as Error).message})`)
  }
  if (!isObject(document)) throw new InvalidSuiteError(path, '<raíz>', 'se espera un objeto')
  return document
}

function suiteCase(path: string, tools: JsonObject, value: unknown, index: number): SuiteCase {
  const field = `cases[${index}]`
  if (!isObject(value) || typeof value.id !== 'string') throw new InvalidSuiteError(path, field, 'se espera un objeto con id')
  if (!Array.isArray(value.messages)) throw new InvalidSuiteError(path, `${field}.messages`, 'se espera una lista')
  return {
    id: value.id,
    tools: resolveTools(path, tools, value.tools, `${field}.tools`),
    messages: value.messages,
    expectation: requireExpectation(path, value.expectation, `${field}.expectation`),
  }
}

function resolveTools(path: string, tools: JsonObject, names: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(names)) throw new InvalidSuiteError(path, field, 'se espera una lista de nombres')
  return names.map(name => {
    if (typeof name !== 'string' || !Object.hasOwn(tools, name)) throw new InvalidSuiteError(path, field, `«${String(name)}» no está declarada en tools`)
    return tools[name]
  })
}

function requireExpectation(path: string, value: unknown, field: string): CaseExpectation {
  if (!isObject(value) || !EXPECTATION_KINDS.has(String(value.kind))) {
    throw new InvalidSuiteError(path, field, `se espera kind ${[...EXPECTATION_KINDS].join(', ')}`)
  }
  return value as unknown as CaseExpectation
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!isObject(value)) return value
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
