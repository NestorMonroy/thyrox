/**
 * Porte fiel de `ccnmt: packages/permission/src/autoModeDenials.ts`
 * (26 líneas, 4 exports, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: el tipo `AutoModeDenial`, el estado modular
 * `DENIALS`/`MAX_DENIALS` y las dos funciones (`recordAutoModeDenial`,
 * `getAutoModeDenials`) están presentes, con el mismo comportamiento.
 *
 * Rastrea los comandos denegados recientemente por el clasificador de modo
 * automático. En la fuente se llena desde `useCanUseTool.ts` y se lee desde
 * `RecentDenialsTab.tsx` en `/permissions` — ninguno de los dos está
 * portado en este árbol (el primero es parte del subsistema clasificador
 * no portado; el segundo es un componente Ink sin sustrato de render en
 * este árbol), así que hoy este módulo no tiene consumidor propio — se
 * porta igual porque es zero-dependencia y es el estado que esos dos
 * futuros consumidores necesitarán sin cambios.
 *
 * Sin divergencias.
 */
import { feature } from 'bun:bundle'

export type AutoModeDenial = {
  toolName: string
  /** Descripción legible del comando denegado (p. ej. el string del comando bash) */
  display: string
  reason: string
  timestamp: number
}

let DENIALS: readonly AutoModeDenial[] = []
const MAX_DENIALS = 20

export function recordAutoModeDenial(denial: AutoModeDenial): void {
  if (!feature('TRANSCRIPT_CLASSIFIER')) return
  DENIALS = [denial, ...DENIALS.slice(0, MAX_DENIALS - 1)]
}

export function getAutoModeDenials(): readonly AutoModeDenial[] {
  return DENIALS
}
