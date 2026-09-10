/**
 * Puerto de `ccnmt: packages/config/settings/toolValidationConfig.ts` (103
 * líneas fuente). Reimplementación fiel VERBATIM. Sin dependencias.
 *
 * Configuración de validación de herramientas. La mayoría de las
 * herramientas no necesitan configuración — la validación básica funciona
 * automáticamente. Sólo se añade una herramienta aquí si tiene requisitos
 * de patrón especiales.
 */

type ToolValidationConfig = {
  /** Herramientas que aceptan patrones glob de archivo (p. ej. *.ts, src/**) */
  filePatternTools: string[]

  /** Herramientas que aceptan patrones wildcard de bash (* en cualquier lado) y la sintaxis legada de prefijo :* */
  bashPrefixTools: string[]

  /** Reglas de validación custom para herramientas específicas */
  customValidation: {
    [toolName: string]: (content: string) => {
      valid: boolean
      error?: string
      suggestion?: string
      examples?: string[]
    }
  }
}

const TOOL_VALIDATION_CONFIG: ToolValidationConfig = {
  // Herramientas de patrón de archivo (aceptan *.ts, src/**, etc.)
  filePatternTools: [
    'Read',
    'Write',
    'Edit',
    'Glob',
    'NotebookRead',
    'NotebookEdit',
  ],

  // Herramientas wildcard de bash (aceptan * en cualquier lado, y la sintaxis legada command:*)
  bashPrefixTools: ['Bash'],

  // Validación custom (sólo si hace falta)
  customValidation: {
    // WebSearch no soporta wildcards ni patrones complejos.
    WebSearch: content => {
      if (content.includes('*') || content.includes('?')) {
        return {
          valid: false,
          error: 'WebSearch does not support wildcards',
          suggestion: 'Use exact search terms without * or ?',
          examples: ['WebSearch(claude ai)', 'WebSearch(typescript tutorial)'],
        }
      }
      return { valid: true }
    },

    // WebFetch usa el prefijo domain: para permisos basados en hostname.
    WebFetch: content => {
      // Comprueba si está intentando usar un formato de URL.
      if (content.includes('://') || content.startsWith('http')) {
        return {
          valid: false,
          error: 'WebFetch permissions use domain format, not URLs',
          suggestion: 'Use "domain:hostname" format',
          examples: [
            'WebFetch(domain:example.com)',
            'WebFetch(domain:github.com)',
          ],
        }
      }

      // Debe empezar con el prefijo domain:.
      if (!content.startsWith('domain:')) {
        return {
          valid: false,
          error: 'WebFetch permissions must use "domain:" prefix',
          suggestion: 'Use "domain:hostname" format',
          examples: [
            'WebFetch(domain:example.com)',
            'WebFetch(domain:*.google.com)',
          ],
        }
      }

      // Permite wildcards en patrones de dominio.
      // Válido: domain:*.example.com, domain:example.*, etc.
      return { valid: true }
    },
  },
}

// Comprueba si una herramienta usa patrones de archivo.
export function isFilePatternTool(toolName: string): boolean {
  return TOOL_VALIDATION_CONFIG.filePatternTools.includes(toolName)
}

// Comprueba si una herramienta usa patrones de prefijo bash.
export function isBashPrefixTool(toolName: string): boolean {
  return TOOL_VALIDATION_CONFIG.bashPrefixTools.includes(toolName)
}

// Obtiene la validación custom para una herramienta.
export function getCustomValidation(toolName: string) {
  return TOOL_VALIDATION_CONFIG.customValidation[toolName]
}
