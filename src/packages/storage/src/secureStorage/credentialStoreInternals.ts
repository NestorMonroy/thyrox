/**
 * Puerto de la parte de `ccnmt: packages/storage/src/secureStorage` que
 * `chunk-mmqkf96q.js` (2.1.283) implementa como funciones libres en vez de
 * como un archivo por símbolo: el candado de escritura (`fWr`/`aFo`/`Rn`/
 * `vs`), el ayudante de mutación (`Et`), los mapeadores de errno a `fc`
 * (`$i`/`Ui`), la copia por generación (`Ts`/`qi`/`Xe`/`Tr`/`Ps`/`He`/
 * `c_e`/`Wi`/`vr`), el envoltorio con seguimiento de generación (`ji`) y su
 * selector (`Pr`), y el gate de Windows CredMan (`Ms`/`Gi`/`Ns`/`Ds`/
 * `gWr`/`zi`/`hWr`). `plainTextStorage.ts` es su único consumidor hoy.
 *
 * Divergencias declaradas (DEC-04):
 *
 * - `q` (clase genérica cache-por-host de `chunk-nvht7ckf.js`, fuera de
 *   alcance) — reimplementada aquí como `HostScopedCache`, un `WeakMap`
 *   simple; misma forma (`of(host)` memoiza por identidad de objeto).
 * - `j()` (de `chunk-nvht7ckf.js`, fuera de alcance) — su `.host` se
 *   sustituye por `getCurrentHost()`, una variable de módulo con setter
 *   para pruebas (`__setCurrentHostForTests`), en vez de leer un contexto
 *   de sesión que este árbol no tiene.
 * - `N()`/`DBo()` (de `chunk-8nz62976.js`, fuera de alcance — «pineable
 *   una vez») — sustituidos por `isMultiHostAware()`/
 *   `__setMultiHostAwareForTests()`, un flag simple y reiniciable: nada en
 *   este puerto lo fija en producción todavía (su fijador real vive fuera
 *   de alcance), así que sólo hace falta para que las pruebas puedan
 *   activarlo y desactivarlo.
 * - `Ci` (candado de archivo entre procesos, proper-lockfile, de
 *   `chunk-n9sxb5zy.js`) — portado sobre `../lockfile.js`, el envoltorio
 *   perezoso que este paquete ya tenía: `withWriteLock` toma
 *   `<configHome>/.storage-write` con las opciones de `fWr` además de
 *   serializar dentro del proceso (`Rn`/`vs`).
 * - `Fw` (raíz del almacén, de `chunk-vpxas6dq.js`) — lee
 *   `CLAUDE_SECURESTORAGE_CONFIG_DIR` antes de caer en la raíz de
 *   configuración. No se porta: su clave propia tendría que declararse en
 *   `.env.example` (`check_env_contract_keys.py`), fuera de los archivos de
 *   este tramo; la raíz es `getConfigHomeDir()` directo.
 * - `E` (lectura del backend de archivo real, `chunk-twjdyk4f.js`) — se
 *   portan sus dos clasificadores de errno y el JSON `null` como ausencia;
 *   la apertura con `O_NOFOLLOW` (`refused-symlink`) y el tope de tamaño no,
 *   por vivir fuera del chunk enumerado. `Wi`/`Ps` ya mapean ese estado.
 * - `p(...)` (telemetría, fuera de alcance) — `mutateCredentials` no
 *   emite ningún evento al saltarse la escritura por lectura fallida; la
 *   fuente sí lo hace (`"secure_storage_credentials_write"`).
 * - `nl` (`FALLBACK_LEGS`) y `Fi` (`FALLBACK_RETRY_DELAY_MS`) — se portan
 *   literalmente pero SIN consumidor en este árbol: su consumidor real es
 *   un compositor de fallback multi-tramo que no existe en este puerto
 *   (`fallbackStorage.ts` sólo compone DOS backends, sin reintentos).
 * - `mWr` (`isLibsecretAvailable`) — memoiza `Promise.resolve(false)`
 *   igual que la fuente: en 2.1.283 esto YA es un stub fijo (no hay
 *   soporte de libsecret ni siquiera en el build de origen), así que no
 *   es una divergencia de comportamiento.
 * - `uK` (sufijo de OAuth custom/staging, de `chunk-djetmnb8.js`, fuera de
 *   alcance) — `getWindowsCredManConfigPaths` usa el sufijo vacío (rama
 *   `prod` de `uK`), ya que la detección de entorno no está en este árbol.
 * - `CLAUDE_CONFIG_DIR` y `CLAUDE_CODE_FORCE_WINDOWS_CREDMAN` (`Ds`, `gWr`) —
 *   el config global sale de `getConfigHomeDir()`, el mismo sitio que
 *   `@thyrox/config: global/config.ts` usa para `.claude.json` (y que ya
 *   resuelve `THYROX_CONFIG_DIR`); el forzado de CredMan se lee de
 *   `THYROX_CODE_FORCE_WINDOWS_CREDMAN`.
 * - `gr`/`Ne` (`__classPrivateFieldSet`/`Get`, artefacto del downleveling
 *   de esbuild para campos privados) — NO se portan: son un mecanismo del
 *   *bundler* para emular `#campo` en un target antiguo, no lógica de la
 *   aplicación. TypeScript/Bun compilan `#campo` nativo sin necesitarlos.
 */
