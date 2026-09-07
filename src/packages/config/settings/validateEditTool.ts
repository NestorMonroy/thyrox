/**
 * Puerto de `ccnmt: packages/config/settings/validateEditTool.ts` (54
 * líneas fuente). Adaptado en un punto, declarado abajo.
 *
 * DIVERGENCIA declarada: la fuente interpola `afterValidation.fullSchema`
 * en el mensaje de error. Nuestro `ValidationResult` (`./validation.ts`,
 * ya portado por un agente anterior con un esquema más reducido que el de
 * la fuente) no lleva ese campo — se omite del mensaje en vez de
 * fabricarlo. El resto es fiel.
 */
import { tryGetConfigHostBindings } from '../host.ts'
import { validateSettingsFileContent } from './validation.ts'

// config define su propio contrato de validación en vez de importar el
// tipo de tool-registry (la hoja de Wave 1 no puede depender de un paquete
// de Domain Core). El sitio de llamada de FileEditTool convierte esto al
// ValidationResult de tool-registry.
export type SettingsEditValidationFailure = {
  result: false
  message: string
  errorCode: number
}

/**
 * Valida las ediciones a un archivo de settings para garantizar que el
 * resultado se ajusta a SettingsSchema. Lo usa FileEditTool para evitar
 * duplicación de código.
 *
 * @param filePath - la ruta del archivo que se está editando
 * @param originalContent - el contenido original del archivo antes de la edición
 * @param getUpdatedContent - un closure que devuelve el contenido tras aplicar las ediciones
 * @returns resultado de validación con detalles de error si la validación falla
 */
export function validateInputForSettingsFileEdit(
  filePath: string,
  originalContent: string,
  getUpdatedContent: () => string,
): SettingsEditValidationFailure | null {
  // Sólo valida archivos de settings de Claude.
  const bindings = tryGetConfigHostBindings()
  if (!bindings.isClaudeSettingsPath?.(filePath)) {
    return null
  }

  // Comprueba si el archivo actual (antes de la edición) se ajusta al esquema.
  const beforeValidation = validateSettingsFileContent(originalContent)

  if (!beforeValidation.isValid) {
    // Si la versión de antes es inválida, permite la edición (no la bloquea).
    return null
  }

  // Si la versión de antes es válida, asegura que la de después también lo sea.
  const updatedContent = getUpdatedContent()
  const afterValidation = validateSettingsFileContent(updatedContent)

  if (!afterValidation.isValid) {
    return {
      result: false,
      message: `Claude Code settings.json validation failed after edit:\n${afterValidation.error}\n\nIMPORTANT: Do not update the env unless explicitly instructed to do so.`,
      errorCode: 10,
    }
  }

  return null
}
