/**
 * El hogar del banco de trabajo — un PARÁMETRO del consumidor, no un literal.
 *
 * Directiva del ejecutor 2026-09-06: *«todas las que requieran cablear el hogar
 * de algo definiendo una ruta, todas ellas la ruta tiene que ser pasada por una
 * CONSTANTE, y con dos entradas, ambas de entorno … el cablear algo hace que el
 * usuario que usa thyrox pierda la decisión de dónde van las cosas»*.
 *
 * LAS DOS ENTRADAS, con el nombre de cada una. La ilustración de la directiva
 * las nombra por separado y no son la misma cosa mirada dos veces:
 *
 *     worker_config   = get_secret("WORKER_CONFIG")        <- el VALOR, directo
 *     env_config_yaml = get_secret_str("CONFIG_FILE_PATH") <- la RUTA del archivo
 *                                                             que lo declara
 *
 * Aquí: `WORKBENCH_DIR_VAR` lleva el valor y `WORKBENCH_ENV_FILE_VAR` lleva la
 * ruta del archivo que puede declararlo. `envValue` de `paths/reach` las
 * consulta en ese orden — el proceso primero, porque quien exporta para UNA
 * invocación está corrigiendo a propósito lo que el archivo dice para todas.
 *
 * NO son dos fuentes de verdad para el mismo dato: son dos VÍAS de declaración
 * de un dato único. Una decide para esta invocación, la otra para el árbol.
 *
 * Su hermano exacto es `skills/paths.ts`, y de ahí sale la forma: un módulo
 * `<subsistema>/paths.ts` que importa `envValue` de `paths/reach.ts`, declara
 * su `*_DIR_VAR` y resuelve. Medido antes de nombrar este archivo: la familia
 * es `skills/paths.ts`, `packages/storage/src/path.ts` y `cache-paths.ts`, más
 * `memdir/paths.ts` en el corpus vendorizado. Ningún `home.ts` — así se llamó
 * este archivo en su primera versión, y era invención.
 *
 * Por qué NO hay default, que es la divergencia con los dos hermanos
 * ------------------------------------------------------------------
 * `agentsDir` y `skillsDir` caen al hogar propio de thyrox —`src/agents/
 * definitions`, `.claude/skills`— porque resuelven artefactos DE thyrox: su
 * propio árbol, sobre el que sí decide, y así el producto es usable sin
 * configurar nada. Un banco vive en el árbol del CONSUMIDOR y lo producen sus
 * sesiones; un default aquí es exactamente la decisión que la directiva retira
 * al emisor. Por eso este módulo REHÚSA, y su mensaje nombra la constante:
 * rehusar sin decir qué declarar no sirve de nada.
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
import { join } from 'node:path'

import { consumerRoot, envValue, resolveHome } from '../paths/reach.ts'

/**
 * Los dos segmentos del par, declarables por separado. La mitad Python los
 * tenia y esta no: se portan aqui porque `workbenchDir` los compone para su
 * default, y sin ellos el default seria una ruta cableada — el defecto que
 * `agentStorePath` ya nombra.
 *
 * A diferencia de `WORKBENCH_DIR_VAR`, estos SI caen a un default sin rehusar:
 * un nombre de segmento no decide donde aterrizan las piezas, solo como se
 * llama el tramo dentro de un arbol ya resuelto.
 */
export const STATE_DIR_VAR = 'THYROX_STATE_DIR'
export const STATE_DIR_DEFAULT = '.claude'
export const EVIDENCE_DIR_VAR = 'THYROX_EVIDENCE_DIR'
export const EVIDENCE_DIR_DEFAULT = 'workbench'

/** El segmento de estado declarado, o su default. Se resuelve AL LLAMAR. */
export function stateDir(start?: string): string {
  return envValue(STATE_DIR_VAR, start) || STATE_DIR_DEFAULT
}

/** El segmento de evidencia declarado, o su default. Ver `stateDir`. */
export function evidenceDir(start?: string): string {
  return envValue(EVIDENCE_DIR_VAR, start) || EVIDENCE_DIR_DEFAULT
}

/** Entrada 1 — el valor: el hogar declarado directamente. */
export const WORKBENCH_DIR_VAR = 'THYROX_WORKBENCH_DIR'

/**
 * Entrada 2 — la ruta del archivo que puede declararlo.
 *
 * Se re-exporta desde `paths/reach` en vez de re-declararse: el nombre lo fija
 * el localizador del `.env`, y escribirlo aquí otra vez crearía la segunda
 * fuente de verdad que este módulo existe para no tener.
 */
export { ENV_FILE_VAR as WORKBENCH_ENV_FILE_VAR } from '../paths/reach.ts'

/**
 * Ya no la lanza `workbenchDir`. Se conserva por sus capturadores: retirarla
 * rompería todo `catch (e) { if (e instanceof WorkbenchHomeError) }` vivo por
 * un cambio que no es de comportamiento sino de nombre.
 */
export class WorkbenchHomeError extends Error {}

/**
 * El hogar del banco: el declarado, o el que thyrox resuelve por ti.
 *
 * Dos desenlaces, y el segundo **no es un rehuse** — la misma forma que
 * `agentStorePath`, por la misma razón: lo prohibido nunca fue tener default,
 * fue **derivarlo por aritmética de la ruta del archivo**. Aquí sale de la
 * cadena declarada: `consumerRoot()` más los dos segmentos declarables.
 *
 * Esta función REHUSABA hasta el 2026-09-07. El rehuse apagaba el mecanismo
 * para todo consumidor que no hubiera tomado una decisión que casi ninguno
 * necesita tomar, y empujaba a teclear la ruta a mano — que es como once
 * bancos aterrizaron en el árbol del proveedor (L-028).
 *
 * @param start punto de partida para localizar el `.env`; por defecto el cwd.
 */
export function workbenchDir(start?: string): string {
  const home = consumerRoot(undefined, start)
  // El valor declarado pasa por `resolveHome`, igual que en la familia
  // `rules`. Se devolvia CRUDO, y eso dejaba a la clave sin su unica forma
  // util: como segmento relativo tiene que decir «en cada clon, este
  // subdirectorio», y devuelta cruda resolvia contra el CWD — el defecto
  // home-by-cwd de #284/#286 dentro de la familia que el registro publica.
  const declared = envValue(WORKBENCH_DIR_VAR, start)
  if (declared) return resolveHome(declared, home)
  return join(home, stateDir(start), evidenceDir(start))
}
