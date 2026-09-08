/**
 * El control del manifiesto: que cada evidencia citada siga existiendo.
 *
 * Qué mide y qué NO. NO mide si thyrox cumple un predicado — eso es juicio, y
 * vive declarado en `checklist.ts` con su cita. Mide que las citas no se hayan
 * quedado atrás: un módulo renombrado o retirado deja el manifiesto afirmando
 * sobre un archivo que ya no está, y sin este control nada lo delataría.
 *
 * Es el mismo papel que el quinto instrumento de `niveles-de-retencion.md`:
 * los otros cuatro miden lo que existe, y por eso ninguno puede fallar por una
 * ausencia. Éste toma como universo una enumeración hecha ANTES —las
 * evidencias declaradas— y por eso sí puede.
 *
 * Lo que sigue siendo su ceguera, y se declara: un archivo puede existir y
 * haber dejado de contener el mecanismo que se le atribuye. Cerrar eso exige
 * anclar la cita a un símbolo y no a una ruta, que es trabajo aparte.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Predicate } from './checklist.ts'

export type BrokenEvidence = { id: string; path: string }

/** Las evidencias declaradas que ya no están en el árbol. */
export function auditEvidence(lista: readonly Predicate[], root: string): BrokenEvidence[] {
  const rotas: BrokenEvidence[] = []
  for (const p of lista) {
    for (const ruta of p.evidence) {
      if (!existsSync(join(root, ruta))) rotas.push({ id: p.id, path: ruta })
    }
  }
  return rotas
}
