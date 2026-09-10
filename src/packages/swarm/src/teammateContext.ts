/**
 * Fachada delgada de `src/utils/teammateContext` — porte de
 * `ccnmt: packages/swarm/src/teammateContext.ts`.
 *
 * Porte VERBATIM. La implementación canónica queda en
 * `./teammateContextAlias.ts` porque conecta una AsyncLocalStorage;
 * duplicarla entre límites de paquete rompería la propagación de contexto.
 * Este archivo existe para que los consumidores de `packages/*` se queden
 * dentro de la convención V7 §11.2 de la fuente.
 */
export {
  createTeammateContext,
  getTeammateContext,
  isInProcessTeammate,
  runWithTeammateContext,
} from './teammateContextAlias.js'
export type { TeammateContext } from './teammateContextAlias.js'