import { chmod, writeFile } from 'fs/promises'
import { readFileSync, existsSync } from 'fs'
import { AsyncLocalStorage } from 'async_hooks'
import { join } from 'path'
import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import { getErrnoCode, getFsImplementation } from '../fsOperations.js'
import { lock } from '../lockfile.js'
import { logError } from '../logging.js'
import { READ_FAILED } from './types.js'
import type {
  CredentialBackend,
  CredentialCopyState,
  ReadFailed,
  SecureStorage,
  SecureStorageData,
  SecureStorageUpdateResult,
} from './types.js'

function jsonParse<T = unknown>(raw: string): T {
  return JSON.parse(raw) as T
}

function jsonStringify(value: unknown): string {
  return JSON.stringify(value)
}

/** Puerto de `v6n`. */
export const PLAINTEXT_WARNING = 'Warning: Storing credentials in plaintext.'

/** Puerto de `nl` — sin consumidor en este árbol, ver docstring del módulo. */
export const FALLBACK_LEGS: unique symbol = Symbol('secureStorage.fallbackLegs')
/** Puerto de `Fi` — sin consumidor en este árbol, ver docstring del módulo. */
export const FALLBACK_RETRY_DELAY_MS = 2000

let libsecretAvailability: Promise<boolean> | undefined
/** Puerto de `mWr`. */
export function isLibsecretAvailable(): Promise<boolean> {
  if (libsecretAvailability === undefined) {
    libsecretAvailability = Promise.resolve(false)
  }
  return libsecretAvailability
}

// --- Candado de escritura intra-proceso: puerto de `Rn`/`vs`/`fWr`/`aFo` ---

const writeLockContext = new AsyncLocalStorage<boolean>()
let writeQueueTail: Promise<void> = Promise.resolve()

/** Nombre del archivo que `fWr` bloquea bajo el directorio de
 * configuración; proper-lockfile crea `<nombre>.lock` a su lado. */
export const WRITE_LOCK_FILE_NAME = '.storage-write'

/** Opciones con que `fWr` toma el candado (`Ci`): sin resolver symlinks
 * —el archivo no tiene por qué existir—, diez reintentos con espera
 * exponencial y un candado abandonado se considera caduco a los 15 s. */
const WRITE_LOCK_OPTIONS = {
  realpath: false,
  retries: { retries: 10, minTimeout: 100, maxTimeout: 1000 },
  stale: 15000,
} as const

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function acquireWriteLock(): Promise<() => Promise<void>> {
  const storageDir = getConfigHomeDir()
  await getFsImplementation().mkdir(storageDir)
  return lock(join(storageDir, WRITE_LOCK_FILE_NAME), {
    ...WRITE_LOCK_OPTIONS,
    onCompromised: error => logError(`[secureStorage] write lock compromised: ${errorMessage(error)}`),
  })
}

async function releaseWriteLock(release: () => Promise<void>): Promise<void> {
  try {
    await release()
  } catch (error) {
    logError(`[secureStorage] write lock release failed: ${errorMessage(error)}`)
  }
}

/** Puerto de `fWr`. Serializa `task` en dos capas: la cola de promesas de
 * este proceso y el candado de archivo entre procesos (`Ci`). Es
 * reentrante: si ya se está dentro de un candado, se ejecuta directo. */
