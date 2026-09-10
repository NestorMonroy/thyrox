/**
 * Porte fiel de `ccnmt: packages/permission/src/shadowedRuleDetection.ts`
 * (234 líneas, 3 exports, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: los tres tipos exportados
 * (`ShadowType`/`UnreachableRule`/`DetectUnreachableRulesOptions`) y las
 * cinco funciones (dos privadas, tres públicas) están presentes, con el
 * mismo cuerpo. Diagnóstico de reglas inalcanzables — detecta cuándo una
 * regla `allow` específica queda bloqueada por una regla `ask`/`deny` de
 * mayor alcance sobre la misma herramienta.
 *
 * Divergencias medidas:
 *
 * - `ToolPermissionContext`/`getAllowRules`/`getAskRules`/`getDenyRules`/
 *   `permissionRuleSourceDisplayString` vienen de `./permissions.js` (ya
 *   porte parcial de este mismo paquete) en vez de
 *   `@claude-code-how-works/tool-registry/Tool.js` + `./permissions.js`
 *   de la fuente — el primero no existe en este árbol; el segundo YA
 *   declaraba y exportaba (tras este mismo pase) el
 *   `ToolPermissionContext` local más angosto que este archivo necesita
 *   (sólo `alwaysAllowRules`/`alwaysDenyRules`/`alwaysAskRules`), así que
 *   se reusa en vez de duplicar un cuarto tipo.
 * - `BASH_TOOL_NAME` se declara localmente como `'Bash'` en vez de
 *   importarse de `@claude-code-how-works/tool-registry/tools/BashTool/toolName.js`
 *   (paquete ausente en este árbol) — verificado leyendo esa fuente
 *   (sólo lectura): `export const BASH_TOOL_NAME = 'Bash'`, sin lógica
 *   adicional.
 */
import type { PermissionRule, PermissionRuleSource } from './PermissionRule.js'
import {
  getAllowRules,
  getAskRules,
  getDenyRules,
  permissionRuleSourceDisplayString,
  type ToolPermissionContext,
} from './permissions.js'

/** Divergencia declarada arriba — ver el docstring del módulo. */
const BASH_TOOL_NAME = 'Bash'

/**
 * Tipo de shadowing que hace inalcanzable a una regla.
 */
export type ShadowType = 'ask' | 'deny'

/**
 * Representa una regla de permiso inalcanzable, con su explicación.
 */
export type UnreachableRule = {
  rule: PermissionRule
  reason: string
  shadowedBy: PermissionRule
  shadowType: ShadowType
  fix: string
}

/**
 * Opciones para detectar reglas inalcanzables.
 */
export type DetectUnreachableRulesOptions = {
  /**
   * Si el auto-allow del sandbox está habilitado para comandos Bash.
   * Cuando es true, las reglas `ask` de alcance-herramienta desde
   * settings personales no bloquean reglas `allow` específicas de Bash
   * porque los comandos en sandbox se auto-permiten.
   */
  sandboxAutoAllowEnabled: boolean
}

/**
 * Resultado de comprobar si una regla está shadowed. Unión discriminada
 * para seguridad de tipos.
 */
type ShadowResult =
  | { shadowed: false }
  | { shadowed: true; shadowedBy: PermissionRule; shadowType: ShadowType }

/**
 * Comprueba si una fuente de regla de permiso es compartida (visible
 * para otros usuarios). Settings compartidos:
 * - projectSettings: comiteados a git, compartidos con el equipo
 * - policySettings: gestionados por la empresa, empujados a todos los usuarios
 * - command: de frontmatter de slash command, potencialmente compartido
 *
 * Settings personales:
 * - userSettings: settings globales ~/.claude del usuario
 * - localSettings: settings gitignored por proyecto
 * - cliArg: argumentos CLI en tiempo de ejecución
 * - session: reglas en memoria de la sesión
 * - flagSettings: del flag --settings (en tiempo de ejecución)
 */
export function isSharedSettingSource(source: PermissionRuleSource): boolean {
  return (
    source === 'projectSettings' ||
    source === 'policySettings' ||
    source === 'command'
  )
}

/**
 * Formatea una fuente de regla para mostrar en mensajes de advertencia.
 */
function formatSource(source: PermissionRuleSource): string {
  return permissionRuleSourceDisplayString(source)
}

/**
 * Genera una sugerencia de arreglo según el tipo de shadow.
 */
function generateFixSuggestion(
  shadowType: ShadowType,
  shadowingRule: PermissionRule,
  shadowedRule: PermissionRule,
): string {
  const shadowingSource = formatSource(shadowingRule.source)
  const shadowedSource = formatSource(shadowedRule.source)
  const toolName = shadowingRule.ruleValue.toolName

  if (shadowType === 'deny') {
    return `Remove the "${toolName}" deny rule from ${shadowingSource}, or remove the specific allow rule from ${shadowedSource}`
  }
  return `Remove the "${toolName}" ask rule from ${shadowingSource}, or remove the specific allow rule from ${shadowedSource}`
}

/**
 * Comprueba si una regla `allow` específica está shadowed (inalcanzable)
 * por una regla `ask`.
 *
 * Una regla allow es inalcanzable cuando:
 * 1. Hay una regla ask de alcance-herramienta (p. ej. "Bash" en la lista ask)
 * 2. Y una regla allow específica (p. ej. "Bash(ls:*)" en la lista allow)
 *
 * La regla ask tiene precedencia, dejando inalcanzable a la regla allow
 * específica porque siempre se le preguntará al usuario primero.
 *
 * Excepción: para Bash con auto-allow de sandbox habilitado, las reglas
 * ask de alcance-herramienta desde settings PERSONALES no shadowean
 * reglas allow específicas porque:
 * - Los comandos en sandbox se auto-permiten sin importar las reglas ask
 * - Esto sólo aplica a settings personales (userSettings, localSettings, etc.)
 * - Los settings compartidos (projectSettings, policySettings) siempre
 *   advierten porque otros miembros del equipo pueden no tener sandbox
 *   habilitado
 */
