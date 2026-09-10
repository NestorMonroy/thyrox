/**
 * Porte COMPLETO de `ccnmt: packages/agent/messagesConstants.ts` (9 lineas,
 * 2 de 2 simbolos exportados).
 *
 * Vive aparte de `messages.ts` por la misma razon que en la fuente: el
 * conjunto se consulta desde la compactacion y la telemetria de uso, que no
 * deben arrastrar las 5690 lineas del modulo grande para preguntar si un
 * mensaje es sintetico.
 *
 * Las cinco cadenas se repiten aqui literalmente en vez de importarse de
 * `messages.ts` — igual que la fuente. No es duplicacion por descuido: si el
 * conjunto se construyera desde las constantes, un cambio de redaccion las
 * moveria a la vez y el test de contrato no podria ver la deriva.
 */

/** Centinela en el campo `model`: marca salida que el modelo no produjo. */
export const SYNTHETIC_MODEL = '<synthetic>'

/** Las cinco cadenas que `isSyntheticMessage` reconoce por igualdad exacta. */
export const SYNTHETIC_MESSAGES = new Set([
  '[Request interrupted by user]',
  '[Request interrupted by user for tool use]',
  "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed.",
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.",
  'No response requested.',
])
