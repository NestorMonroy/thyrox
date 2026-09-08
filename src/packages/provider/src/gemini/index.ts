/**
 * La superficie publica del adaptador de Gemini — porte de
 * `ccnmt: packages/provider/src/gemini/index.ts` (7 lineas).
 *
 * Reexporta los siete modulos del directorio, en el mismo orden alfabetico
 * que la fuente. Es fachada pura: no declara nada propio.
 *
 * DIFERENCIA con la fachada de OpenAI: aqui hay un septimo, `types.js`, que
 * la fuente tambien reexporta. `sseParser.js` NO esta en la lista — ni aqui
 * ni en la fuente: es detalle interno del cliente, no superficie publica.
 */
export * from './client.js'
export * from './convertMessages.js'
export * from './convertTools.js'
export * from './indexImpl.js'
export * from './modelMapping.js'
export * from './streamAdapter.js'
export * from './types.js'
