/**
 * Clasificación de la build viva frente a lo que el árbol sabe de ella.
 *
 * El ejecutable vivo (`/opt/claude-code/bin/claude`) no tiene por qué ser la
 * versión canónica (`canonical.ts`): el contenedor se actualiza solo, y la
 * suite de fidelidad necesita distinguir tres estados en vez de un binario
 * medido/no medido:
 *
 *   - `measured`                  — hay una fila en `MEASURED` para esa
 *                                   versión: se compara byte a byte.
 *   - `unmeasured-without-corpus` — versión nueva, sin fila y sin corpus
 *                                   extraído. Es el estado legítimo tras una
 *                                   actualización del contenedor: no hay nada
 *                                   que comparar todavía.
 *   - `unmeasured-with-corpus`    — hay corpus en `_references/` para esa
 *                                   versión pero falta su fila en `MEASURED`.
 *                                   Esto NO es una build nueva: es una
 *                                   inconsistencia del árbol (el corpus se
 *                                   extrajo y la fila no se añadió).
 *
 * La función es pura: no lee el ejecutable ni el disco. Quien la llama le
 * entrega las tres listas ya derivadas.
 */

export type LiveBuildClassification = 'measured' | 'unmeasured-without-corpus' | 'unmeasured-with-corpus'

export type LiveBuildInput = {
  liveVersion: string
  measuredVersions: Iterable<string>
  corpusVersions: Iterable<string>
}

export function classifyLiveBuild({ liveVersion, measuredVersions, corpusVersions }: LiveBuildInput): LiveBuildClassification {
  const measured = new Set(measuredVersions)
  if (measured.has(liveVersion)) return 'measured'

  const corpus = new Set(corpusVersions)
  if (corpus.has(liveVersion)) return 'unmeasured-with-corpus'

  return 'unmeasured-without-corpus'
}
