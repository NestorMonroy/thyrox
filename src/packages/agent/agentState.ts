/**
 * Reexporta el porte, que vive en la ruta de la fuente
 * (`ccnmt: packages/agent/types/state.ts` -> `types/state.ts`). Hasta
 * aqui el porte vivia en este archivo, una ruta que la fuente no tiene, y
 * `types/state.ts` guardaba una copia sin adaptar: el mismo modelo dos
 * veces en la misma capa. Mismo patron que `compactionDeps.ts`.
 */
export * from './types/state.js'
