/**
 * La superficie publica del adaptador de OpenAI — porte de
 * `ccnmt: packages/provider/src/openai/index.ts` (6 lineas).
 *
 * Reexporta los seis modulos del directorio, en el mismo orden alfabetico que
 * la fuente. Es fachada pura: no declara nada propio.
 */
export * from './client.js'
export * from './convertMessages.js'
export * from './convertTools.js'
export * from './indexImpl.js'
export * from './modelMapping.js'
export * from './streamAdapter.js'
