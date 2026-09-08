/**
 * Puerto de `ccnmt: packages/tool-registry/src/toolRuntimeInstaller.ts`
 * (79 líneas, 1 símbolo). El respaldo que hace usable al registro cuando
 * nadie instaló un host.
 *
 * POR QUÉ EXISTE. `getToolRegistryHostBindings()` lanza a propósito —es
 * fail-closed: devolver un objeto vacío haría que el filtro de denegación
 * dejara pasar todo—. La consecuencia es que el núcleo del registro es
 * inarrancable fuera de un host completo, y hay tres sitios que lo
 * necesitan antes de que ese host exista: la enumeración de herramientas al
 * arrancar, las pruebas, y cualquier consumidor que sólo quiera preguntar
 * qué herramientas hay.
 *
 * QUÉ RESPALDA, y qué NO. Repone las cuatro funciones con una conducta
 * mínima pero REAL —la denegación se lee de verdad de las tres fuentes de
 * settings, no se responde `null` a todo—, porque un respaldo que dejara
 * pasar todo sería peor que el error: el error se nota.
 *
 * NO PISA UN HOST YA INSTALADO. Si lo hiciera, un arranque en el orden
 * equivocado degradaría la sesión entera a cuatro herramientas de mentira,
 * y en silencio.
 *
 * Los puentes de tipo son del patrón de binding en runtime —el contexto de
 * permiso es una superficie estructural declarada en dos paquetes—, no
 * desajustes escondidos.
 */
import {
  __resetToolRegistryHostBindingsForTests,
  hasToolRegistryHostBindings,
  installToolRegistryHostBindings,
} from './host.ts'
import type { ToolLike, ToolPermissionContextLike } from './contracts.ts'

let toolRegistryRuntimeInstalled = false

/**
 * Las cuatro de respaldo: nombre, esquema vacío, siempre habilitadas, y una
 * llamada que no hace nada. Bastan para que la enumeración responda y para
 * que el registro tenga qué indexar.
 */
const FALLBACK_BUILT_IN_TOOLS = [
  { name: 'Agent', description: 'Fallback Agent tool' },
  { name: 'Bash', description: 'Fallback Bash tool' },
  { name: 'Read', description: 'Fallback Read tool' },
  { name: 'Edit', description: 'Fallback Edit tool' },
].map(tool => ({
  ...tool,
  inputSchema: { type: 'object', properties: {} },
  call: async () => ({}),
  isEnabled: () => true,
}))

/** Las tres fuentes de settings, en el orden en que la fuente las lee. */
const DENY_RULE_SOURCES = [
  'localSettings',
  'projectSettings',
  'userSettings',
] as const

function collectDenyRules(permissionContext: ToolPermissionContextLike): string[] {
  const alwaysDenyRules = (permissionContext as { alwaysDenyRules?: Record<string, unknown> })
    ?.alwaysDenyRules
  const rules: string[] = []
  for (const source of DENY_RULE_SOURCES) {
    const value = alwaysDenyRules?.[source]
    // Los settings vienen de JSON de usuario: una fuente mal escrita no
    // puede tumbar la enumeración de herramientas entera.
    if (Array.isArray(value)) rules.push(...(value as string[]))
  }
  return rules
}

export function ensureToolRegistryRuntimeInstalled(): void {
  if (toolRegistryRuntimeInstalled || hasToolRegistryHostBindings()) {
    toolRegistryRuntimeInstalled = true
    return
  }

  installToolRegistryHostBindings({
    discoverBuiltInTools: () => FALLBACK_BUILT_IN_TOOLS as unknown as readonly ToolLike[],
    getDenyRuleForTool: (permissionContext, tool) => {
      const denyRules = collectDenyRules(permissionContext)
      if (denyRules.includes(tool.name)) return tool.name
      // Una herramienta MCP se deniega por su nombre CALIFICADO: su `name`
      // es corto y su identidad real es `mcp__<servidor>__<tool>`. Denegar
      // por el corto alcanzaría a dos servidores distintos, o a ninguno.
      if (tool.mcpInfo) {
        const qualified = `mcp__${tool.mcpInfo.serverName}__${tool.mcpInfo.toolName}`
        if (denyRules.includes(qualified)) return qualified
      }
      return null
    },
    getModeAwareTools: ({ permissionContext, baseTools, filterToolsByDenyRules }) =>
      filterToolsByDenyRules(baseTools, permissionContext),
    replOnlyToolNames: () => new Set(),
  })
  toolRegistryRuntimeInstalled = true
}

/**
 * DIVERGENCIA DECLARADA: la fuente no trae reset. Retira la bandera Y los
 * bindings, porque las dos juntas son el estado — dejar los bindings puestos
 * haría que el reset no reseteara nada y el control quedara en verde sin
 * medir (`metrica-decide-la-conclusion.md`, sub-patrón D).
 */
export function __resetToolRuntimeInstallerForTests(): void {
  toolRegistryRuntimeInstalled = false
  __resetToolRegistryHostBindingsForTests()
}
