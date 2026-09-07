/**
 * Puerto de `ccnmt: packages/config/settings/permissionValidation.ts` (277
 * líneas fuente). Reimplementación fiel VERBATIM.
 *
 * `tryGetConfigHostBindings().parsePermissionRule` ya existe en
 * `contracts.ts` (verificado antes de portar).
 */
import { z } from 'zod/v4'
import { lazySchema } from '../internal/lazySchema.ts'
import { tryGetConfigHostBindings } from '../host.ts'

// Utilidades pequeñas inlineadas para no arrastrar dependencias de `src/`.
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function mcpInfoFromString(toolString: string): {
  serverName: string
  toolName: string | undefined
} | null {
  const parts = toolString.split('__')
  const [mcpPart, serverName, ...toolNameParts] = parts
  if (mcpPart !== 'mcp' || !serverName) return null
  const toolName = toolNameParts.length > 0 ? toolNameParts.join('__') : undefined
  return { serverName, toolName }
}
import {
  getCustomValidation,
  isBashPrefixTool,
  isFilePatternTool,
} from './toolValidationConfig.ts'

/**
 * Comprueba si un carácter en un índice dado está escapado (precedido por
 * un número impar de backslashes).
 */
function isEscaped(str: string, index: number): boolean {
  let backslashCount = 0
  let j = index - 1
  while (j >= 0 && str[j] === '\\') {
    backslashCount++
    j--
  }
  return backslashCount % 2 !== 0
}

/**
 * Cuenta ocurrencias no escapadas de un carácter en una cadena. Un
 * carácter se considera escapado si está precedido por un número impar de
 * backslashes.
 */
function countUnescapedChar(str: string, char: string): number {
  let count = 0
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char && !isEscaped(str, i)) {
      count++
    }
  }
  return count
}

/**
 * Comprueba si una cadena contiene paréntesis vacíos "()" sin escapar.
 * Devuelve verdadero sólo si tanto el "(" como el ")" están sin escapar y
 * son adyacentes.
 */
function hasUnescapedEmptyParens(str: string): boolean {
  for (let i = 0; i < str.length - 1; i++) {
    if (str[i] === '(' && str[i + 1] === ')') {
      // Comprueba si el paréntesis de apertura está sin escapar.
      if (!isEscaped(str, i)) {
        return true
      }
    }
  }
  return false
}

/**
 * Valida el formato y contenido de una regla de permiso.
 */
