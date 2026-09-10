/**
 * Puerto de `ccnmt: packages/agent/proactive/index.ts` (6 líneas, 100 %
 * portado). La propia fuente se declara "Auto-generated stub — replace with
 * real implementation": las cuatro funciones son no-ops fijos, sin
 * dependencias externas — no hay nada que divergir.
 *
 * Consumido (deferred `require`) por
 * `app-host: src/main/cli/runtimeActivation.ts` — antes de este porte, ese
 * `require('@thyrox/agent/proactive/index.js')` no resolvía ningún archivo;
 * ahora resuelve vía el `./*.js` wildcard de `agent/package.json`.
 */
export const isProactiveActive: () => boolean = () => false
export const activateProactive: (source?: string) => void = () => {}
export const isProactivePaused: () => boolean = () => false
export const deactivateProactive: () => void = () => {}