export async function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  if (writeLockContext.getStore() === true) {
    return task()
  }
  const previousTail = writeQueueTail
  let releaseNext: () => void = () => {}
  writeQueueTail = new Promise(resolve => {
    releaseNext = resolve
  })
  try {
    await previousTail
    const release = await acquireWriteLock()
    try {
      return await writeLockContext.run(true, task)
    } finally {
      await releaseWriteLock(release)
    }
  } finally {
    releaseNext()
  }
}

/** Puerto de `aFo`: marca el resto de la tarea como ya-dentro-del-candado,
 * sin encolarse detrás de otras escrituras. */
export function runWithinWriteLock<T>(task: () => Promise<T>): Promise<T> {
  return writeLockContext.run(true, task)
}

// --- Mapeadores de errno a `READ_FAILED`: puerto de `$i`/`Ui` ---

/** Puerto de `$i`. */
export function mapErrnoToNullOrReadFailed(
  code: string | undefined,
  platform: string,
): ReadFailed | null {
  if (code === 'ENOENT' || code === 'EISDIR' || code === 'ENOTDIR') return null
  if ((code === 'EACCES' || code === 'EPERM') && platform !== 'win32') return null
  return READ_FAILED
}

/** Puerto de `Ui`. */
export function mapErrnoStrictToNullOrReadFailed(code: string | undefined): ReadFailed | null {
  return code === 'ENOENT' ? null : READ_FAILED
}

// --- Cache por host: puerto de `q` (sustituto, ver docstring) ---

export class HostScopedCache<V> {
  private readonly factory: () => V
  private readonly map = new WeakMap<object, V>()

  constructor(factory: () => V) {
    this.factory = factory
  }

  of(host: object): V {
    let value = this.map.get(host)
    if (value === undefined) {
      value = this.factory()
      this.map.set(host, value)
    }
    return value
  }
}

let currentHost: object = {}

/** Sustituto de `j().host` — ver docstring del módulo. */
export function getCurrentHost(): object {
  return currentHost
}

export function __setCurrentHostForTests(host: object): void {
  currentHost = host
}

export function __resetCurrentHostForTests(): void {
  currentHost = {}
}

let multiHostAware = false

/** Sustituto de `N()` — ver docstring del módulo. */
export function isMultiHostAware(): boolean {
  return multiHostAware
}

export function __setMultiHostAwareForTests(value: boolean): void {
  multiHostAware = value
}

// --- Copia por generación: puerto de `Ts`/`qi`/`Xe`/`Tr`/`Ps`/`He`/`c_e` ---

/** Puerto de `Ts`. */
export class HostGenerationState {
  copy: { storagePath: string; text: string | null } | undefined = undefined
  generation = 0
}

/** Puerto de `qi`. */
const generationStates = new HostScopedCache<HostGenerationState>(() => new HostGenerationState())

/** Puerto de `Xe`. */
export function getHostGenerationState(host: object = getCurrentHost()): HostGenerationState {
  return generationStates.of(host)
}

/** Puerto de `Tr`. */
export function setCopy(state: HostGenerationState, storagePath: string, text: string | null): void {
  state.copy = { storagePath, text }
  state.generation++
}

/** Puerto de `He`. */
export function invalidate(state: HostGenerationState): void {
  state.copy = undefined
  state.generation++
}

/** Puerto de `c_e`. */
export function invalidateHostCache(host: object = getCurrentHost()): void {
  invalidate(getHostGenerationState(host))
}

/** Puerto de `Ps`: reconcilia el resultado de una lectura con la copia
 * vigente. Si la generación avanzó entre el arranque de la lectura y su
 * resolución (una escritura concurrente), la copia se invalida en vez de
 * quedarse con un resultado que ya puede estar obsoleto. */
export function reconcileCopy(
  state: HostGenerationState,
  result: CredentialCopyState,
  storagePath: string,
  expectedGeneration: number,
): void {
  if (expectedGeneration !== state.generation) {
    invalidate(state)
    return
  }
  switch (result.state) {
    case 'present':
      setCopy(state, storagePath, jsonStringify(result.data))
      return
    case 'absent':
    case 'corrupt':
    case 'refused-symlink':
      setCopy(state, storagePath, null)
      return
    case 'read-failed':
      invalidate(state)
      return
  }
}

