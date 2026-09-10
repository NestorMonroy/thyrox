/**
 * Lectores puros de variables de entorno.
 *
 * PORTE COMPLETO — pase de 2026-09-09. La fuente (`ccnmt:
 * packages/config/env/utils.ts`, 224 líneas, licencia UNLICENSED —
 * reimplementación, no copia) declara 18 exports, no 17: una revisión
 * anterior de este docstring enumeraba 17 y omitía `isBareMode` de la
 * lista — la propia cuenta ya arrastraba el porte parcial. Los 18:
 * `getClaudeConfigHomeDir`, `getTeamsDir`, `hasNodeOption`, `isEnvTruthy`,
 * `isEnvDefinedFalsy`, `isBareMode`, `parseEnvVars`, `getAWSRegion`,
 * `getDefaultVertexRegion`, `shouldMaintainProjectWorkingDir`,
 * `isRunningOnHomespace`, `setCheckProtectedNamespaceFn`,
 * `isInProtectedNamespace`, `getVertexRegionForModel`, `readEnv`,
 * `getAllEnv`, `setEnv`, `deleteEnv`.
 *
 * Historial de cobertura: `@thyrox/shell`'s `subprocessEnv.ts` consumía tres
 * (`getAllEnv`, `isEnvTruthy`, `readEnv`); el porte de
 * `config/env/git-settings.ts` y `config/env/paths.ts` sumó dos más
 * (`isEnvDefinedFalsy`, `getClaudeConfigHomeDir`) — completados entonces en
 * vez de fabricarlos en el sitio consumidor, siguiendo el mismo criterio que
 * `paths/reach.ts: consumerRoot` («un porte parcial declarado se completa
 * cuando aparece su consumidor» — `porte-completo-no-parcial.md`). Este
 * pase (2026-09-09) cierra los 13 restantes: ninguno tiene dependencia
 * transitiva nueva — todos usan sólo `process.env`/`process.argv` y los
 * cinco ya presentes (`isEnvTruthy`, `getClaudeConfigHomeDir`).
 *
 * Hallazgo, no corregido aquí (fuera del alcance de este archivo):
 * `@thyrox/agent: internalUtils.ts:59,149` y
 * `@thyrox/provider: authAlias.ts:144` ya declaran su PROPIA copia local de
 * `isEnvTruthy`/`isBareMode` en vez de importar de aquí — la primera incluso
 * importa `readEnv` de este mismo módulo dos líneas más arriba de la
 * duplicación. Con `isBareMode` ya portado en este pase, esos dos archivos
 * podrían dejar de fabricarlo — pero eso es una edición de `agent`/`provider`,
 * fuera del alcance de esta tarea.
 *
 * @module
 */
import memoize from 'lodash-es/memoize.js'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Interpreta un valor de variable de entorno como verdadero/falso, con la
 * misma tolerancia de forma que usa el resto del proyecto: `1`, `true`,
 * `yes`, `on` (sin distinguir mayúsculas, con espacios al margen) cuentan
 * como verdadero; cualquier otra cosa, incluida la cadena vacía o
 * `undefined`, como falso. */
export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalized = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

/** Lector genérico de una variable de entorno arbitraria. */
export function readEnv(name: string): string | undefined {
  return process.env[name]
}

/** Fotografía del entorno completo — para pasarlo a un subproceso o
 * mezclarlo con settings, en vez de esparcir `{ ...process.env }` a mano. */
export function getAllEnv(): Record<string, string | undefined> {
  return { ...process.env }
}

/** El inverso booleano de `isEnvTruthy`: verdadero sólo cuando la variable
 * está DECLARADA y su valor la marca falsa (`0`, `false`, `no`, `off`). Una
 * variable ausente no cuenta — no equivale a "declarada como falsa". */
export function isEnvDefinedFalsy(
  envVar: string | boolean | undefined,
): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  const normalized = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalized)
}

/** El directorio de configuración del usuario: `CLAUDE_CONFIG_DIR`, o
 * `~/.claude`. Memoizado — se lee en cientos de sitios y se normaliza a NFC
 * una sola vez; la clave del memo es el propio valor de la variable, así que
 * un test que la cambie ve el nuevo valor sin `cache.clear()` explícito. */
export const getClaudeConfigHomeDir = memoize(
  (): string => {
    return (
      process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
    ).normalize('NFC')
  },
  () => process.env.CLAUDE_CONFIG_DIR,
)

/** El directorio de equipos, anidado bajo el de configuración del usuario. */
export function getTeamsDir(): string {
  return join(getClaudeConfigHomeDir(), 'teams')
}

/**
 * ¿Trae `NODE_OPTIONS` un flag concreto? Compara por token completo tras
 * partir por espacios — nunca por subcadena, para no confundir `--foo` con
 * un `--foobar` que lo empieza igual.
 */
export function hasNodeOption(flag: string): boolean {
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions) return false
  return nodeOptions.split(/\s+/).includes(flag)
}

/**
 * `--bare` / `CLAUDE_CODE_SIMPLE`: el modo que salta la contabilidad de
 * fondo (sugerencia de prompt, extracción de memoria, auto-dream). Las dos
 * vías gobiernan alcances distintos y no son intercambiables: la variable
 * de entorno gobierna el proceso entero; el flag de línea de comandos,
 * sólo esta invocación.
 */
export function isBareMode(): boolean {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) ||
    process.argv.includes('--bare')
  )
}

