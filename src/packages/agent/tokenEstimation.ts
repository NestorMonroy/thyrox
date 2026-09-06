/**
 * Porte PARCIAL de `ccnmt: packages/agent/tokenEstimation.ts`.
 *
 * La fuente declara además `countTokensWithAPI`, `countMessagesTokensWithAPI`,
 * `countTokensViaHaikuFallback`, `countTokensWithBedrock`,
 * `roughTokenCountEstimationForMessages(ForMessage/ForContent/ForBlock)` y
 * `roughTokenCountEstimationForAPIRequest`: todas dependen de
 * `@anthropic-ai/sdk`, `@claude-code-how-works/provider/**`,
 * `@aws-sdk/client-bedrock-runtime` y de `./attachments.js`/`./messages.js`
 * /`./toolSearch.js` — ninguno de esos módulos vive todavía en este árbol.
 *
 * DIVERGENCIA DE ALCANCE, declarada: aquí sólo se portan los tres
 * ayudantes PUROS que `__tests__/tokenEstimation.test.ts` y
 * `__tests__/tokenEstimation.behavior.test.ts` ejercitan —
 * `bytesPerTokenForFileType`, `roughTokenCountEstimation` y
 * `roughTokenCountEstimationForFileType`— porque son las únicas que no
 * requieren el SDK. El resto se porta cuando su consumidor real llegue al
 * árbol.
 *
 * Cifra de calibración conservada VERBATIM (es el comportamiento, no un
 * detalle de implementación): 1.5 tokens por carácter CJK.
 */

// CJK Unified Ideographs + extensiones + bloques de compatibilidad + puntuación.
// Cada carácter CJK ocupa 1 unidad de string en JS pero ~1.5 tokens BPE en
// promedio, lo que hace que la fórmula estándar /4 subestime entre 4 y 8
// veces para chino/japonés.
const CJK_REGEX =
  /[⺀-⻿⼀-⿟　-〿぀-ゟ゠-ヿ㄀-ㄯ㈀-㋿㐀-䶿一-鿿豈-﫿︰-﹏]/g

export function roughTokenCountEstimation(
  content: string,
  bytesPerToken: number = 4,
): number {
  const cjkMatches = content.match(CJK_REGEX)
  if (!cjkMatches || cjkMatches.length === 0) {
    return Math.round(content.length / bytesPerToken)
  }
  const cjkCount = cjkMatches.length
  const nonCjkLength = content.length - cjkCount
  // Caracteres CJK: ~1.5 tokens cada uno; no-CJK: usa la razón dada por
  // el llamador.
  return Math.round(nonCjkLength / bytesPerToken + cjkCount * 1.5)
}

/**
 * Devuelve una razón bytes-por-token estimada para una extensión de
 * archivo dada. El JSON denso tiene muchos tokens de un solo carácter
 * (`{`, `}`, `:`, `,`, `"`), lo que hace que la razón real sea más
 * cercana a 2 que al 4 por defecto.
 */
export function bytesPerTokenForFileType(fileExtension: string): number {
  switch (fileExtension) {
    case 'json':
    case 'jsonl':
    case 'jsonc':
      return 2
    default:
      return 4
  }
}

/**
 * Como {@link roughTokenCountEstimation} pero usa una razón bytes-por-token
 * más precisa cuando el tipo de archivo es conocido.
 *
 * Importa cuando el conteo de tokens vía API no está disponible (p. ej. en
 * Bedrock) y se cae al estimado aproximado — un subconteo puede dejar
 * pasar un resultado de herramienta sobredimensionado.
 */
export function roughTokenCountEstimationForFileType(
  content: string,
  fileExtension: string,
): number {
  return roughTokenCountEstimation(
    content,
    bytesPerTokenForFileType(fileExtension),
  )
}