/** Puerto de `Wi`. */
export function mapCopyStateToValue(result: CredentialCopyState): SecureStorageData | null | ReadFailed {
  switch (result.state) {
    case 'present':
      return result.data
    case 'absent':
    case 'corrupt':
      return null
    case 'refused-symlink':
    case 'read-failed':
      return READ_FAILED
  }
}

/** Puerto de `vr`: invalida la copia si la promesa rechaza, y repropaga. */
export async function runTracked<T>(promise: Promise<T>, state: HostGenerationState): Promise<T> {
  try {
    return await promise
  } catch (e) {
    invalidate(state)
    throw e
  }
}

// --- Backends sobre archivo: puerto de `Bi` y del adaptador que `ji` envuelve ---

type StoragePathResolver = () => { storagePath: string }
type StorageDirResolver = () => { storageDir: string; storagePath: string }

type ErrnoClassifier = (code: string | undefined) => 'absent' | 'read-failed'

/** Mapeador estricto de `readCredentials` (`w` en `chunk-twjdyk4f.js`):
 * sólo ENOENT es ausencia. */
function classifyErrnoStrict(code: string | undefined): 'absent' | 'read-failed' {
  return mapErrnoStrictToNullOrReadFailed(code) === null ? 'absent' : 'read-failed'
}

/** Mapeador laxo de `readCredentialsStrict` (`I(e, "linux")` en
 * `chunk-twjdyk4f.js`): también EISDIR, ENOTDIR, EACCES y EPERM son
 * ausencia. */
function classifyErrnoLenient(code: string | undefined): 'absent' | 'read-failed' {
  return mapErrnoToNullOrReadFailed(code, 'linux') === null ? 'absent' : 'read-failed'
}

function parseCredentialText(raw: string): CredentialCopyState {
  let parsed: SecureStorageData | null
  try {
    parsed = jsonParse<SecureStorageData | null>(raw)
  } catch {
    return { state: 'corrupt' }
  }
  return parsed === null ? { state: 'absent' } : { state: 'present', data: parsed }
}

/** Puerto de `E` (`chunk-twjdyk4f.js`) reducido a lo que un `readFile`
 * puede ver: el errno pasa por el clasificador dado, y un JSON `null` es
 * ausencia. Divergencia declarada: la fuente abre con `O_NOFOLLOW` y
 * devuelve `refused-symlink` ante un enlace, y `corrupt` sobre un tamaño
 * excesivo; ese tramo vive fuera de `chunk-mmqkf96q.js`. */
async function classifyFileRead(
  getStoragePath: StoragePathResolver,
  classifyErrno: ErrnoClassifier,
): Promise<CredentialCopyState> {
  const { storagePath } = getStoragePath()
  let raw: string
  try {
    raw = await getFsImplementation().readFile(storagePath, { encoding: 'utf8' })
  } catch (e) {
    return { state: classifyErrno(getErrnoCode(e)) }
  }
  return parseCredentialText(raw)
}

/** Modo del archivo de credenciales: sólo su dueño lo lee y escribe. */
const CREDENTIALS_FILE_MODE = 0o600

function stagingPathFor(storagePath: string): string {
  return `${storagePath}.tmp.${process.pid}.${Date.now()}`
}

/** Puerto de `An(n, b(e), 384)` (`Jne`): se escribe un temporal con el
 * modo final y se publica con `rename`, así el destino nunca queda a
 * medias ni con otro modo. Si la publicación falla, el temporal se
 * retira y el error original se propaga. */
async function publishCredentialsFile(storagePath: string, text: string): Promise<void> {
  const stagingPath = stagingPathFor(storagePath)
  try {
    await writeFile(stagingPath, text, { encoding: 'utf8', mode: CREDENTIALS_FILE_MODE })
    await getFsImplementation().rename(stagingPath, storagePath)
  } catch (e) {
    await getFsImplementation().unlink(stagingPath).catch(() => undefined)
    throw e
  }
}

/** Puerto de `Bi`: backend de archivo SIN seguimiento de generación —
 * usado cuando `isMultiHostAware()` es falso, o cuando no se pasa ningún
 * `CredentialBackend` a `selectBackend`. */
