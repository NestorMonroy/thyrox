/**
 * El modelo con el que arranca un compañero cuando nadie ha elegido uno.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/teammateModel.ts` (10 líneas,
 * 1 símbolo exportado). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * POR QUÉ ES CONSCIENTE DEL PROVEEDOR, y no es un detalle: el mismo modelo
 * tiene un identificador distinto en cada proveedor, así que devolver el de
 * primera parte a un cliente de Bedrock produce una petición que su endpoint
 * no entiende. La configuración se indexa por proveedor activo, no se elige
 * una cadena.
 *
 * DIVERGENCIA DECLARADA: la fuente lleva en un comentario el nombre comercial
 * del modelo que hace de respaldo. Aquí no viaja: qué modelo es el respaldo lo
 * decide el mapa que el anfitrión instala, no este archivo — es dominio del
 * despliegue, no del mecanismo.
 */
import { CLAUDE_OPUS_4_7_CONFIG, getAPIProvider } from '../adapters/appRuntime.js'

/**
 * El identificador del modelo de respaldo para el proveedor activo.
 *
 * Se consulta cuando el usuario nunca ha fijado un modelo de compañero en su
 * configuración.
 */
export function getHardcodedTeammateModelFallback(): string {
  return CLAUDE_OPUS_4_7_CONFIG[getAPIProvider()]!
}
