/**
 * Reexporta el porte, que vive en la ruta de la fuente
 * (`ccnmt: packages/agent/types/deps.ts` -> `types/deps.ts`). Hasta
 * aqui el porte vivia en este archivo, una ruta que la fuente no tiene, y
 * `types/deps.ts` guardaba una copia sin adaptar: el mismo modelo dos
 * veces en la misma capa. Mismo patron que `compactionDeps.ts`.
 */
export * from './types/deps.js'
// La superficie que sus consumidores piden y que vive en otro módulo del
// paquete (medido con src/verify/namedImports.ts).
export type { CoreMessage } from './types/messages.js'