export function createRawFileReadBackend(getStoragePath: StoragePathResolver): {
  read(): Promise<SecureStorageData | null>
  readStrict(strict: boolean): Promise<SecureStorageData | null | ReadFailed>
} {
  return {
    async read() {
      const { storagePath } = getStoragePath()
      try {
        const raw = await getFsImplementation().readFile(storagePath, { encoding: 'utf8' })
        return jsonParse(raw)
      } catch {
        return null
      }
    },
    async readStrict(strict: boolean) {
      const { storagePath } = getStoragePath()
      let raw: string
      try {
        raw = await getFsImplementation().readFile(storagePath, { encoding: 'utf8' })
      } catch (e) {
        const code = getErrnoCode(e)
        return strict ? mapErrnoStrictToNullOrReadFailed(code) : mapErrnoToNullOrReadFailed(code, 'linux')
      }
      try {
        return jsonParse(raw)
      } catch {
        return strict ? READ_FAILED : null
      }
    },
  }
}

/** Adaptador de las operaciones de archivo a la forma `CredentialBackend`
 * que `ji`/`withGenerationTracking` espera. */
export function createFileCredentialBackend(getStoragePath: StorageDirResolver): CredentialBackend {
  return {
    readCredentials: () => classifyFileRead(getStoragePath, classifyErrnoStrict),
    readCredentialsStrict: () => classifyFileRead(getStoragePath, classifyErrnoLenient),
    async writeCredentials(data) {
      try {
        const { storageDir, storagePath } = getStoragePath()
        await getFsImplementation().mkdir(storageDir)
        await publishCredentialsFile(storagePath, jsonStringify(data))
        await chmod(storagePath, CREDENTIALS_FILE_MODE)
        return { state: 'written' }
      } catch {
        return { state: 'failed' }
      }
    },
    async deleteCredentials() {
      const { storagePath } = getStoragePath()
      try {
        await getFsImplementation().unlink(storagePath)
        return { state: 'deleted' }
      } catch (e) {
        return getErrnoCode(e) === 'ENOENT' ? { state: 'deleted' } : { state: 'failed' }
      }
    },
  }
}

/** Puerto de `ji`: envuelve un `CredentialBackend` con la copia por
 * generación de `host` (por defecto, `getCurrentHost()`). */
export function withGenerationTracking(
  backend: CredentialBackend,
  getStoragePath: StoragePathResolver,
  host: object = getCurrentHost(),
): {
  read(): Promise<SecureStorageData | null>
  readStrict(strict: boolean): Promise<SecureStorageData | null | ReadFailed>
  write(data: SecureStorageData): Promise<SecureStorageUpdateResult>
  remove(): Promise<boolean>
} {
  return {
    async read() {
      const { storagePath } = getStoragePath()
      const state = getHostGenerationState(host)
      const expectedGeneration = state.generation
      const result = await runTracked(backend.readCredentials(), state)
      reconcileCopy(state, result, storagePath, expectedGeneration)
      return result.state === 'present' ? result.data : null
    },
    async readStrict(strict: boolean) {
      const { storagePath } = getStoragePath()
      const state = getHostGenerationState(host)
      const expectedGeneration = state.generation
      const result = await runTracked(
        strict ? backend.readCredentials() : backend.readCredentialsStrict(),
        state,
      )
      reconcileCopy(state, result, storagePath, expectedGeneration)
      if (strict) {
        if (result.state === 'present') return result.data
        if (result.state === 'absent') return null
        return READ_FAILED
      }
      return mapCopyStateToValue(result)
    },
    async write(data: SecureStorageData) {
      const { storagePath } = getStoragePath()
      const state = getHostGenerationState(host)
      const expectedGeneration = state.generation
      const result = await runTracked(backend.writeCredentials(data), state)
      if (result.state === 'written' && expectedGeneration === state.generation) {
        setCopy(state, storagePath, jsonStringify(data))
      } else {
        invalidate(state)
      }
      return result.state === 'written' ? { success: true, warning: PLAINTEXT_WARNING } : { success: false }
    },
    async remove() {
      const { storagePath } = getStoragePath()
      const state = getHostGenerationState(host)
      const expectedGeneration = state.generation
      const result = await runTracked(backend.deleteCredentials(), state)
      if (result.state === 'deleted' && expectedGeneration === state.generation) {
        setCopy(state, storagePath, null)
      } else {
        invalidate(state)
      }
      return result.state === 'deleted'
    },
  }
}

/** Puerto de `Pr`: `Bi` si no hay seguimiento de generación activo (o no
 * se dio backend), `ji(backend)` si sí. */
