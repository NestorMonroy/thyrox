/**
 * Qué hereda un compañero al arrancar: el comando, los flags y el entorno.
 *
 * Procedencia: `ccnmt: packages/swarm/src/runtime/spawnUtils.ts` (151 líneas,
 * 3 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * DIVERGENCIA DECLARADA — la lista de variables reenviadas es un PARÁMETRO.
 * La fuente lleva incrustadas las claves del producto de su proveedor
 * (selección de proveedor de API, marcador de ejecución remota, directorio de
 * configuración). Eso es dominio del consumidor, no del mecanismo: quien
 * despliega declara sus claves con `setTeammateEnvVars`. Las de terceros —las
 * de proxy y las de certificados, que son de curl y de node— SÍ viajan
 * verbatim, porque no nombran a ningún proveedor.
 */
import {
  getChromeFlagOverride,
  getFlagSettingsPath,
  getInlinePlugins,
  getMainLoopModelOverride,
  getSessionBypassPermissionsMode,
  isInBundledMode,
  quote,
} from '../adapters/appRuntime.js'
import type { PermissionMode } from '../adapters/appRuntime.js'
import { getTeammateModeFromSnapshot } from '../backends/teammateModeSnapshot.js'
import { TEAMMATE_COMMAND_ENV_VAR } from '../core/constants.js'

export { TEAMMATE_COMMAND_ENV_VAR }

/**
 * El comando con el que se lanza un compañero.
 *
 * La variable de entorno gana: es la que permite apuntar a otro binario sin
 * reconstruir nada, y es lo que usan las pruebas de extremo a extremo. Sin
 * ella, en modo empaquetado el ejecutable ES el proceso; fuera de él, el
 * proceso es un intérprete y lo que hay que relanzar es el guion.
 */
export function getTeammateCommand(): string {
  const declared = process.env[TEAMMATE_COMMAND_ENV_VAR]
  if (declared) return declared
  return isInBundledMode() ? process.execPath : process.argv[1]!
}

/**
 * Los flags que un compañero hereda de quien lo lanza.
 *
 * @param options.planModeRequired - si el compañero arranca en modo plan, NO
 *   hereda el salto de permisos.
 * @param options.permissionMode - el modo de permiso a propagar.
 */
export function buildInheritedCliFlags(options?: {
  planModeRequired?: boolean
  permissionMode?: PermissionMode
}): string {
  const flags: string[] = []
  const { planModeRequired, permissionMode } = options || {}

  // El modo plan es la PRIMERA rama, y es una decisión de seguridad: existe
  // para no ejecutar nada, así que heredar el salto de permisos lo vaciaría de
  // sentido justo cuando más importa.
  if (planModeRequired) {
    // No se hereda nada de permisos.
  } else if (
    permissionMode === 'bypassPermissions' ||
    getSessionBypassPermissionsMode()
  ) {
    flags.push('--dangerously-skip-permissions')
  } else if (permissionMode === 'acceptEdits') {
    flags.push('--permission-mode acceptEdits')
  }

  const modelOverride = getMainLoopModelOverride()
  if (modelOverride) flags.push(`--model ${quote([modelOverride])}`)

  const settingsPath = getFlagSettingsPath()
  if (settingsPath) flags.push(`--settings ${quote([settingsPath])}`)

  for (const pluginDir of getInlinePlugins()) {
    flags.push(`--plugin-dir ${quote([pluginDir])}`)
  }

  // El modo de compañero se propaga para que el que arranque use el MISMO que
  // el líder: dos modos en una sesión dejan huérfano al que no se supervisa.
  flags.push(`--teammate-mode ${getTeammateModeFromSnapshot()}`)

  const chromeFlagOverride = getChromeFlagOverride()
  if (chromeFlagOverride === true) flags.push('--chrome')
  else if (chromeFlagOverride === false) flags.push('--no-chrome')

  return flags.join(' ')
}

/**
 * Las claves de entorno de TERCEROS que se reenvían siempre.
 *
 * Son las de proxy y las de certificados: las lee curl, las lee node, y no
 * nombran a ningún proveedor. Sin ellas, un compañero lanzado en un shell de
 * login nuevo saldría a la red por fuera del relay que el líder tiene
 * configurado.
 */
const THIRD_PARTY_ENV_VARS = [
  'HTTPS_PROXY',
  'https_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'NO_PROXY',
  'no_proxy',
  'SSL_CERT_FILE',
  'NODE_EXTRA_CA_CERTS',
  'REQUESTS_CA_BUNDLE',
  'CURL_CA_BUNDLE',
] as const

/**
 * Las claves de entorno que se reenvían a un compañero.
 *
 * Arranca con las de terceros y NADA MÁS. Las del producto que despliegue este
 * mecanismo —selección de proveedor, endpoint, directorio de configuración— las
 * declara él con `setTeammateEnvVars`: son su dominio, no el del mecanismo.
 */
export let TEAMMATE_ENV_VARS: readonly string[] = THIRD_PARTY_ENV_VARS

/**
 * Declara las claves propias del despliegue, además de las de terceros.
 *
 * Se suman a las de terceros en vez de reemplazarlas: un despliegue que
 * declarara sólo las suyas dejaría a sus compañeros fuera del proxy sin
 * enterarse, y ese fallo aparece como una petición que sale por donde no debe.
 */
export function setTeammateEnvVars(keys: readonly string[]): void {
  TEAMMATE_ENV_VARS = [...THIRD_PARTY_ENV_VARS, ...keys]
}

/** Devuelve la lista a sólo las claves de terceros. */
export function resetTeammateEnvVars(): void {
  TEAMMATE_ENV_VARS = THIRD_PARTY_ENV_VARS
}

/**
 * El fragmento `env CLAVE=VALOR …` con el que se lanza un compañero.
 *
 * Sólo viajan las que están puestas y NO vacías: reenviar una cadena vacía no
 * es lo mismo que no reenviarla — el hijo la vería declarada, y una lectura
 * como «hay proxy configurado, y es la cadena vacía» rompe distinto y más
 * tarde que no tenerla.
 */
export function buildInheritedEnvVars(): string {
  const envVars = ['CLAUDECODE=1']
  for (const key of TEAMMATE_ENV_VARS) {
    const value = process.env[key]
    if (value !== undefined && value !== '') {
      envVars.push(`${key}=${quote([value])}`)
    }
  }
  return envVars.join(' ')
}
