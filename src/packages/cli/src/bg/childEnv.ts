/**
 * Entorno del hijo del PTY host: qué variables heredadas del proceso que
 * lanza (`process.env`) viajan al worker de bg y cuáles se retiran por
 * defecto salvo que quien despacha las reenvíe de forma explícita.
 *
 * Porte de chunk-ygx717jg.js 2.1.283:
 *   - `le`/`Tt` [16358,16744) — ENV_FORWARD_ALLOWLIST: la lista de
 *     variables «reenviables»; `Tt` es su mapa en mayúsculas (case-
 *     insensitive), aquí no hace falta un mapa aparte porque
 *     `ENV_FORWARD_ALLOWLIST` ya se declara con el nombre canónico exacto
 *     que Node expone en `process.env` (case-sensitive en POSIX).
 *   - `Gxe` [16543,16599) — isHostManagedProviderEnv.
 *   - `qjt` [16600,16640) — needsRevivalGuard.
 *   - `qe` [13044,15791) y `Vt` [64993,65696) — construyen, cada una para
 *     su propio punto de disparo (dispatch del daemon y adopción/spare),
 *     el mismo par de pasos: partir del entorno heredado, retirar el
 *     allowlist salvo reenvío explícito, y si el proveedor está
 *     gestionado por el host retirar además las credenciales. thyrox
 *     tiene un solo punto de disparo (`spawnPtyHost`), así que las dos
 *     colapsan en `buildPtyHostChildEnv`.
 *
 * Las variables de servicio (`ANTHROPIC_*`, `CLOUD_ML_REGION`) se
 * conservan sin renombrar — su significado lo fija la API, no el
 * cliente (mismo criterio que `@thyrox/provider: credentials.ts`). Las
 * propias del cliente (`CLAUDE_CODE_*`) se reenvían con su nombre
 * `THYROX_CODE_*` cuando ese nombre ya existe en el árbol; cuando no
 * existe, la variable queda FUERA de la lista — no se fabrica un nombre
 * sin lector. Pendientes, medido con `git grep -r` sobre el árbol de fuentes
 * (cero resultados para el nombre `THYROX_CODE_*` derivado):
 *
 *   // pendiente: CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT — sin THYROX_CODE_3P_PROBE_WROTE_SONNET_DEFAULT
 *   // pendiente: CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT — sin THYROX_CODE_3P_PROBE_WROTE_OPUS_DEFAULT
 *   // pendiente: CLAUDE_CODE_SUBAGENT_MODEL_FORCE — sin THYROX_CODE_SUBAGENT_MODEL_FORCE
 *   // pendiente: CLAUDE_CODE_CLIENT_DATA_URL — sin THYROX_CODE_CLIENT_DATA_URL
 *   // pendiente: CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD — sin THYROX_CODE_USE_ANTHROPIC_GOOGLE_CLOUD (el proveedor mismo no está cableado en thyrox)
 *   // pendiente: CLAUDE_CODE_ARTIFACTS_API_BASE_URL — sin THYROX_CODE_ARTIFACTS_API_BASE_URL (no existe el subsistema de artifacts)
 *   // pendiente: CLAUDE_CODE_ARTIFACTS_API_TOKEN — idem
 *   // pendiente: CLAUDE_CODE_ARTIFACT_ASSET_BASE_URL — idem
 *   // pendiente: CLAUDE_CODE_ARTIFACT_LIVE_BASE_URL — idem
 *   // pendiente: CLAUDE_CODE_ARTIFACT_SYNC_BASE_URL — idem
 *   // pendiente: CLAUDE_CODE_ARTIFACT_VIEWER_BASE_URL — idem
 *   // pendiente: CLAUDE_CODE_MEMORY_API_BASE_URL — sin THYROX_CODE_MEMORY_API_BASE_URL (no existe el subsistema de memoria remota)
 *   // pendiente: CLAUDE_CODE_MEMORY_API_TOKEN — idem
 *   // pendiente: CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH — sin THYROX_CODE_SKIP_ANTHROPIC_AWS_AUTH
 *   // pendiente: CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH — sin THYROX_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH
 *   // pendiente: CLAUDE_CODE_SKIP_MANTLE_AUTH — sin THYROX_CODE_SKIP_MANTLE_AUTH (proveedor Mantle no cableado)
 *   // pendiente: CLAUDE_CODE_HOST_AUTH_ENV_VAR — sin THYROX_CODE_HOST_AUTH_ENV_VAR
 *
 * `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL` es la única excepción: SÍ
 * existe en thyrox, pero deliberadamente sin renombrar — ya vive así en
 * `@thyrox/agent: toolSearch.ts:106`, y esta lista sigue ese precedente en
 * vez de inventar una segunda grafía para la misma variable.
 *
 * `Xe` [15791,15894) — pasa `CLAUDE_CODE_PROCESS_WRAPPER` (`Sv`,
 * chunk-dkzzjdtt.js) al hijo salvo en modo `exec`. No se porta:
 * `THYROX_CODE_PROCESS_WRAPPER`/`CLAUDE_CODE_PROCESS_WRAPPER` no tiene NINGÚN
 * lector en el árbol (medido: `git grep -c PROCESS_WRAPPER` → 0) y su único
 * llamador en la referencia es la clase de disparo del daemon (`g7`), que
 * thyrox no tiene — fabricar la variable aquí dejaría un nombre sin
 * consumidor a ningún lado. // pendiente: si algún día existe una noción de
 * "proceso envoltorio" en thyrox, portar `Xe` como el paso final de
 * `buildPtyHostChildEnv`.
 *
 * `re` [16981,17108) — decide, dentro del bucle de reconciliación de `qe`,
 * si UN endpoint concreto de un registro multi-proveedor (`qFe`) sigue
 * activo. Ese registro (un `{endpoint, companions, selection}` por
 * proveedor — Bedrock, Vertex, Foundry, Gateway, Mantle...) no vive en
 * `@thyrox/cli`: es dominio de `@thyrox/provider`/`@thyrox/config`, que ya
 * tienen su propio mecanismo de reconciliación (`managed-constants.ts`,
 * `policySettings.ts`). Reimplementarlo aquí duplicaría esa fuente de
 * verdad. // pendiente: si el dispatcher de bg necesita reconciliar
 * endpoints por variable explícita en vez de por el allowlist plano de
 * arriba, se cablea contra ese mecanismo existente, no con una copia local.
 *
 * `we` [15894,16123) — en macOS, vuelca a disco (modo 384) un snapshot de
 * las credenciales resueltas para que el worker las lea sin heredar el
 * proceso. thyrox no tiene ese mecanismo de snapshot (`CLAUDE_BG_AUTH_SNAPSHOT_PATH`
 * no existe en ningún lado del árbol) ni un lugar acordado para el archivo.
 * // pendiente: diseñar el snapshot de auth para bg workers en
 * `@thyrox/provider` (dueño de `resolveCredential`/`scrubChildEnv`) y
 * consumirlo aquí, no inventar la ruta de disco en `@thyrox/cli`.
 */

