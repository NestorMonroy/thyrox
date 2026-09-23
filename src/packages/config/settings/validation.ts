/**
 * Validación de un archivo de settings.
 *
 * La asimetría es deliberada y viene del cliente: un archivo **roto** se anota
 * y se sigue con las demás fuentes; no se aborta. Una configuración mal
 * escrita no debe dejar la sesión inservible — pero tampoco pasar callada, y
 * por eso todo error sale con archivo y ruta de clave.
 */
import type { ZodError } from 'zod'
import { SettingsSchema } from './types.ts'
import { generateSettingsJSONSchema } from './schemaOutput.ts'

export type SettingsError = {
  file: string
  path: string
  message: string
  invalidValue?: unknown
}

/** Nombre público conservado por los consumers anteriores al rename. */
export type ValidationError = SettingsError

/**
 * Settings fusionados más sus errores de validación — la forma exacta que
 * ya devuelve `settings.ts: getSettingsWithErrors`. Se nombra aquí porque
 * `allErrors.ts` y `settingsCache.ts` (ambos completados en este mismo pase)
 * la citan por este nombre, igual que la fuente
 * (`ccnmt: packages/config/settings/validation.ts:79`).
 */
export type SettingsWithErrors = { settings: import('./types.ts').SettingsJson; errors: SettingsError[] }

export function formatZodError(error: ZodError, file: string): SettingsError[] {
  return error.issues.map((i) => ({
    file,
    path: i.path.join('.') || '(raíz)',
    message: i.message,
  }))
}

export type ValidationResult =
  | { isValid: true }
  | { isValid: false; error: string; fullSchema: string }

export function validateSettingsFileContent(content: string): ValidationResult {
  let data: unknown
  try {
    data = JSON.parse(content)
  } catch (e) {
    return {
      isValid: false,
      error: `Invalid JSON / JSON inválido: ${(e as Error).message}`,
      fullSchema: generateSettingsJSONSchema(),
    }
  }
  // El schema público es passthrough para cargar versiones futuras. Esta
  // frontera valida una edición escrita por Thyrox y por ello es estricta.
  const r = SettingsSchema.strict().safeParse(data)
  if (!r.success) {
    return {
      isValid: false,
      error: `Settings validation failed: ${formatZodError(r.error, '(contenido)').map((x) => `${x.path}: ${x.message}`).join('; ')}`,
      fullSchema: generateSettingsJSONSchema(),
    }
  }
  return { isValid: true }
}

/**
 * Quita de `permissions.allow`/`deny` lo que no sea cadena, **mutando** el
 * objeto, y devuelve un aviso por lista tocada. Se descarta la entrada mala en
 * vez de rechazar el archivo: una regla mal tecleada no debe desactivar las
 * demás reglas de permiso, que es justo lo que protege.
 */
export function filterInvalidPermissionRules(data: unknown, file: string): SettingsError[] {
  if (typeof data !== 'object' || data === null) return []
  const permisos = (data as { permissions?: Record<string, unknown> }).permissions
  if (typeof permisos !== 'object' || permisos === null) return []
  const avisos: SettingsError[] = []
  for (const lista of ['allow', 'deny', 'ask']) {
    const v = permisos[lista]
    if (!Array.isArray(v)) continue
    const limpias: string[] = []
    for (const rule of v) {
      if (typeof rule !== 'string') {
        avisos.push({
          file,
          path: `permissions.${lista}`,
          message: 'Non-string permission rule was discarded',
          invalidValue: rule,
        })
      } else if (!/^[A-Z][A-Za-z]*(?:\([^()]*\))?$/.test(rule)) {
        avisos.push({
          file,
          path: `permissions.${lista}`,
          message: `Invalid permission rule was discarded: ${rule}`,
          invalidValue: rule,
        })
      } else {
        limpias.push(rule)
      }
    }
    permisos[lista] = limpias
  }
  return avisos
}
