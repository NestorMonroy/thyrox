/**
 * Puerto de `ccnmt: packages/storage/src/safePatternMatch.ts` (22 líneas
 * fuente). CABLEADO PURO — el cuerpo de las dos funciones exportadas ES la
 * llamada a una dependencia npm:
 *
 *   - `safePicomatch` envuelve `picomatch.isMatch()` (paquete `picomatch`).
 *   - `safeIgnoreMatch` envuelve `ignore().add(patterns).ignores(path)`
 *     (paquete `ignore`).
 *
 * Símbolos de la fuente: 2 de 2. Ambos se portan VERBATIM (mismos imports,
 * mismo cuerpo) — no se reimplementa un matcher glob/gitignore reducido a
 * mano: `picomatch` e `ignore` tienen semántica de negación, ámbito de
 * segmento y casos límite (p. ej. `**`, `!patrón`, rutas absolutas vs.
 * relativas) que un sustituto simplificado reproduciría mal.
 *
 * Las dos dependencias están DECLARADAS e INSTALADAS desde 2026-09-07
 * (`picomatch` 4.0.7, `ignore` 7.0.8, ambas MIT) — ver :ref:`h-docs-1145`.
 * Antes de esa fecha este docstring declaraba su ausencia y el módulo no
 * cargaba; el fallo era latente porque ningún consumidor lo importa todavía.
 * El único consumidor en la fuente, `claudemd.ts`, ya está portado aquí y NO
 * las usa — verificado: un grep de los tres nombres sobre ese archivo da 0.
 */
import ignore from 'ignore'
import picomatch from 'picomatch'

export function safePicomatch(
  path: string,
  patterns: string[],
  options: { dot: boolean },
): boolean {
  try {
    return picomatch.isMatch(path, patterns, options)
  } catch {
    return false
  }
}

export function safeIgnoreMatch(patterns: string[], path: string): boolean {
  try {
    return ignore().add(patterns).ignores(path)
  } catch {
    return false
  }
}