/**
 * Convierte un arreglo de cadenas `KEY=value` (típicamente de `-e`/`--env`
 * en la línea de comandos) en un objeto. Sólo el PRIMER `=` separa clave de
 * valor — el resto queda dentro del valor, así que `KEY=a=b` da
 * `{ KEY: 'a=b' }`, no un truncamiento.
 * @throws {Error} si una entrada no tiene forma `CLAVE=valor`.
 */
export function parseEnvVars(
  rawEnvArgs: string[] | undefined,
): Record<string, string> {
  const parsed: Record<string, string> = {}
  if (!rawEnvArgs) return parsed
  for (const entry of rawEnvArgs) {
    const [key, ...rest] = entry.split('=')
    if (!key || rest.length === 0) {
      throw new Error(
        `Invalid environment variable format: ${entry}, environment variables should be added as: -e KEY1=value1 -e KEY2=value2`,
      )
    }
    parsed[key] = rest.join('=')
  }
  return parsed
}

/** Región de AWS, con la misma cascada de respaldo que usa el SDK de
 * Bedrock de Anthropic: `AWS_REGION`, luego `AWS_DEFAULT_REGION`, luego
 * `us-east-1`. */
export function getAWSRegion(): string {
  return (
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
  )
}

/** Región de Vertex AI por defecto, cuando ningún override específico de
 * modelo aplica. */
export function getDefaultVertexRegion(): string {
  return process.env.CLOUD_ML_REGION || 'us-east5'
}

/** ¿Debe un comando bash restaurar el directorio de trabajo del proyecto
 * después de cada invocación? Gobernado por `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`. */
export function shouldMaintainProjectWorkingDir(): boolean {
  return isEnvTruthy(process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR)
}

/** ¿Corre esto en Homespace (el entorno cloud interno de Anthropic)? Exige
 * las DOS señales — `USER_TYPE=ant` Y `COO_RUNNING_ON_HOMESPACE` verdadera —
 * porque cualquiera de las dos sola es ambigua fuera de ese entorno. */
export function isRunningOnHomespace(): boolean {
  return (
    process.env.USER_TYPE === 'ant' &&
    isEnvTruthy(process.env.COO_RUNNING_ON_HOMESPACE)
  )
}

// ---------------------------------------------------------------------------
// isInProtectedNamespace — probe inyectado por el anfitrión, sólo-Anthropic
// ---------------------------------------------------------------------------

let checkProtectedNamespace: () => boolean = () => false

/** Instala el probe real que decide si el clúster/namespace es protegido.
 * Sin instalar, el respaldo es `() => false` — conservador hacia el lado
 * "no reportar protegido", no hacia el lado "asumir protegido". */
export function setCheckProtectedNamespaceFn(fn: () => boolean): void {
  checkProtectedNamespace = fn
}

/**
 * ¿Corre esto dentro de un namespace/clúster COO protegido (privilegiado o
 * ASL3+)? Sólo tiene sentido preguntarlo para `USER_TYPE=ant` — fuera de
 * ese universo la respuesta es `false` sin siquiera consultar el probe, que
 * es exactamente lo que un test de este archivo verifica con un contador de
 * llamadas.
 *
 * Uso: telemetría para medir el uso de auto-mode en entornos sensibles.
 */
export function isInProtectedNamespace(): boolean {
  if (process.env.USER_TYPE !== 'ant') return false
  return checkProtectedNamespace()
}

// ---------------------------------------------------------------------------
// Overrides de región de Vertex por modelo
// ---------------------------------------------------------------------------

/**
 * Prefijo de modelo → variable de entorno del override de región Vertex.
 * El ORDEN importa: un prefijo más específico va ANTES que uno más corto
 * que lo contiene (p. ej. `claude-opus-4-1` antes que `claude-opus-4`),
 * porque `find` se queda con el primer prefijo que matchea.
 */
const VERTEX_REGION_OVERRIDES: ReadonlyArray<readonly [string, string]> = [
  ['claude-haiku-4-5', 'VERTEX_REGION_CLAUDE_HAIKU_4_5'],
  ['claude-3-5-haiku', 'VERTEX_REGION_CLAUDE_3_5_HAIKU'],
  ['claude-3-5-sonnet', 'VERTEX_REGION_CLAUDE_3_5_SONNET'],
  ['claude-3-7-sonnet', 'VERTEX_REGION_CLAUDE_3_7_SONNET'],
  ['claude-opus-4-1', 'VERTEX_REGION_CLAUDE_4_1_OPUS'],
  ['claude-opus-4', 'VERTEX_REGION_CLAUDE_4_0_OPUS'],
  ['claude-sonnet-4-6', 'VERTEX_REGION_CLAUDE_4_6_SONNET'],
  ['claude-sonnet-4-5', 'VERTEX_REGION_CLAUDE_4_5_SONNET'],
  ['claude-sonnet-4', 'VERTEX_REGION_CLAUDE_4_0_SONNET'],
]

/** Región de Vertex AI para un modelo dado — busca el override más
 * específico que matchee su prefijo; sin modelo, sin match, o sin la
 * variable de entorno del override declarada, cae al default de Vertex. */
export function getVertexRegionForModel(
  model: string | undefined,
): string | undefined {
  if (model) {
    const match = VERTEX_REGION_OVERRIDES.find(([prefix]) =>
      model.startsWith(prefix),
    )
    if (match) {
      return process.env[match[1]] || getDefaultVertexRegion()
    }
  }
  return getDefaultVertexRegion()
}

/** Asigna una variable de entorno en caliente — para paquetes del dominio
 * central que necesiten alternar flags de proveedor/feature a media
 * sesión. */
export function setEnv(name: string, value: string): void {
  process.env[name] = value
}

/** Borra una variable de entorno en caliente. */
export function deleteEnv(name: string): void {
  delete process.env[name]
}