import { scrubChildEnv } from '@thyrox/provider/credentials'
import { isEnvTruthy } from '@thyrox/config/env/utils'

/**
 * `le` traducido: nombres `CLAUDE_CODE_*` reenviables se citan con su
 * equivalente `THYROX_CODE_*`; los de servicio (`ANTHROPIC_*`,
 * `CLOUD_ML_REGION`) se conservan. Ver la cabecera del módulo para los
 * `CLAUDE_CODE_*` que quedan fuera por falta de equivalente.
 */
export const ENV_FORWARD_ALLOWLIST: readonly string[] = [
  // qYe [chunk-379zyrv7.js 47373,48278) — selección de modelo
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_MODEL',
  'ANTHROPIC_DEFAULT_FABLE_MODEL',
  'ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_FABLE_MODEL_NAME',
  'ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_OPUS_MODEL_NAME',
  'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_NAME',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION',
  'THYROX_CODE_SUBAGENT_MODEL', // CLAUDE_CODE_SUBAGENT_MODEL
  // hmn [chunk-379zyrv7.js 48279,48452) — modelo personalizado
  'ANTHROPIC_CUSTOM_MODEL_OPTION',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_NAME',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES',
  // G1 [chunk-379zyrv7.js 41721,42137) — selección de proveedor/endpoint
  'THYROX_CODE_USE_BEDROCK', // CLAUDE_CODE_USE_BEDROCK
  'THYROX_CODE_USE_VERTEX', // CLAUDE_CODE_USE_VERTEX
  'THYROX_CODE_USE_FOUNDRY', // CLAUDE_CODE_USE_FOUNDRY
  'THYROX_CODE_USE_ANTHROPIC_AWS', // CLAUDE_CODE_USE_ANTHROPIC_AWS
  'THYROX_CODE_USE_MANTLE', // CLAUDE_CODE_USE_MANTLE
  'THYROX_CODE_USE_GATEWAY', // CLAUDE_CODE_USE_GATEWAY
  'ANTHROPIC_FOUNDRY_RESOURCE',
  'ANTHROPIC_VERTEX_PROJECT_ID',
  'ANTHROPIC_AWS_WORKSPACE_ID',
  'ANTHROPIC_GOOGLE_CLOUD_PROJECT',
  'ANTHROPIC_GOOGLE_CLOUD_LOCATION',
  'ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID',
  'CLOUD_ML_REGION',
  // CLAUDE_CODE_EXTRA_BODY, directo en `le`
  'THYROX_CODE_EXTRA_BODY',
  // LL [chunk-379zyrv7.js 45386,45863) + Bs [45274,45343) — endpoints
  'ANTHROPIC_BASE_URL',
  '_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL', // sin renombrar — ver cabecera
  'ANTHROPIC_BEDROCK_BASE_URL',
  'ANTHROPIC_VERTEX_BASE_URL',
  'ANTHROPIC_FOUNDRY_BASE_URL',
  'ANTHROPIC_AWS_BASE_URL',
  'ANTHROPIC_GOOGLE_CLOUD_BASE_URL',
  'ANTHROPIC_BEDROCK_MANTLE_BASE_URL',
  // gmn [chunk-379zyrv7.js 47156,47372) — saltar auth por proveedor
  'THYROX_CODE_SKIP_BEDROCK_AUTH', // CLAUDE_CODE_SKIP_BEDROCK_AUTH
  'THYROX_CODE_SKIP_VERTEX_AUTH', // CLAUDE_CODE_SKIP_VERTEX_AUTH
  'THYROX_CODE_SKIP_FOUNDRY_AUTH', // CLAUDE_CODE_SKIP_FOUNDRY_AUTH
  // ANTHROPIC_CUSTOM_HEADERS, directo en `le`
  'ANTHROPIC_CUSTOM_HEADERS',
  // KFe [chunk-379zyrv7.js 50808,50908) — gestión por el host
  'ANTHROPIC_UNIX_SOCKET',
  'THYROX_CODE_PROVIDER_MANAGED_BY_HOST', // CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST
  // CLAUDE_CODE_HOST_GATEWAY_LINEAGE, CLAUDE_CODE_HOST_CREDS_FILE, directos en `le`
  'THYROX_CODE_HOST_GATEWAY_LINEAGE',
  'THYROX_CODE_HOST_CREDS_FILE',
]

