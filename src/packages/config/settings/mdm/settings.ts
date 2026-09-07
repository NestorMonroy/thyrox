/**
 * Puerto de `ccnmt: packages/config/settings/mdm/settings.ts` (381 líneas
 * fuente). Adaptado en un punto, declarado abajo.
 *
 * DIVERGENCIA declarada: la fuente llama `SettingsSchema().safeParse(data)`
 * porque allí `SettingsSchema` es un `lazySchema()`. Aquí
 * `SettingsSchema` ya es el objeto Zod resuelto (`../types.ts`, portado por
 * un agente anterior) — se llama `.safeParse` directamente, sin los
 * paréntesis de invocación. Mismo comportamiento observable.
 *
 * Lectura de settings managed MDM (Mobile Device Management) para Claude
 * Code, desde la configuración MDM a nivel de SO:
 * - macOS: dominio de preferencia `com.anthropic.claudecode`
 *   (perfiles MDM sólo en /Library/Managed Preferences/ — no en
 *   ~/Library/Preferences/, que es escribible por el usuario).
 * - Windows: `HKLM\SOFTWARE\Policies\ClaudeCode` (sólo admin)
 *   y `HKCU\SOFTWARE\Policies\ClaudeCode` (escribible por usuario, menor prioridad).
 * - Linux: sin equivalente MDM (usa
 *   `/etc/claude-code-how-works-how-works/managed-settings.json` en su lugar —
 *   literal tal cual de la fuente; ver la nota de `managedPath.ts`).
 *
 * Los settings de política usan "gana la primera fuente". Prioridad (de
 * mayor a menor):
 *   remoto → HKLM/plist → managed-settings.json → HKCU
 *
 * Arquitectura:
 *   constants.ts — constantes compartidas y constructor de rutas de plist (sin imports pesados)
 *   rawRead.ts   — sólo I/O de subproceso (sin imports pesados, dispara en la evaluación de main.tsx)
 *   settings.ts  — parseo, caché, lógica gana-la-primera-fuente (este archivo)
 */

import { readdirSync, readFileSync as fsReadFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigHostBindings } from '../../host.ts'
import { getWslInheritedWindowsSettings } from '../../wslWindowsSettings.ts'
import {
  applyPolicyHelper,
  getPolicyHelperManagedSettings,
} from '../../policyHelper.ts'

// Utilidades inlineadas para no arrastrar dependencias de `src/`.
function safeParseJSON(json: string | null | undefined, _shouldLogError?: boolean): unknown {
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}
function readFileSync(path: string): string {
  return fsReadFileSync(path, 'utf8')
}
import {
  getManagedFilePath,
  getManagedSettingsDropInDir,
} from '../managedPath.ts'
import { SettingsSchema, type SettingsJson } from '../types.ts'
import {
  filterInvalidPermissionRules,
  formatZodError,
} from '../validation.ts'
import type { SettingsError } from '../validation.ts'
import {
  WINDOWS_REGISTRY_KEY_PATH_HKCU,
  WINDOWS_REGISTRY_KEY_PATH_HKLM,
  WINDOWS_REGISTRY_VALUE_NAME,
} from './constants.ts'
import {
  fireRawRead,
  getMdmRawReadPromise,
  type RawReadResult,
} from './rawRead.ts'

// La fuente tipa esto como `ValidationError`; nuestro `validation.ts`
// (ya portado, con un esquema más reducido) declara el mismo campo bajo
// `SettingsError` — mismo shape (`file`, `path`, `message`).
type ValidationError = SettingsError

// ---------------------------------------------------------------------------
// Tipos y caché
// ---------------------------------------------------------------------------

type MdmResult = { settings: SettingsJson; errors: ValidationError[] }
const EMPTY_RESULT: MdmResult = Object.freeze({ settings: {}, errors: [] })
let mdmCache: MdmResult | null = null
let hkcuCache: MdmResult | null = null
let mdmLoadPromise: Promise<void> | null = null

// ---------------------------------------------------------------------------
// Carga de arranque — dispara temprano, se espera antes de la primera lectura de settings
// ---------------------------------------------------------------------------

/**
 * Dispara las lecturas async MDM/HKCU. Llamar esto lo antes posible en el
 * arranque para que el subproceso corra en paralelo con la carga del
 * módulo.
 */