function isAllowRuleShadowedByAskRule(
  allowRule: PermissionRule,
  askRules: PermissionRule[],
  options: DetectUnreachableRulesOptions,
): ShadowResult {
  const { toolName, ruleContent } = allowRule.ruleValue

  // Sólo comprueba reglas allow con contenido específico (p. ej. "Bash(ls:*)").
  // Las reglas allow de alcance-herramienta no pueden ser shadowed por reglas ask.
  if (ruleContent === undefined) {
    return { shadowed: false }
  }

  // Busca cualquier regla ask de alcance-herramienta para la misma herramienta.
  const shadowingAskRule = askRules.find(
    askRule =>
      askRule.ruleValue.toolName === toolName &&
      askRule.ruleValue.ruleContent === undefined,
  )

  if (!shadowingAskRule) {
    return { shadowed: false }
  }

  // Caso especial: Bash con auto-allow de sandbox desde settings personales.
  // La excepción de sandbox se basa en la fuente de la regla ASK, no en la
  // de la regla allow. Si la regla ask es de settings personales, el
  // sandbox del propio usuario auto-permitirá. Si la regla ask es de
  // settings compartidos, otros miembros del equipo pueden no tener
  // sandbox habilitado.
  if (toolName === BASH_TOOL_NAME && options.sandboxAutoAllowEnabled) {
    if (!isSharedSettingSource(shadowingAskRule.source)) {
      return { shadowed: false }
    }
    // Sigue de largo — los settings compartidos siempre deben advertir.
  }

  return { shadowed: true, shadowedBy: shadowingAskRule, shadowType: 'ask' }
}

/**
 * Comprueba si una regla allow está shadowed (completamente bloqueada)
 * por una regla deny.
 *
 * Una regla allow es inalcanzable cuando:
 * 1. Hay una regla deny de alcance-herramienta (p. ej. "Bash" en la lista deny)
 * 2. Y una regla allow específica (p. ej. "Bash(ls:*)" en la lista allow)
 *
 * Las reglas deny se comprueban primero en el orden de evaluación de
 * permisos, así que la regla allow nunca se alcanza — la herramienta
 * siempre queda denegada. Esto es más severo que el ask-shadowing porque
 * la regla queda verdaderamente bloqueada.
 */
function isAllowRuleShadowedByDenyRule(
  allowRule: PermissionRule,
  denyRules: PermissionRule[],
): ShadowResult {
  const { toolName, ruleContent } = allowRule.ruleValue

  // Sólo comprueba reglas allow con contenido específico (p. ej. "Bash(ls:*)").
  // Las reglas allow de alcance-herramienta chocan con reglas deny de
  // alcance-herramienta pero no están "shadowed".
  if (ruleContent === undefined) {
    return { shadowed: false }
  }

  // Busca cualquier regla deny de alcance-herramienta para la misma herramienta.
  const shadowingDenyRule = denyRules.find(
    denyRule =>
      denyRule.ruleValue.toolName === toolName &&
      denyRule.ruleValue.ruleContent === undefined,
  )

  if (!shadowingDenyRule) {
    return { shadowed: false }
  }

  return { shadowed: true, shadowedBy: shadowingDenyRule, shadowType: 'deny' }
}

/**
 * Detecta todas las reglas de permiso inalcanzables en el contexto dado.
 *
 * Detecta actualmente:
 * - Reglas allow shadowed por reglas deny de alcance-herramienta (más
 *   severo — completamente bloqueadas)
 * - Reglas allow shadowed por reglas ask de alcance-herramienta (siempre
 *   preguntarán)
 */
export function detectUnreachableRules(
  context: ToolPermissionContext,
  options: DetectUnreachableRulesOptions,
): UnreachableRule[] {
  const unreachable: UnreachableRule[] = []

  const allowRules = getAllowRules(context)
  const askRules = getAskRules(context)
  const denyRules = getDenyRules(context)

  for (const allowRule of allowRules) {
    // Comprueba primero el shadowing por deny (más severo).
    const denyResult = isAllowRuleShadowedByDenyRule(allowRule, denyRules)
    if (denyResult.shadowed) {
      const shadowSource = formatSource(denyResult.shadowedBy.source)
      unreachable.push({
        rule: allowRule,
        reason: `Blocked by "${denyResult.shadowedBy.ruleValue.toolName}" deny rule (from ${shadowSource})`,
        shadowedBy: denyResult.shadowedBy,
        shadowType: 'deny',
        fix: generateFixSuggestion('deny', denyResult.shadowedBy, allowRule),
      })
      continue // No reporta también ask-shadowing si ya está deny-shadowed.
    }

    // Comprueba el shadowing por ask.
    const askResult = isAllowRuleShadowedByAskRule(allowRule, askRules, options)
    if (askResult.shadowed) {
      const shadowSource = formatSource(askResult.shadowedBy.source)
      unreachable.push({
        rule: allowRule,
        reason: `Shadowed by "${askResult.shadowedBy.ruleValue.toolName}" ask rule (from ${shadowSource})`,
        shadowedBy: askResult.shadowedBy,
        shadowType: 'ask',
        fix: generateFixSuggestion('ask', askResult.shadowedBy, allowRule),
      })
    }
  }

  return unreachable
}