/** `Gxe` — el proveedor lo administra el anfitrión, no la sesión. */
export function isHostManagedProviderEnv(env: NodeJS.ProcessEnv): boolean {
  return isEnvTruthy(env.THYROX_CODE_PROVIDER_MANAGED_BY_HOST)
}

/**
 * `qjt` — activa la «revival guard» cuando el worker puede reintentar por
 * sí mismo (no está en modo `exec` y el proveedor no lo administra el
 * host). thyrox no tiene modo de lanzamiento `exec` para el pty host
 * (mismo hueco que `Xe`, declarado por el propio Item de esta tarea), así
 * que la rama `launch.mode==="exec"` de la referencia nunca aplica aquí y
 * la condición colapsa en `!isHostManagedProviderEnv`.
 * // pendiente: el consumidor de esta bandera ($e, la propia revival
 * guard) es del daemon de disparo (clase g7 en la referencia), que
 * thyrox no tiene todavía — se exporta como pieza suelta, lista para
 * cablearse cuando exista.
 */
export function needsRevivalGuard(env: NodeJS.ProcessEnv): boolean {
  return !isHostManagedProviderEnv(env)
}

/**
 * `qe`/`Vt` — entorno del hijo del pty host: parte del heredado, retira
 * el allowlist salvo reenvío explícito, y si el proveedor lo administra
 * el host retira además las credenciales (`scrubChildEnv`, el mismo
 * saneamiento de `@thyrox/provider: credentials.ts`).
 */
export function buildPtyHostChildEnv(
  baseEnv: NodeJS.ProcessEnv,
  forwarded: Readonly<Record<string, string>> = {},
): NodeJS.ProcessEnv {
  // El estado «gestionado por el host» se lee del heredado+reenviado ANTES
  // del recorte (`$pt(p)||Gxe(e)` en `qe`, leído contra `p`/`e.env`, nunca
  // contra el `o` ya recortado): si sólo se hereda de `process.env` y no se
  // reenvía explícito, la propia bandera queda fuera del resultado —igual
  // que cualquier otra variable del allowlist—, pero el recorte de
  // credenciales sí se aplicó.
  const merged: NodeJS.ProcessEnv = { ...baseEnv, ...forwarded }
  const scrubbed = isHostManagedProviderEnv(merged) ? scrubChildEnv(merged) : merged
  const out: NodeJS.ProcessEnv = { ...scrubbed }
  for (const key of ENV_FORWARD_ALLOWLIST) {
    if (!(key in forwarded)) delete out[key]
  }
  return out
}