export function startMdmSettingsLoad(): void {
  if (mdmLoadPromise) return
  mdmLoadPromise = (async () => {
    getConfigHostBindings().profileCheckpoint?.('mdm_load_start')
    const startTime = Date.now()

    // Usa la lectura cruda de arranque si cli.tsx la disparó; si no,
    // dispara una fresca. Ambas rutas producen el mismo RawReadResult;
    // consumeRawReadResult lo parsea.
    const rawPromise = getMdmRawReadPromise() ?? fireRawRead()
    const { mdm, hkcu } = consumeRawReadResult(await rawPromise)
    mdmCache = mdm
    hkcuCache = hkcu

    // Puerto de ant v2.1.136 (0684.js) — al correr dentro de WSL,
    // opcionalmente superpone la cadena de política de Windows sobre los
    // managed-settings de Linux. El doble opt-in (flag de fuente admin Y
    // flag de HKCU) se aplica dentro de `getWslInheritedWindowsSettings`;
    // un resultado `null` significa que no hay fusión.
    try {
      const winSettings = await getWslInheritedWindowsSettings()
      if (winSettings) {
        mdmCache = {
          ...mdmCache,
          settings: { ...mdmCache.settings, ...winSettings },
        }
      }
    } catch (e) {
      getConfigHostBindings().logDebug?.(
        `WSL inherited Windows settings read failed: ${(e as Error).message}`,
      )
    }

    // Puerto de ant v2.1.136 `fE_` `rAq` (0686.js) — policyHelper. Tras
    // cargar los settings managed de archivo/HKLM/HKCU, si alguno declara
    // `policyHelper.path`, invoca ese binario admin y fusiona su envoltorio
    // (managedSettings + claudeMd + appendSystemPrompt) en la caché.
    // Restringido por fuente: sólo fuentes controladas por admin
    // (plist/hklm/file) pueden declarar un helper.
    //
    // La caché MDM es admin-por-construcción (sólo se carga HKLM/plist/file
    // vía fireRawRead), así que se pasa `'file'` como fuente — ant usa la
    // cadena de fuente real que aportó la config del helper; nuestra caché
    // acotada sólo lleva fuentes admin, así que la cadena concreta es
    // intercambiable para el guard de validación de fuente.
    try {
      const err = await applyPolicyHelper(
        mdmCache.settings as { policyHelper?: unknown },
        'file',
      )
      if (err) {
        getConfigHostBindings().logDebug?.(err)
      } else {
        const ms = getPolicyHelperManagedSettings()
        if (ms) {
          mdmCache = {
            ...mdmCache,
            settings: { ...mdmCache.settings, ...ms },
          }
        }
      }
    } catch (e) {
      getConfigHostBindings().logDebug?.(
        `policyHelper invocation failed: ${(e as Error).message}`,
      )
    }

    getConfigHostBindings().profileCheckpoint?.('mdm_load_end')

    const duration = Date.now() - startTime
    getConfigHostBindings().logDebug?.(`MDM settings load completed in ${duration}ms`)
    if (Object.keys(mdm.settings).length > 0) {
      getConfigHostBindings().logDebug?.(
        `MDM settings found: ${Object.keys(mdm.settings).join(', ')}`,
      )
      try {
        getConfigHostBindings().logDiagnostics?.('info', 'mdm_settings_loaded', {
          duration_ms: duration,
          key_count: Object.keys(mdm.settings).length,
          error_count: mdm.errors.length,
        })
      } catch {
        // El logging de diagnóstico es best-effort.
      }
    }
  })()
}

/**
 * Espera la carga MDM en vuelo. Llamar antes de la primera lectura de
 * settings. Si `startMdmSettingsLoad()` se llamó lo bastante temprano, esto
 * resuelve de inmediato.
 */
export async function ensureMdmSettingsLoaded(): Promise<void> {
  if (!mdmLoadPromise) {
    startMdmSettingsLoad()
  }
  await mdmLoadPromise
}

// ---------------------------------------------------------------------------
// Lectores de caché sync — usados por el pipeline de settings (loadSettingsFromDisk)
// ---------------------------------------------------------------------------

/**
 * Lee los settings MDM controlados por admin desde la caché de sesión.
 *
 * Devuelve settings de fuentes sólo-admin:
 * - macOS: /Library/Managed Preferences/ (requiere root)
 * - Windows: registro HKLM (requiere admin)
 *
 * NO incluye HKCU (escribible por usuario) — usar `getHkcuSettings()` para eso.
 */
export function getMdmSettings(): MdmResult {
  return mdmCache ?? EMPTY_RESULT
}

/**
 * Lee los settings del registro HKCU (escribible por usuario, menor
 * prioridad de política). Sólo relevante en Windows — devuelve vacío en
 * otras plataformas.
 */
export function getHkcuSettings(): MdmResult {
  return hkcuCache ?? EMPTY_RESULT
}

// ---------------------------------------------------------------------------
// Gestión de caché
// ---------------------------------------------------------------------------

/**
 * Limpia las cachés MDM y HKCU, forzando una lectura fresca en la próxima
 * carga.
 */
export function clearMdmSettingsCache(): void {
  mdmCache = null
  hkcuCache = null
  mdmLoadPromise = null
}

/**
 * Actualiza las cachés de sesión directamente. Lo usa el poll del change
 * detector.
 */
export function setMdmSettingsCache(mdm: MdmResult, hkcu: MdmResult): void {
  mdmCache = mdm
  hkcuCache = hkcu
}

// ---------------------------------------------------------------------------
// Refresh — dispara una lectura cruda fresca, la parsea, devuelve resultados.
// Usado por el poll de 30 minutos en changeDetector.ts.
// ---------------------------------------------------------------------------

/**
 * Dispara una lectura de subproceso MDM fresca y parsea los resultados.
 * NO actualiza la caché — el llamador decide si aplicar.
 */
export async function refreshMdmSettings(): Promise<{
  mdm: MdmResult
  hkcu: MdmResult
}> {
  const raw = await fireRawRead()
  return consumeRawReadResult(raw)
}