export function validatePermissionRule(rule: string): {
  valid: boolean
  error?: string
  suggestion?: string
  examples?: string[]
} {
  // Chequeo de regla vacía.
  if (!rule || rule.trim() === '') {
    return { valid: false, error: 'Permission rule cannot be empty' }
  }

  // Chequea el balance de paréntesis primero (sólo cuenta paréntesis sin escapar).
  const openCount = countUnescapedChar(rule, '(')
  const closeCount = countUnescapedChar(rule, ')')
  if (openCount !== closeCount) {
    return {
      valid: false,
      error: 'Mismatched parentheses',
      suggestion:
        'Ensure all opening parentheses have matching closing parentheses',
    }
  }

  // Chequea paréntesis vacíos (consciente de escapes).
  if (hasUnescapedEmptyParens(rule)) {
    const toolName = rule.substring(0, rule.indexOf('('))
    if (!toolName) {
      return {
        valid: false,
        error: 'Empty parentheses with no tool name',
        suggestion: 'Specify a tool name before the parentheses',
      }
    }
    return {
      valid: false,
      error: 'Empty parentheses',
      suggestion: `Either specify a pattern or use just "${toolName}" without parentheses`,
      examples: [`${toolName}`, `${toolName}(some-pattern)`],
    }
  }

  // Parsea la regla.
  const bindings = tryGetConfigHostBindings()
  const parsed = bindings.parsePermissionRule?.(rule) ?? { toolName: rule }

  // Validación MCP — debe hacerse antes de la validación general de herramienta.
  const mcpInfo = mcpInfoFromString(parsed.toolName)
  if (mcpInfo) {
    // Las reglas MCP soportan permisos a nivel servidor, a nivel
    // herramienta y wildcard. Formatos válidos:
    // - mcp__server (nivel servidor, todas las herramientas)
    // - mcp__server__* (wildcard, todas las herramientas - equivalente a nivel servidor)
    // - mcp__server__tool (herramienta específica)

    // Las reglas MCP no pueden tener ningún patrón/contenido (paréntesis).
    // Chequea tanto el contenido parseado como la cadena cruda porque el
    // parser normaliza wildcards standalone (p. ej. "mcp__server(*)") a
    // ruleContent undefined.
    if (parsed.ruleContent !== undefined || countUnescapedChar(rule, '(') > 0) {
      return {
        valid: false,
        error: 'MCP rules do not support patterns in parentheses',
        suggestion: `Use "${parsed.toolName}" without parentheses, or use "mcp__${mcpInfo.serverName}__*" for all tools`,
        examples: [
          `mcp__${mcpInfo.serverName}`,
          `mcp__${mcpInfo.serverName}__*`,
          mcpInfo.toolName && mcpInfo.toolName !== '*'
            ? `mcp__${mcpInfo.serverName}__${mcpInfo.toolName}`
            : undefined,
        ].filter(Boolean) as string[],
      }
    }

    return { valid: true } // Regla MCP válida.
  }

  // Validación de nombre de herramienta (para herramientas no-MCP).
  if (!parsed.toolName || parsed.toolName.length === 0) {
    return { valid: false, error: 'Tool name cannot be empty' }
  }

  // Chequea que el nombre de herramienta empiece con mayúscula (herramientas estándar).
  if (parsed.toolName[0] !== parsed.toolName[0]?.toUpperCase()) {
    return {
      valid: false,
      error: 'Tool names must start with uppercase',
      suggestion: `Use "${capitalize(String(parsed.toolName))}"`,
    }
  }

  // Chequea reglas de validación custom primero.
  const customValidation = getCustomValidation(parsed.toolName)
  if (customValidation && parsed.ruleContent !== undefined) {
    const customResult = customValidation(parsed.ruleContent)
    if (!customResult.valid) {
      return customResult
    }
  }

  // Validación específica de bash.
  if (isBashPrefixTool(parsed.toolName) && parsed.ruleContent !== undefined) {
    const content = parsed.ruleContent

    // Chequea errores comunes de :* — :* debe estar al final (sintaxis legada de prefijo).
    if (content.includes(':*') && !content.endsWith(':*')) {
      return {
        valid: false,
        error: 'The :* pattern must be at the end',
        suggestion:
          'Move :* to the end for prefix matching, or use * for wildcard matching',
        examples: [
          'Bash(npm run:*) - prefix matching (legacy)',
          'Bash(npm run *) - wildcard matching',
        ],
      }
    }

    // Chequea :* sin prefijo.
    if (content === ':*') {
      return {
        valid: false,
        error: 'Prefix cannot be empty before :*',
        suggestion: 'Specify a command prefix before :*',
        examples: ['Bash(npm:*)', 'Bash(git:*)'],
      }
    }

    // Nota: no se valida el balance de comillas porque las reglas de
    // quoting de bash son complejas. Un comando como `grep '"'` tiene
    // comillas dobles desbalanceadas válidas. Los usuarios que creen
    // patrones con desajustes de comillas no intencionados lo descubrirán
    // cuando el match no funcione como esperaban.

    // Los wildcards ya se permiten en cualquier posición para matching
    // flexible de patrones. Ejemplos de patrones wildcard válidos:
    // - "npm *" matchea "npm install", "npm run test", etc.
    // - "* install" matchea "npm install", "yarn install", etc.
    // - "git * main" matchea "git checkout main", "git push main", etc.
    // - "npm * --save" matchea "npm install foo --save", etc.
    //
    // La sintaxis legada :* sigue funcionando por compatibilidad hacia atrás:
    // - "npm:*" matchea "npm" o "npm <cualquier cosa>" (prefix matching con límite de palabra)
  }

  // Validación de herramienta de archivo.
  if (isFilePatternTool(parsed.toolName) && parsed.ruleContent !== undefined) {
    const content = parsed.ruleContent

    // Chequea :* en patrones de archivo (error común heredado de patrones Bash).
    if (content.includes(':*')) {
      return {
        valid: false,
        error: 'The ":*" syntax is only for Bash prefix rules',
        suggestion: 'Use glob patterns like "*" or "**" for file matching',
        examples: [
          `${parsed.toolName}(*.ts) - matches .ts files`,
          `${parsed.toolName}(src/**) - matches all files in src`,
          `${parsed.toolName}(**/*.test.ts) - matches test files`,
        ],
      }
    }

    // Avisa sobre wildcards fuera de límites.
    if (
      content.includes('*') &&
      !content.match(/^\*|\*$|\*\*|\/\*|\*\.|\*\)/) &&
      !content.includes('**')
    ) {
      // Chequeo laxo — wildcards en medio pueden ser válidos en algunos
      // casos, pero suelen indicar confusión.
      return {
        valid: false,
        error: 'Wildcard placement might be incorrect',
        suggestion: 'Wildcards are typically used at path boundaries',
        examples: [
          `${parsed.toolName}(*.js) - all .js files`,
          `${parsed.toolName}(src/*) - all files directly in src`,
          `${parsed.toolName}(src/**) - all files recursively in src`,
        ],
      }
    }
  }

  return { valid: true }
}

/**
 * Esquema Zod custom para arrays de reglas de permiso.
 */
export const PermissionRuleSchema = lazySchema(() =>
  z.string().superRefine((val, ctx) => {
    const result = validatePermissionRule(val)
    if (!result.valid) {
      let message = result.error!
      if (result.suggestion) {
        message += `. ${result.suggestion}`
      }
      if (result.examples && result.examples.length > 0) {
        message += `. Examples: ${result.examples.join(', ')}`
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        params: { received: val },
      })
    }
  }),
)
