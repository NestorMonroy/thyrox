/**
 * Contrato de nombre de un modelo gestionado por thyrox:
 * `thyrox-<org>--<repo>:<quant>-<source>-<revision12>`, en minúsculas.
 *
 * El nombre identifica el modelo con su repositorio, nivel, fuente y revisión
 * exacta, y el prefijo `thyrox-` lo separa de lo que un usuario creó a mano:
 * N modelos conviven sin interferir. `--` entre organización y repositorio es
 * la convención de la caché de Hugging Face; del registro de Ollama el
 * repositorio es `<namespace>/<modelo>-<etiqueta>`.
 */

import { normalizeQuantizationLevel, type QuantizationLevel } from './quantizationLevel.js'

export type ModelSource = 'hf' | 'ollama'

export interface ThyroxModelNameParts {
  /** `org/repo` de Hugging Face o `<namespace>/<modelo>-<etiqueta>` del registro. */
  readonly repository: string
  readonly quantization: string
  readonly source: ModelSource
  /** Commit de HF (40 hex), digest del manifiesto (`sha256:`+64 hex) o sus 12 primeros hex. */
  readonly revision: string
}

export interface ParsedThyroxModelName {
  readonly repository: string
  readonly quantization: QuantizationLevel
  readonly source: ModelSource
  readonly revision: string
}

export const THYROX_MODEL_PREFIX = 'thyrox-'
const REPOSITORY_SEPARATOR = '--'
const REVISION_PREFIX_LENGTH = 12

/**
 * Longitud máxima de cada lado del `:` (modelo y etiqueta). Medido contra
 * Ollama 0.35.0 (`podman exec thyrox-ollama ollama cp …`, 2026-09-30): 80
 * caracteres se aceptan, 81 dan `destination … is invalid`, en el modelo y en
 * la etiqueta por separado; 80+80 juntos se aceptan.
 */
export const OLLAMA_NAME_PART_MAX_LENGTH = 80

/**
 * Alfabeto de una parte del nombre. Medido en la misma sesión: `.`, `_` y `-`
 * se aceptan; `+` da `is invalid`, y una etiqueta que empieza por `-` también.
 * Ollama acepta mayúsculas, pero el contrato normaliza a minúsculas.
 */
const NAME_PART_ALPHABET = /^[a-z0-9._-]+$/

/** Una organización sin `--` ni guion final: si no, el inverso no la recupera. */
const ORGANIZATION_PATTERN = /^[a-z0-9._]+(?:-[a-z0-9._]+)*$/

const HF_COMMIT_PATTERN = /^[0-9a-f]{40}$/
const OLLAMA_DIGEST_PATTERN = /^(?:sha256:)?[0-9a-f]{64}$/
const REVISION_PREFIX_PATTERN = /^[0-9a-f]{12}$/

const REVISION_PATTERN_BY_SOURCE: Readonly<Record<ModelSource, RegExp>> = {
  hf: HF_COMMIT_PATTERN,
  ollama: OLLAMA_DIGEST_PATTERN,
}

const THYROX_NAME_PATTERN = /^thyrox-(.+):([a-z0-9_]+)-([a-z]+)-([0-9a-f]{12})$/

export class InvalidModelNameInputError extends Error {
  constructor(readonly field: string, readonly value: string, reason: string) {
    super(`${field} «${value}» no forma un nombre thyrox-: ${reason}`)
    this.name = 'InvalidModelNameInputError'
  }
}

/** Compone el nombre del contrato; rehúsa con el campo que lo impide. */
export function thyroxModelName(parts: ThyroxModelNameParts): string {
  const source = requireSource(parts.source)
  const model = `${THYROX_MODEL_PREFIX}${repositorySlug(parts.repository)}`
  const tag = `${normalizeQuantizationLevel(parts.quantization)}-${source}-${revisionPrefix(parts.revision, source)}`
  requireWithinOllamaLimit('model', model)
  requireWithinOllamaLimit('tag', tag)
  return `${model}:${tag}`
}

/** Las partes de un nombre del contrato, o `undefined` si el nombre no es de thyrox. */
export function parseThyroxModelName(name: string): ParsedThyroxModelName | undefined {
  const match = THYROX_NAME_PATTERN.exec(name)
  if (!match) return undefined
  const [, slug = '', quantization = '', source = '', revision = ''] = match
  const separatorAt = slug.indexOf(REPOSITORY_SEPARATOR)
  if (separatorAt < 0) return undefined
  const repository = `${slug.slice(0, separatorAt)}/${slug.slice(separatorAt + REPOSITORY_SEPARATOR.length)}`
  return rebuildsExactly(name, { repository, quantization, source: source as ModelSource, revision })
}

function rebuildsExactly(name: string, parts: ThyroxModelNameParts): ParsedThyroxModelName | undefined {
  try {
    if (thyroxModelName(parts) !== name) return undefined
  } catch {
    return undefined
  }
  return { ...parts, quantization: normalizeQuantizationLevel(parts.quantization) }
}

function requireSource(source: string): ModelSource {
  if (!Object.hasOwn(REVISION_PATTERN_BY_SOURCE, source)) {
    throw new InvalidModelNameInputError('source', source, 'se admite hf u ollama')
  }
  return source as ModelSource
}

function repositorySlug(repository: string): string {
  const segments = repository.toLowerCase().split('/')
  if (segments.length !== 2) {
    throw new InvalidModelNameInputError('repository', repository, 'se espera exactamente una / (org/repo)')
  }
  const [organization = '', model = ''] = segments
  if (!ORGANIZATION_PATTERN.test(organization)) {
    throw new InvalidModelNameInputError('repository', repository, `organización «${organization}» vacía, con -- o con guion en un extremo`)
  }
  if (!NAME_PART_ALPHABET.test(model)) {
    throw new InvalidModelNameInputError('repository', repository, `«${model}» fuera del alfabeto [a-z0-9._-]`)
  }
  return `${organization}${REPOSITORY_SEPARATOR}${model}`
}

function revisionPrefix(revision: string, source: ModelSource): string {
  const lowered = revision.toLowerCase()
  if (!REVISION_PATTERN_BY_SOURCE[source].test(lowered) && !REVISION_PREFIX_PATTERN.test(lowered)) {
    throw new InvalidModelNameInputError('revision', revision, `no es una revisión hex de ${source} ni su prefijo de ${REVISION_PREFIX_LENGTH}`)
  }
  return lowered.replace(/^sha256:/, '').slice(0, REVISION_PREFIX_LENGTH)
}

function requireWithinOllamaLimit(part: string, value: string): void {
  if (value.length > OLLAMA_NAME_PART_MAX_LENGTH) {
    throw new InvalidModelNameInputError(part, value, `${value.length} caracteres, Ollama admite ${OLLAMA_NAME_PART_MAX_LENGTH}`)
  }
}