// ---------------------------------------------------------------------------
// Parseo — convierte la salida cruda del subproceso a un MdmResult validado
// ---------------------------------------------------------------------------

/**
 * Parsea la salida de un comando JSON (stdout de plutil o valor JSON de
 * registro) a `SettingsJson`. Filtra reglas de permiso inválidas antes de
 * la validación del esquema, para que una regla mal formada no cause que
 * los settings MDM enteros se rechacen.
 */
export function parseCommandOutputAsSettings(
  stdout: string,
  sourcePath: string,
): { settings: SettingsJson; errors: ValidationError[] } {
  const data = safeParseJSON(stdout, false)
  if (!data || typeof data !== 'object') {
    return { settings: {}, errors: [] }
  }

  const ruleWarnings = filterInvalidPermissionRules(data, sourcePath)
  const parseResult = SettingsSchema.safeParse(data)
  if (!parseResult.success) {
    const errors = formatZodError(parseResult.error, sourcePath)
    return { settings: {}, errors: [...ruleWarnings, ...errors] }
  }
  return { settings: parseResult.data, errors: ruleWarnings }
}

/**
 * Parsea el stdout de `reg query` para extraer un valor de cadena de
 * registro. Matchea tanto REG_SZ como REG_EXPAND_SZ, sin distinguir
 * mayúsculas.
 *
 * Formato esperado:
 *     Settings    REG_SZ    {"json":"value"}
 */
export function parseRegQueryStdout(
  stdout: string,
  valueName = 'Settings',
): string | null {
  const lines = stdout.split(/\r?\n/)
  const escaped = valueName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^\\s+${escaped}\\s+REG_(?:EXPAND_)?SZ\\s+(.*)$`, 'i')
  for (const line of lines) {
    const match = line.match(re)
    if (match && match[1]) {
      return match[1].trimEnd()
    }
  }
  return null
}

/**
 * Convierte la salida cruda del subproceso en resultados MDM y HKCU
 * parseados, aplicando la política gana-la-primera-fuente.
 */
function consumeRawReadResult(raw: RawReadResult): {
  mdm: MdmResult
  hkcu: MdmResult
} {
  // macOS: resultado de plist (gana la primera fuente — ya filtrado en mdmRawRead).
  if (raw.plistStdouts && raw.plistStdouts.length > 0) {
    const { stdout, label } = raw.plistStdouts[0]!
    const result = parseCommandOutputAsSettings(stdout, label)
    if (Object.keys(result.settings).length > 0) {
      return { mdm: result, hkcu: EMPTY_RESULT }
    }
  }

  // Windows: resultado HKLM.
  if (raw.hklmStdout) {
    const jsonString = parseRegQueryStdout(raw.hklmStdout)
    if (jsonString) {
      const result = parseCommandOutputAsSettings(
        jsonString,
        `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKLM}\\${WINDOWS_REGISTRY_VALUE_NAME}`,
      )
      if (Object.keys(result.settings).length > 0) {
        return { mdm: result, hkcu: EMPTY_RESULT }
      }
    }
  }

  // Sin MDM admin — comprueba managed-settings.json antes de usar HKCU.
  if (hasManagedSettingsFile()) {
    return { mdm: EMPTY_RESULT, hkcu: EMPTY_RESULT }
  }

  // Cae a HKCU (ya leído en paralelo).
  if (raw.hkcuStdout) {
    const jsonString = parseRegQueryStdout(raw.hkcuStdout)
    if (jsonString) {
      const result = parseCommandOutputAsSettings(
        jsonString,
        `Registry: ${WINDOWS_REGISTRY_KEY_PATH_HKCU}\\${WINDOWS_REGISTRY_VALUE_NAME}`,
      )
      return { mdm: EMPTY_RESULT, hkcu: result }
    }
  }

  return { mdm: EMPTY_RESULT, hkcu: EMPTY_RESULT }
}

/**
 * Comprueba si existen settings managed basados en archivo
 * (managed-settings.json o cualquier managed-settings.d/*.json) con
 * contenido. Chequeo sync barato usado para saltar HKCU cuando existe una
 * fuente de archivo de mayor prioridad.
 */
function hasManagedSettingsFile(): boolean {
  try {
    const filePath = join(getManagedFilePath(), 'managed-settings.json')
    const content = readFileSync(filePath)
    const data = safeParseJSON(content, false)
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      return true
    }
  } catch {
    // sigue al chequeo drop-in.
  }
  try {
    const dropInDir = getManagedSettingsDropInDir()
    const entries = readdirSync(dropInDir, { withFileTypes: true })
    for (const d of entries) {
      if (
        !(d.isFile() || d.isSymbolicLink()) ||
        !d.name.endsWith('.json') ||
        d.name.startsWith('.')
      ) {
        continue
      }
      try {
        const content = readFileSync(join(dropInDir, d.name))
        const data = safeParseJSON(content, false)
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          return true
        }
      } catch {
        // se salta el archivo ilegible/malformado.
      }
    }
  } catch {
    // el directorio drop-in no existe.
  }
  return false
}
