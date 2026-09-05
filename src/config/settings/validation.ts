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

export type SettingsError = { file: string; path: string; message: string }

export function formatZodError(error: ZodError, file: string): SettingsError[] {
  return error.issues.map((i) => ({
    file,
    path: i.path.join('.') || '(raíz)',
    message: i.message,
  }))
}

export type ValidationResult = { isValid: true; settings: unknown } | { isValid: false; error: string }

export function validateSettingsFileContent(content: string): ValidationResult {
  let data: unknown
  try {
    data = JSON.parse(content)
  } catch (e) {
    return { isValid: false, error: `JSON inválido: ${(e as Error).message}` }
  }
  const r = SettingsSchema.safeParse(data)
  if (!r.success) {
    return { isValid: false, error: formatZodError(r.error, '(contenido)').map((x) => `${x.path}: ${x.message}`).join('; ') }
  }
  return { isValid: true, settings: r.data }
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
  for (const lista of ['allow', 'deny']) {
    const v = permisos[lista]
    if (!Array.isArray(v)) continue
    const limpias = v.filter((x) => typeof x === 'string')
    if (limpias.length !== v.length) {
      avisos.push({ file, path: `permissions.${lista}`, message: `se descartaron ${v.length - limpias.length} reglas que no son cadena` })
      permisos[lista] = limpias
    }
  }
  return avisos
}