export function selectBackend(
  getStoragePath: StoragePathResolver,
  backend?: CredentialBackend,
  host: object = getCurrentHost(),
): {
  read(): Promise<SecureStorageData | null>
  readStrict(strict: boolean): Promise<SecureStorageData | null | ReadFailed>
} {
  if (isMultiHostAware() && backend !== undefined) {
    return withGenerationTracking(backend, getStoragePath, host)
  }
  return createRawFileReadBackend(getStoragePath)
}

// --- `mutate`: puerto de `Et` ---

/** Puerto de `Et`. Sin el evento de telemetría de la fuente (ver
 * docstring del módulo). */
export async function mutateCredentials(
  storage: SecureStorage,
  mutator: (data: SecureStorageData) => SecureStorageData,
  backend?: CredentialBackend,
): Promise<SecureStorageUpdateResult & { transient?: boolean }> {
  return withWriteLock(async () => {
    storage.invalidateCache?.()
    const current = storage.readAsyncStrict
      ? await storage.readAsyncStrict(backend, { inaccessibleAs: 'failureIfTransient' })
      : await storage.readAsync(backend)
    if (current === READ_FAILED) {
      return { success: false, transient: true }
    }
    const before = current ?? {}
    const next = mutator(before)
    if (next === before) return { success: true }
    return storage.update(next, backend)
  })
}

// --- Gate de Windows CredMan: puerto de `Ms`/`Gi`/`Ns`/`Ds`/`gWr`/`zi`/`hWr` ---

type WindowsCredManPaths = { legacyPath: string; configPath: string }

/** Puerto de `Ms`: memoiza una decisión booleana una única vez, salvo que
 * un `prime()` previo (con las mismas rutas) ya la haya fijado. */
export class FeatureFlagMemo {
  private memo: boolean | undefined
  private handedIn: (WindowsCredManPaths & { enabled: boolean }) | undefined

  prime(enabled: boolean, resolvePaths: () => WindowsCredManPaths): void {
    if (this.memo !== undefined) return
    this.handedIn = { enabled, ...resolvePaths() }
  }

  resolve(resolvePaths: () => WindowsCredManPaths, readFlag: (paths: WindowsCredManPaths) => boolean): boolean {
    if (this.memo !== undefined) return this.memo
    try {
      const paths = resolvePaths()
      const handedIn = this.handedIn
      if (
        handedIn !== undefined &&
        handedIn.legacyPath === paths.legacyPath &&
        handedIn.configPath === paths.configPath
      ) {
        this.memo = handedIn.enabled
      } else {
        this.memo = readFlag(paths)
      }
    } catch {
      this.memo = false
    }
    return this.memo
  }

  reset(): void {
    this.memo = undefined
    this.handedIn = undefined
  }
}

/** Puerto de `Gi`. */
const windowsCredManMemos = new HostScopedCache<FeatureFlagMemo>(() => new FeatureFlagMemo())

/** Puerto de `Ns`. */
export function getWindowsCredManMemo(host: object = getCurrentHost()): FeatureFlagMemo {
  return windowsCredManMemos.of(host)
}

/** Puerto de `Ds`, con el sufijo de `uK` fijo a la rama `prod` (ver
 * docstring del módulo). */
export function getWindowsCredManConfigPaths(): WindowsCredManPaths {
  return {
    legacyPath: join(getConfigHomeDir(), '.config.json'),
    configPath: join(getConfigHomeDir(), '.claude.json'),
  }
}

/** Puerto de `zi`. */
export function readWindowsCredManFlagFromConfig(paths: WindowsCredManPaths): boolean {
  const path = existsSync(paths.legacyPath) ? paths.legacyPath : paths.configPath
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
    cachedGrowthBookFeatures?: { tengu_windows_credman?: boolean }
  }
  return parsed.cachedGrowthBookFeatures?.tengu_windows_credman === true
}

/** Puerto de `gWr`. */
export function shouldUseWindowsCredMan(): boolean {
  if (process.env.THYROX_CODE_FORCE_WINDOWS_CREDMAN === '1') return true
  return getWindowsCredManMemo().resolve(getWindowsCredManConfigPaths, readWindowsCredManFlagFromConfig)
}

/** Puerto de `hWr`. */
export function primeWindowsCredManDecision(enabled: boolean): void {
  getWindowsCredManMemo().prime(enabled, getWindowsCredManConfigPaths)
}
