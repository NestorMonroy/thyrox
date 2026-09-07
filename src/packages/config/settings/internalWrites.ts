/**
 * Puerto de `ccnmt: packages/config/settings/internalWrites.ts` (37 líneas
 * fuente). Reimplementación fiel VERBATIM. Sin dependencias.
 *
 * Registra timestamps de escrituras de archivos de settings hechas EN
 * PROCESO, para que el watcher de `changeDetector.ts` (hoy bloqueado —
 * falta `chokidar` en `package.json`, ver `porte-completo-no-parcial.md`)
 * pueda ignorar sus propios ecos.
 *
 * Extraído de `changeDetector.ts` para romper el ciclo
 * `settings.ts → changeDetector.ts → hooks.ts → … → settings.ts`.
 * `settings.ts` necesita marcar "estoy por escribir" antes de que la
 * escritura aterrice; `changeDetector` necesita leer la marca cuando
 * `chokidar` dispara. El mapa es el único estado compartido — todo lo
 * demás en `changeDetector` (chokidar, hooks, polling MDM) es irrelevante
 * para `settings.ts`.
 *
 * Los llamadores pasan rutas ya resueltas. La resolución ruta→fuente
 * (`getSettingsFilePathForSource`) vive en `settings.ts`, así que
 * `settings.ts` la hace antes de llamar aquí.
 */

const timestamps = new Map<string, number>()

export function markInternalWrite(path: string): void {
  timestamps.set(path, Date.now())
}

/**
 * Verdadero si `path` fue marcada dentro de `windowMs`. Consume la marca al
 * acertar — el watcher dispara una vez por escritura, así que una marca
 * acertada no debería suprimir el siguiente cambio (real, externo) al mismo
 * archivo.
 */
export function consumeInternalWrite(path: string, windowMs: number): boolean {
  const ts = timestamps.get(path)
  if (ts !== undefined && Date.now() - ts < windowMs) {
    timestamps.delete(path)
    return true
  }
  return false
}

export function clearInternalWrites(): void {
  timestamps.clear()
}
