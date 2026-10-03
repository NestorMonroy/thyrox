/**
 * Suite de cualificación de TAREA (TASK-THYROX-0780): mide que un modelo
 * resuelve el trabajo de una clase con ítems reales del consumidor, no que
 * emite llamadas a herramienta (eso es `toolCallingSuite.ts`).
 *
 * La escribe el consumidor —su trabajo, sus casos— y la puntúa thyrox con
 * comprobaciones deterministas sobre el texto de la respuesta:
 *
 *   includes          el texto aparece literal (un comando LaTeX protegido, un término del glosario)
 *   excludes          el texto no aparece (una forma prohibida)
 *   excludes-pattern  la expresión regular Unicode no casa (p. ej. `\p{Script=Han}`: quedó chino)
 *
 * Un caso sin comprobaciones se rehúsa al leer: aprobaría cualquier respuesta.
 * Un patrón que no compila también: el error tiene que salir antes de medir.
 *
 * Métrica: comprobaciones cumplidas por caso, binarias.
 * Ciega a: la calidad de la prosa que ninguna comprobación nombra.
 */

import { readFile } from 'node:fs/promises'

import { LOCAL_TASK_CLASSES, type LocalTaskClass } from '@thyrox/model-artifacts/modelQualification.ts'

export type TaskCheck =
  | { readonly kind: 'includes', readonly text: string }
  | { readonly kind: 'excludes', readonly text: string }
  | { readonly kind: 'excludes-pattern', readonly pattern: string, readonly expression: RegExp }

export interface TaskCase {
  readonly id: string
  readonly messages: readonly unknown[]
  readonly checks: readonly TaskCheck[]
}

export interface TaskSuite {
  readonly id: string
  readonly taskClass: LocalTaskClass
  readonly cases: readonly TaskCase[]
}

export interface TaskScore {
  readonly passed: boolean
  /** Cada comprobación incumplida, como `<kind> «<texto o patrón>»`. */
  readonly failed: readonly string[]
}

export class InvalidTaskSuiteError extends Error {
  constructor(readonly path: string, readonly field: string, reason: string) {
    super(`suite de tarea inválida (${path}) en ${field}: ${reason}`)
    this.name = 'InvalidTaskSuiteError'
  }
}

type JsonObject = Record<string, unknown>

const UNICODE_FLAGS = 'u'

export async function loadTaskSuite(path: string): Promise<TaskSuite> {
  const document = parseDocument(path, await readSuite(path))
  if (typeof document.id !== 'string' || document.id === '') throw new InvalidTaskSuiteError(path, 'id', 'se espera una cadena no vacía')
  if (!isTaskClass(document.taskClass)) {
    throw new InvalidTaskSuiteError(path, 'taskClass', `se espera una de ${LOCAL_TASK_CLASSES.join(', ')}`)
  }
  const cases = document.cases
  if (!Array.isArray(cases) || cases.length === 0) throw new InvalidTaskSuiteError(path, 'cases', 'se espera una lista no vacía')
  return { id: document.id, taskClass: document.taskClass, cases: cases.map((value, index) => taskCase(path, value, index)) }
}

/** Recompensa binaria de un caso, con el nombre de cada comprobación que no se cumplió. */
export function scoreTaskReply(checks: readonly TaskCheck[], content: string): TaskScore {
  const failed = checks.filter(check => !holds(check, content)).map(describeCheck)
  return { passed: failed.length === 0, failed }
}

function holds(check: TaskCheck, content: string): boolean {
  if (check.kind === 'includes') return content.includes(check.text)
  if (check.kind === 'excludes') return !content.includes(check.text)
  return !check.expression.test(content)
}

function describeCheck(check: TaskCheck): string {
  return `${check.kind} «${check.kind === 'excludes-pattern' ? check.pattern : check.text}»`
}

async function readSuite(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    throw new InvalidTaskSuiteError(path, '<archivo>', (error as Error).message)
  }
}

function parseDocument(path: string, text: string): JsonObject {
  let document: unknown
  try {
    document = JSON.parse(text) as unknown
  } catch (error) {
    throw new InvalidTaskSuiteError(path, '<raíz>', `no es JSON (${(error as Error).message})`)
  }
  if (!isObject(document)) throw new InvalidTaskSuiteError(path, '<raíz>', 'se espera un objeto')
  return document
}

function taskCase(path: string, value: unknown, index: number): TaskCase {
  const field = `cases[${index}]`
  if (!isObject(value) || typeof value.id !== 'string') throw new InvalidTaskSuiteError(path, field, 'se espera un objeto con id')
  if (!Array.isArray(value.messages) || value.messages.length === 0) throw new InvalidTaskSuiteError(path, `${field}.messages`, 'se espera una lista no vacía')
  if (!Array.isArray(value.checks) || value.checks.length === 0) {
    throw new InvalidTaskSuiteError(path, `${field}.checks`, 'un caso sin comprobaciones aprobaría cualquier respuesta')
  }
  return { id: value.id, messages: value.messages, checks: value.checks.map((check, at) => taskCheck(path, check, `${field}.checks[${at}]`)) }
}

function taskCheck(path: string, value: unknown, field: string): TaskCheck {
  if (!isObject(value)) throw new InvalidTaskSuiteError(path, field, 'se espera un objeto')
  if ((value.kind === 'includes' || value.kind === 'excludes') && nonEmptyText(value.text)) return { kind: value.kind, text: value.text }
  if (value.kind === 'excludes-pattern' && nonEmptyText(value.pattern)) {
    return { kind: 'excludes-pattern', pattern: value.pattern, expression: compiled(path, field, value.pattern) }
  }
  throw new InvalidTaskSuiteError(path, field, 'se espera includes/excludes con text, o excludes-pattern con pattern')
}

function compiled(path: string, field: string, pattern: string): RegExp {
  try {
    return new RegExp(pattern, UNICODE_FLAGS)
  } catch (error) {
    throw new InvalidTaskSuiteError(path, `${field}.pattern`, (error as Error).message)
  }
}

function isTaskClass(value: unknown): value is LocalTaskClass {
  return (LOCAL_TASK_CLASSES as readonly unknown[]).includes(value)
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
