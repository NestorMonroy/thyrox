/**
 * Limpieza de directorios de job y breadcrumbs de PTY.
 *
 * Puerto de chunk-92tvramn.js `mr`, `wr`, `tt`, `_r`, `$t` y `Ve` (ant
 * 2.1.283). La referencia guarda parte de este estado en un store con
 * scopes (`storageV5`, activo cuando `N()` es verdadero); ccb no tiene ese
 * backend, así que sólo se porta la rama de disco de cada función — la
 * rama `storageV5` se declara `pendiente` en cada sitio donde existía.
 *
 * @dynamicRequire
 */

import { lstat, mkdir, rm, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'

import { getDaemonHomeDir, getPtyPidsDir, getPtySocketPath } from './socketPaths.js'

/**
 * `<daemon-home>/host-managed` — directorio donde la referencia deja las
 * tombstones de host (ant `Hae`, no portado en este item: su escritor vive
 * en el bucle de despacho de `Dt`, chunk-92tvramn.js, fuera del alcance de
 * este item).
 */
export function getHostManagedDir(): string {
  return join(getDaemonHomeDir(), 'host-managed')
}

/** `<config-home>/jobs/<jobId>` — duplica la ruta privada de bgWorkerRegistry.ts
 * porque ese archivo no la exporta y no pertenece a este item. */
function getJobDir(jobId: string): string {
  return join(resolve(getConfigHomeDir(), 'jobs'), jobId)
}

function errorCode(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code
  return code ?? 'unknown'
}

/**
 * Asegura el directorio de breadcrumbs pty-pids. Ref `wr`
 * (chunk-92tvramn.js): dos catch, ambos silenciosos — la rama `storageV5`
 * (`r.ensureScope(gr).catch(()=>{})`) no aplica (ccb no tiene ese store);
 * se porta sólo la rama de disco (`Fe(cLe(),{recursive:!0}).catch(()=>{})`),
 * con el mismo catch silencioso.
 */
export async function ensurePtyPidsDir(): Promise<void> {
  try {
    await mkdir(getPtyPidsDir(), { recursive: true })
  } catch {
    // silencioso — ref wr: sin logError, sin clasificación.
  }
}

/**
 * Asegura el directorio host-managed. Ref `mr` (chunk-92tvramn.js): la
 * rama de disco (`Fe($Ot(),{recursive:!0,mode:448})`) NO tiene catch — el
 * error se propaga. La rama `storageV5` (`Hzt(r)`) es pendiente: no existe
 * ese store en ccb.
 */
export async function ensureHostManagedDir(): Promise<void> {
  await mkdir(getHostManagedDir(), { recursive: true, mode: 0o700 })
}

/**
 * Comprueba si `path` es un archivo residual de un formato de job anterior
 * (no un directorio); si lo es, lo borra forzosamente y devuelve `true`
 * como señal de formato antiguo. Ref `_r` (chunk-92tvramn.js): el `lstat`
 * fallido se convierte en `null` de forma silenciosa (1 catch).
 */
export async function removeLegacyJobFile(path: string): Promise<boolean> {
  const stat = await lstat(path).catch(() => null)
  if (stat === null || stat.isDirectory()) return false
  await rm(path, { recursive: true, force: true })
  return true
}

/**
 * Borra el árbol `jobs/<jobId>`. Ref `$t` (chunk-92tvramn.js): primero
 * comprueba si la ruta es un residuo de formato antiguo (`_r`) — si lo es,
 * ya no hay scope que borrar y vuelve; si no, borra el scope `job/<jobId>`
 * del store y, si falla, invoca `onError` con el código.
 *
 * `$t` recibe la ruta del residuo como parámetro propio (`o`); en los dos
 * sitios donde la referencia la invoca es siempre `Ir(jobId)` — la misma
 * ruta del job — así que aquí se deriva de `jobId` en vez de repetirla como
 * argumento separado.
 */
export async function cleanupJobDirectory(
  jobId: string,
  onError: (code: string) => void,
): Promise<void> {
  const dir = getJobDir(jobId)
  if (await removeLegacyJobFile(dir)) return
  try {
    await rm(dir, { recursive: true, force: true })
  } catch (error) {
    onError(errorCode(error))
  }
}

/**
 * Borra las cuatro variantes de breadcrumb pty-pid de un job, una por una,
 * ignorando errores. Ref `tt` (chunk-92tvramn.js): en la referencia borra
 * cuatro claves de un store con scopes, derivadas de `Eee`/`yw`/`nx`/`HV`
 * (chunk-wngxtykq.js); ccb no tiene ese store, así que aquí se borran los
 * cuatro archivos de disco equivalentes en la rama no-Windows de esos
 * helpers: `<pty-pids>/<short>.pid` (`Eee`, no depende de plataforma) y
 * `<ptySocket>.err` / `.late` / `.exec-exit` (`yw`/`nx`/`HV`, rama POSIX).
 * La rama Windows de `yw`/`nx`/`HV` (breadcrumbs bajo pty-pids en vez de
 * junto al socket) es pendiente: ccb no soporta daemon en Windows
 * (socketPaths.ts ya lo declara fuera de alcance).
 */
export async function cleanupPtyPidBreadcrumbs(
  short: string,
  ptySocket?: string,
): Promise<void> {
  const base = ptySocket ?? getPtySocketPath(short)
  const paths = [
    join(getPtyPidsDir(), `${short}.pid`),
    `${base}.err`,
    `${base}.late`,
    `${base}.exec-exit`,
  ]
  for (const path of paths) {
    await unlink(path).catch(() => {})
  }
}

/** Entrada mínima de un worker para formatear su mensaje de retiro. */
export interface RetireLogWorker {
  short: string
  cliVersion?: string
  isVersionStale: boolean
}

/** Resultado de `retireIfSettled` que decide si hubo retiro. */
export interface RetireOutcome {
  retired: boolean
  idleMs: number
  cause: string
}

/** Ref `kr` (chunk-92tvramn.js): formato válido de versión de CLI. */
const CLI_VERSION_PATTERN = /^[0-9A-Za-z.+_-]{1,100}$/

/**
 * Compone la línea humana "bg retire <short>: <causa>, idle <Nm/h>" para un
 * worker retirado, agregando una advertencia si el CLI del worker quedó
 * desactualizado respecto al daemon. Ref `Ve` (chunk-92tvramn.js): sin
 * `outcome.retired` devuelve `false` sin emitir nada; aquí, al no tener el
 * callback de emisión `r` de la referencia (vive en workerVm.ts, fuera del
 * alcance de este item), se devuelve `null` en vez de emitir y `false`, y
 * el mensaje formateado en caso de haber retiro — quien la invoque decide
 * cómo emitirla.
 *
 * Pendiente: no está conectada a `workerVm.ts:kill` — eso tocaría un
 * archivo fuera del alcance de este item.
 */
export function formatRetireMessage(
  worker: RetireLogWorker,
  outcome: RetireOutcome,
  extraLabel?: string,
): string | null {
  if (!outcome.retired) return null
  const idleMinutes = Math.round(outcome.idleMs / 60000)
  const idle = idleMinutes >= 120 ? `${Math.round(idleMinutes / 60)}h` : `${idleMinutes}m`
  const cliVersion =
    worker.cliVersion && CLI_VERSION_PATTERN.test(worker.cliVersion)
      ? worker.cliVersion
      : 'unrecognized'
  const daemonVersion = process.env.THYROX_CODE_VERSION ?? 'dev'
  const staleWarning = worker.isVersionStale
    ? `, worker ${cliVersion} (daemon ${daemonVersion})`
    : ''
  const suffix = extraLabel ? ` [${extraLabel}]` : ''
  return `bg retire ${worker.short}: ${outcome.cause}, idle ${idle}${staleWarning}${suffix}`
}
