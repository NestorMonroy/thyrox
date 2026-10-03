/**
 * Suite de cualificación de FLUJO (TASK-THYROX-0931): mide el worker entero
 * —inspeccionar, buscar lo existente, editar, correr la prueba, ver el fallo,
 * reparar— sobre un repositorio de práctica versionado, en un worktree
 * aislado. Cada caso es un ítem de `headless-pool` con su verify; aprueba sólo
 * si el pool lo declara `verificado`.
 *
 * Es un conjunto de CUALIFICACIÓN: la aceptación de la autoimplementación usa
 * otra tarea, para no medir el modelo contra lo que ya se le enseñó.
 *
 * Métrica: verdict del pool por caso, binario.
 * Ciega a: la calidad del código más allá de lo que el verify comprueba.
 */

import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { LOCAL_TASK_CLASSES, type LocalTaskClass } from '@thyrox/model-artifacts/modelQualification.ts'

/** La suite versionada de este paquete. */
export const REPO_CODE_CHANGE_SUITE_PATH = `${import.meta.dir}/suites/repo-code-change-1/suite.json`

export interface WorkflowCase {
  readonly id: string
  /** El ítem que recibe el worker. */
  readonly item: string
  /** El comando que el pool corre en el worktree del ítem. */
  readonly verify: string
}

export interface WorkflowSuite {
  readonly id: string
  readonly taskClass: LocalTaskClass
  /** La plantilla del pool, resuelta junto a la suite. */
  readonly promptPath: string
  /** Las herramientas que el worker recibe; las registra el perfil de runtime. */
  readonly tools: readonly string[]
  readonly cases: readonly WorkflowCase[]
}

export class InvalidWorkflowSuiteError extends Error {
  constructor(readonly path: string, readonly field: string, reason: string) {
    super(`suite de flujo inválida (${path}) en ${field}: ${reason}`)
    this.name = 'InvalidWorkflowSuiteError'
  }
}

type JsonObject = Record<string, unknown>

export async function loadWorkflowSuite(path: string): Promise<WorkflowSuite> {
  const document = parseDocument(path, await readFile(path, 'utf8'))
  const id = requireText(path, document, 'id')
  if (!isTaskClass(document.taskClass)) {
    throw new InvalidWorkflowSuiteError(path, 'taskClass', `se espera una de ${LOCAL_TASK_CLASSES.join(', ')}`)
  }
  const promptPath = resolve(dirname(path), requireText(path, document, 'prompt'))
  await access(promptPath).catch(() => { throw new InvalidWorkflowSuiteError(path, 'prompt', `no existe ${promptPath}`) })
  const cases = document.cases
  if (!Array.isArray(cases) || cases.length === 0) throw new InvalidWorkflowSuiteError(path, 'cases', 'se espera una lista no vacía')
  return {
    id,
    taskClass: document.taskClass,
    promptPath,
    tools: requireToolNames(path, document.tools),
    cases: cases.map((value, index) => workflowCase(path, value, index)),
  }
}

function workflowCase(path: string, value: unknown, index: number): WorkflowCase {
  const field = `cases[${index}]`
  if (!isObject(value)) throw new InvalidWorkflowSuiteError(path, field, 'se espera un objeto')
  return {
    id: requireText(path, value, 'id', field),
    item: requireText(path, value, 'item', field),
    verify: requireText(path, value, 'verify', field),
  }
}

function requireToolNames(path: string, value: unknown): string[] {
  const valid = Array.isArray(value) && value.length > 0 && value.every(name => typeof name === 'string' && name !== '')
  if (!valid) throw new InvalidWorkflowSuiteError(path, 'tools', 'se espera una lista no vacía de nombres')
  return [...value]
}

function requireText(path: string, record: JsonObject, key: string, parent?: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value === '') {
    throw new InvalidWorkflowSuiteError(path, parent === undefined ? key : `${parent}.${key}`, 'se espera una cadena no vacía')
  }
  return value
}

function parseDocument(path: string, text: string): JsonObject {
  let document: unknown
  try {
    document = JSON.parse(text)
  } catch (error) {
    throw new InvalidWorkflowSuiteError(path, '(raíz)', `JSON ilegible: ${(error as Error).message}`)
  }
  if (!isObject(document)) throw new InvalidWorkflowSuiteError(path, '(raíz)', 'se espera un objeto')
  return document
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTaskClass(value: unknown): value is LocalTaskClass {
  return typeof value === 'string' && (LOCAL_TASK_CLASSES as readonly string[]).includes(value)
}
