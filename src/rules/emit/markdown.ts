/**
 * Renderiza una `RuleDefinition` al `.md` que el consumidor carga.
 *
 * Dos cosas que el renderizador NO hace, y las dos son deliberadas:
 *
 * - **No inventa un valor de parámetro.** Si una clave no está declarada ni
 *   trae `fallback`, lanza. Emitir con el marcador sin resolver publicaría
 *   prosa incumplible, y emitir con un valor inventado publicaría una
 *   identidad falsa — el defecto es peor que la ausencia.
 * - **No pone `paths:` en una regla universal.** El campo apaga la regla
 *   fuera de sus globos; una universal con filtro sería una regla que dice
 *   gobernar todo y gobierna una carpeta.
 *
 * Lo que sí hace siempre: **estampar el sello de procedencia**
 * (`provenance.ts`). Sin él, tres consumidores con la misma regla emitida
 * caen en `divergente (0 linea(s))` —dos copias idénticas no se subsumen— y
 * el emisor empeoraría la cifra que existe para justificarlo.
 */
import type { RuleDefinition } from '../types.ts'
import { envValue } from '../../paths/reach.ts'
import { emittedMarker } from '../provenance.ts'

/** El marcador de un parámetro en el cuerpo. */
const PLACEHOLDER = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g

export class UnresolvedParameterError extends Error {}

/**
 * Resuelve los parámetros contra el entorno del consumidor.
 *
 * @param start la raíz desde la que se busca el `.env` del consumidor.
 */
export function resolveParameters(
  definition: RuleDefinition,
  start?: string,
): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const parameter of definition.parameters ?? []) {
    const declared = envValue(parameter.envVar, start) ?? parameter.fallback
    if (declared === undefined) {
      throw new UnresolvedParameterError(
        `La regla '${definition.name}' declara el parámetro '${parameter.name}' ` +
          `(${parameter.description}) y el consumidor no lo declara: define ` +
          `${parameter.envVar} en su entorno o en su .env. NO se emite: un ` +
          `marcador sin resolver publicaria prosa que nadie puede cumplir.`,
      )
    }
    resolved[parameter.name] = declared
  }
  return resolved
}

/** Sustituye los marcadores; lanza ante uno que ningún parámetro declara. */
export function render(body: string, values: Record<string, string>): string {
  return body.replace(PLACEHOLDER, (match, name: string) => {
    if (!(name in values)) {
      throw new UnresolvedParameterError(
        `El cuerpo usa {{${name}}} y la definicion no lo declara como ` +
          `parametro. NO se emite con el marcador crudo.`,
      )
    }
    return values[name]
  })
}

export function toMarkdown(definition: RuleDefinition, start?: string): string {
  if (definition.scope === 'domain' && !definition.paths?.length) {
    throw new UnresolvedParameterError(
      `La regla '${definition.name}' se declara de dominio y no trae paths: ` +
        `sin el filtro seria piso siempre-cargado con otro nombre.`,
    )
  }
  if (definition.scope === 'universal' && definition.paths?.length) {
    throw new UnresolvedParameterError(
      `La regla '${definition.name}' se declara universal y trae paths: el ` +
        `campo la apagaria fuera de sus globos.`,
    )
  }
  const body = render(definition.body, resolveParameters(definition, start))
  const sello = `${emittedMarker(definition.name)}\n\n`
  const cuerpo = body.endsWith('\n') ? body : `${body}\n`
  if (definition.scope === 'universal') return sello + cuerpo

  // El sello va DESPUES del frontmatter, no antes: el cliente lee `paths:` de
  // la cabecera y un comentario delante la dejaria de ver. Sigue dentro de la
  // ventana de 12 lineas que `check_rule_divergence.HEADER_LINES` inspecciona.
  const globs = definition.paths!.map((glob) => `  - "${glob}"`).join('\n')
  const front = `---\npaths:\n${globs}\n---\n\n`
  return front + sello + cuerpo
}
