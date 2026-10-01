/**
 * Del nombre con que Ollama lista un modelo instalado (`qwen2.5:0.5b`,
 * `ns/modelo:etiqueta`, `host/ns/modelo:etiqueta`) al repositorio que exige el
 * contrato de nombre: `<namespace>/<modelo>-<etiqueta>`. Sin namespace es
 * `library`, sin etiqueta es `latest`, como resuelve el propio registro.
 */

export const DEFAULT_NAMESPACE = 'library'
export const DEFAULT_TAG = 'latest'

const TAG_SEPARATOR = ':'
const PATH_SEPARATOR = '/'
const MAX_PATH_SEGMENTS = 3

export class InvalidOllamaNameError extends Error {
  constructor(readonly ollamaName: string, reason: string) {
    super(`nombre de Ollama «${ollamaName}» inválido: ${reason}`)
    this.name = 'InvalidOllamaNameError'
  }
}

/** El nombre completo con etiqueta, como lo publica `/api/tags`. */
export function withExplicitTag(ollamaName: string): string {
  return hasTag(ollamaName) ? ollamaName : `${ollamaName}${TAG_SEPARATOR}${DEFAULT_TAG}`
}

/** `<namespace>/<modelo>-<etiqueta>`; el host del registro, si viene, se descarta. */
export function repositoryOfOllamaName(ollamaName: string): string {
  const [path, tag] = splitTag(withExplicitTag(requireNonEmpty(ollamaName)))
  const segments = path.split(PATH_SEPARATOR)
  if (segments.length > MAX_PATH_SEGMENTS || segments.some(segment => segment === '')) {
    throw new InvalidOllamaNameError(ollamaName, `se espera [host/][namespace/]modelo, llegaron ${segments.length} segmentos`)
  }
  const model = segments[segments.length - 1] as string
  const namespace = segments.length > 1 ? segments[segments.length - 2] as string : DEFAULT_NAMESPACE
  return `${namespace}${PATH_SEPARATOR}${model}-${tag}`
}

function requireNonEmpty(ollamaName: string): string {
  if (ollamaName.trim() === '') throw new InvalidOllamaNameError(ollamaName, 'vacío')
  return ollamaName
}

/** La etiqueta va tras el último `:` posterior a la última `/`: un host puede llevar puerto. */
function hasTag(ollamaName: string): boolean {
  return ollamaName.lastIndexOf(TAG_SEPARATOR) > ollamaName.lastIndexOf(PATH_SEPARATOR)
}

function splitTag(taggedName: string): readonly [string, string] {
  const at = taggedName.lastIndexOf(TAG_SEPARATOR)
  return [taggedName.slice(0, at), taggedName.slice(at + 1)]
}
