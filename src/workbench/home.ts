/**
 * El hogar del banco de trabajo — un PARÁMETRO del consumidor, no un literal.
 *
 * Directiva del ejecutor 2026-09-06: *«todas las que requieran cablear el hogar
 * de algo definiendo una ruta, todas ellas la ruta tiene que ser pasada por una
 * CONSTANTE, y con dos entradas, ambas de entorno … el cablear algo hace que el
 * usuario que usa thyrox pierda la decisión de dónde van las cosas»*.
 *
 * Las dos entradas son las que `envValue` de `paths/reach` ya fija: la variable
 * del proceso primero —quien exporta para UNA invocación está corrigiendo a
 * propósito lo que el archivo dice para todas— y la declaración del `.env`
 * después. Mismo mecanismo que `agentsDir`, sin un tercer camino.
 *
 * Por qué NO hay default, que es la asimetría con `agentsDir`
 * -----------------------------------------------------------
 * `agentsDir` resuelve un hogar **de thyrox** —`src/agents/definitions`, su
 * propio árbol— y por eso puede caer a él: el producto es usable sin configurar
 * nada porque thyrox sí decide sobre lo suyo. Un banco vive en el árbol del
 * CONSUMIDOR y lo producen sus sesiones; un default aquí es exactamente la
 * decisión que la directiva retira al emisor. Por eso este módulo REHÚSA, y su
 * mensaje nombra la constante: rehusar sin decir qué declarar no sirve de nada.
 *
 * El defecto medido que lo motiva está en el árbol, no es hipotético:
 * `packages/harness/src/workbench/manifest.ts` cablea el hogar tres veces —el
 * parámetro se llama `eventosDir`, el `join` asume ese nombre, y
 * `resolve(eventosDir, '..', '..')` asume además su PROFUNDIDAD para escribir
 * `.ruta-del-evento`—. Un consumidor que aloje su banco a otra profundidad
 * obtiene una ruta relativa incorrecta y nada falla.
 *
 * NO se verifica que el directorio exista, por el mismo criterio que
 * `agentsDir`: un hogar declarado y ausente es un hecho del consumidor que su
 * llamador tiene que poder ver. Crearlo aquí escondería la divergencia que este
 * mecanismo existe para exponer.
 */
import { envValue } from '../paths/reach'

/** La constante. Una sola: dos nombres serían dos fuentes de verdad. */
export const WORKBENCH_DIR_VAR = 'THYROX_WORKBENCH_DIR'

/** Se rehúsa cuando el consumidor no declaró su hogar. No es un fallo del emisor. */
export class WorkbenchHomeError extends Error {}

/**
 * El hogar declarado del banco, o rehusar.
 *
 * @param start punto de partida para localizar el `.env`; por defecto el cwd.
 */
export function workbenchDir(start?: string): string {
  const declared = envValue(WORKBENCH_DIR_VAR, start)
  if (declared) return declared
  throw new WorkbenchHomeError(
    `El hogar del banco no está declarado. Es una decisión del consumidor, no de `
    + `thyrox: declara ${WORKBENCH_DIR_VAR} en el proceso o en tu .env. `
    + `NO se emite un hogar por defecto: inventarlo decidiría por ti dónde van `
    + `tus piezas.`,
  )
}
