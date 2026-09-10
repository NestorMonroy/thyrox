/**
 * Porte fiel de `ccnmt: packages/permission/src/permissionRuleParser.ts`
 * (paquete `permission`, licencia UNLICENSED — reimplementación, no copia).
 * Porte COMPLETO: las seis funciones exportadas de la fuente —
 * `normalizeLegacyToolName`, `getLegacyToolNames`, `escapeRuleContent`,
 * `unescapeRuleContent`, `permissionRuleValueFromString` y
 * `permissionRuleValueToString` — están todas presentes, con el mismo
 * algoritmo de escape/parseo carácter por carácter.
 *
 * Divergencia medida y documentada: la fuente usa `feature('KAIROS')` /
 * `feature('KAIROS_BRIEF')` de `bun:bundle` para decidir si
 * `BRIEF_TOOL_NAME` vale `'SendUserMessage'`. `bun:bundle` NO resuelve en
 * este runtime — `import('bun:bundle')` falla con "Cannot find package
 * 'bundle'" (medido con `bun -e`, este Bun es 1.3.11 y ese módulo es un
 * macro de build propio de ccnmt, no parte de la stdlib de Bun). Se
 * sustituye por la constante `KAIROS_ENABLED = false` (la feature
 * apagada), documentada aquí — nadie en este árbol depende todavía de que
 * `Task(Brief)` se reescriba a `SendUserMessage`.
 *
 * `PermissionRuleValue` se importa de `./permissionTypes.js` (el
 * subconjunto local, hermano de este archivo) en vez de `./PermissionRule.js`
 * de la fuente: ese archivo no se portó (envuelve el mismo tipo con un
 * schema Zod que nada de este puerto consume).
 */
import type { PermissionRuleValue } from './permissionTypes.js'

const AGENT_TOOL_NAME = 'Agent'
const TASK_OUTPUT_TOOL_NAME = 'TaskOutput'
const TASK_STOP_TOOL_NAME = 'TaskStop'
const KAIROS_ENABLED = false
const BRIEF_TOOL_NAME: string | null = KAIROS_ENABLED ? 'SendUserMessage' : null

const LEGACY_TOOL_NAME_ALIASES: Record<string, string> = {
  Task: AGENT_TOOL_NAME,
  KillShell: TASK_STOP_TOOL_NAME,
  AgentOutputTool: TASK_OUTPUT_TOOL_NAME,
  BashOutputTool: TASK_OUTPUT_TOOL_NAME,
  ...(KAIROS_ENABLED && BRIEF_TOOL_NAME ? { Brief: BRIEF_TOOL_NAME } : {}),
}

export function normalizeLegacyToolName(name: string): string {
  return LEGACY_TOOL_NAME_ALIASES[name] ?? name
}

export function getLegacyToolNames(canonicalName: string): string[] {
  const result: string[] = []
  for (const [legacy, canonical] of Object.entries(LEGACY_TOOL_NAME_ALIASES)) {
    if (canonical === canonicalName) result.push(legacy)
  }
  return result
}

export function escapeRuleContent(content: string): string {
  return content.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function unescapeRuleContent(content: string): string {
  return content.replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
}

function findFirstUnescapedChar(str: string, char: string): number {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && str[j] === '\\') {
        backslashCount++
        j--
      }
      if (backslashCount % 2 === 0) return i
    }
  }
  return -1
}

function findLastUnescapedChar(str: string, char: string): number {
  for (let i = str.length - 1; i >= 0; i--) {
    if (str[i] === char) {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && str[j] === '\\') {
        backslashCount++
        j--
      }
      if (backslashCount % 2 === 0) return i
    }
  }
  return -1
}

export function permissionRuleValueFromString(ruleString: string): PermissionRuleValue {
  const openParenIndex = findFirstUnescapedChar(ruleString, '(')
  if (openParenIndex === -1) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }

  const closeParenIndex = findLastUnescapedChar(ruleString, ')')
  if (closeParenIndex === -1 || closeParenIndex <= openParenIndex) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }
  if (closeParenIndex !== ruleString.length - 1) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }

  const toolName = ruleString.substring(0, openParenIndex)
  const rawContent = ruleString.substring(openParenIndex + 1, closeParenIndex)

  if (!toolName) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }
  if (rawContent === '' || rawContent === '*') {
    return { toolName: normalizeLegacyToolName(toolName) }
  }

  const ruleContent = unescapeRuleContent(rawContent)
  return { toolName: normalizeLegacyToolName(toolName), ruleContent }
}

export function permissionRuleValueToString(ruleValue: PermissionRuleValue): string {
  if (!ruleValue.ruleContent) {
    return ruleValue.toolName
  }
  const escapedContent = escapeRuleContent(ruleValue.ruleContent)
  return `${ruleValue.toolName}(${escapedContent})`
}
