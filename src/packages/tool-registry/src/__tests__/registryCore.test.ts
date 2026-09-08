/**
 * El núcleo del registro de herramientas — `contracts` · `errors` · `host` ·
 * `ToolRegistry` · `api` · `providers/BuiltInToolsProvider` (#234, tramo 1).
 *
 * POR QUÉ ESTE TRAMO Y POR QUÉ AHORA. La tarea declaraba «le faltan 11 de 19
 * deps», y eso es falso: medido hoy contra el árbol, **18 de las 19** hermanas
 * que la fuente importa existen en `src/packages/`. La única ausente es
 * `repl`, que la fuente toca en **13** de sus 313 módulos — no es un muro de
 * once paquetes, es un módulo por delante en la lista (#235).
 *
 * Y el rojo que el paquete traía tampoco era una ausencia de código:
 * `@thyrox/local-observability/slowOperations.js` sí existe y su mapa de
 * exports lo declara; lo que faltaba eran los **enlaces de workspace** en
 * `node_modules/@thyrox/`. Con los 18 enlazados, la suite pasa de
 * «90 pass, 1 error» a «101 pass, 0 fail» sin tocar una línea de producto.
 *
 * QUÉ MIDE ESTE TRAMO. El registro es un índice con DOS claves —el nombre y
 * cada alias— y una política de filtrado que delega en el host. Los casos
 * atacan lo que un índice de una sola clave, o un filtro que no consulta,
 * pasarían igual: la resolución por alias, la retirada que limpia el alias
 * sin tocar el de otra herramienta, y el filtro que de verdad pregunta.
 *
 * MITAD ROJA: fallan porque ninguno de los seis módulos existe aquí.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { ToolRegistry } from '../ToolRegistry.ts'
import {
  __resetToolRegistryForTests,
  assembleToolPool,
  findToolByName,
  getAllBaseTools,
  getToolRegistry,
  getTools,
  getToolsForDefaultPreset,
  parseToolPreset,
  toolMatchesName,
} from '../api.ts'
import { installToolRegistryHostBindings, hasToolRegistryHostBindings } from '../host.ts'
import { HostBindingsError, NotFoundError, ToolBaseError } from '../errors.ts'
import type { ToolLike } from '../contracts.ts'

const util = (name: string, extra: Partial<ToolLike> = {}): ToolLike => ({
  name,
  isEnabled: () => true,
  ...extra,
})

describe('el núcleo del registro de herramientas', () => {
  beforeEach(() => {
    __resetToolRegistryForTests()
    installToolRegistryHostBindings({
      discoverBuiltInTools: () => [],
      getDenyRuleForTool: () => undefined,
      replOnlyToolNames: () => new Set<string>(),
    })
  })

  test('1. resuelve por nombre Y por alias — la segunda clave del índice', () => {
    const r = new ToolRegistry()
    r.register(util('Echo', { aliases: ['Repetir', 'Eco'] }), 'builtin', 'p')
    expect(r.get('Echo')?.name).toBe('Echo')
    expect(r.get('Repetir')?.name).toBe('Echo')
    expect(r.get('Eco')?.name).toBe('Echo')
    expect(r.get('NoExiste')).toBeUndefined()
    expect(r.has('Eco')).toBe(true)
  })

  test('2. retirar limpia SUS alias y no toca los de otra herramienta', () => {
    // El control que separa «se borró la entrada» de «se borró el índice
    // entero»: un `unregister` que vaciara el mapa de alias dejaría a la
    // segunda herramienta sin sus propias claves.
    const r = new ToolRegistry()
    r.register(util('A', { aliases: ['a1'] }), 'builtin', 'p')
    r.register(util('B', { aliases: ['b1'] }), 'builtin', 'p')
    expect(r.unregister('A')).toBe(true)
    expect(r.get('a1')).toBeUndefined()
    expect(r.get('b1')?.name).toBe('B')
    expect(r.unregister('A')).toBe(false)
    expect(r.size).toBe(1)
  })

  test('3. el filtro de reglas de denegación PREGUNTA al host', () => {
    // Un filtro que devolviera la lista intacta pasaría cualquier test que
    // sólo contara elementos. Se afirma sobre lo que el host RECIBIÓ.
    const preguntado: string[] = []
    installToolRegistryHostBindings({
      discoverBuiltInTools: () => [],
      getDenyRuleForTool: (_ctx, tool) => {
        preguntado.push(tool.name)
        return tool.name === 'Prohibida' ? { deny: true } : undefined
      },
      replOnlyToolNames: () => new Set<string>(),
    })
    const r = new ToolRegistry()
    const quedan = r.filterByDenyRules(
      [util('Buena'), util('Prohibida')],
      { mode: 'default' },
    )
    expect(preguntado).toEqual(['Buena', 'Prohibida'])
    expect(quedan.map(t => t.name)).toEqual(['Buena'])
  })

  test('4. getEnabledTools cruza la denegación con isEnabled', () => {
    // Dos filtros distintos, y hace falta que actúen los dos: una
    // herramienta deshabilitada NO se cuela aunque el host la permita.
    const r = new ToolRegistry()
    r.register(util('Viva'), 'builtin', 'p')
    r.register(util('Apagada', { isEnabled: () => false }), 'builtin', 'p')
    expect(r.getEnabledTools({ mode: 'default' }).map(t => t.name)).toEqual(['Viva'])
  })

  test('5. assemblePool ordena, concatena y deduplica por nombre', () => {
    const r = new ToolRegistry()
    r.register(util('Zeta'), 'builtin', 'p')
    r.register(util('Alfa'), 'builtin', 'p')
    // El MCP repite `Alfa`: la deduplicación conserva la primera, que es la
    // integrada — si conservara la última, un servidor MCP podría suplantar
    // una herramienta del producto con sólo llamarla igual.
    const pool = r.assemblePool({ mode: 'default' }, [util('Alfa'), util('Mcp')])
    expect(pool.map(t => t.name)).toEqual(['Alfa', 'Zeta', 'Mcp'])
  })

  test('6. registerProvider descubre y registra lo que el proveedor da', async () => {
    const r = new ToolRegistry()
    await r.registerProvider({
      name: 'prov',
      discover: async () => [util('Descubierta')],
    })
    expect(r.get('Descubierta')?.name).toBe('Descubierta')
    expect(r.getRegistration('Descubierta')?.providerName).toBe('prov')
  })

  test('7. los eventos de alta y baja se emiten con su carga', () => {
    const altas: string[] = []
    const bajas: string[] = []
    const r = new ToolRegistry({
      onRegister: reg => altas.push(`${reg.tool.name}:${reg.category}`),
      onUnregister: n => bajas.push(n),
    })
    r.register(util('X'), 'mcp', 'p')
    r.unregister('X')
    expect(altas).toEqual(['X:mcp'])
    expect(bajas).toEqual(['X'])
  })

  test('8. el host sin instalar LANZA, no devuelve un registro vacío', () => {
    // La conducta que discrimina: devolver `{}` en silencio haría que el
    // filtro dejara pasar todo, que es lo contrario de fail-closed.
    installToolRegistryHostBindings(undefined as never)
    expect(hasToolRegistryHostBindings()).toBe(false)
    expect(() => new ToolRegistry().filterByDenyRules([util('X')], {})).toThrow(
      HostBindingsError,
    )
  })

  test('9. los errores del paquete llevan su código, no sólo su nombre', () => {
    const e = new NotFoundError('no está')
    expect(e).toBeInstanceOf(ToolBaseError)
    expect(e.code).toBe('TOOL_NOT_FOUND')
    expect(e.name).toBe('ToolNotFoundError')
  })

  test('10. la API pública lee del singleton que el proveedor pobló', () => {
    installToolRegistryHostBindings({
      discoverBuiltInTools: () => [util('Integrada'), util('Apagada', { isEnabled: () => false })],
      getDenyRuleForTool: () => undefined,
      replOnlyToolNames: () => new Set<string>(),
    })
    __resetToolRegistryForTests()
    expect(getAllBaseTools().map(t => t.name)).toEqual(['Integrada', 'Apagada'])
    // El preset default filtra por `isEnabled`; `getAllBaseTools` no.
    expect(getToolsForDefaultPreset()).toEqual(['Integrada'])
    expect(getTools({ mode: 'default' }).map(t => t.name)).toEqual(['Integrada'])
    expect(getToolRegistry().size).toBe(2)
  })

  test('11. getModeAwareTools, si el host lo trae, GANA sobre el camino base', () => {
    // Es el gancho por el que el modo de permiso cambia el juego de
    // herramientas. Sin esta rama, el modo no tendría efecto y el defecto
    // sería invisible: la lista base también es una lista válida.
    let recibio = false
    installToolRegistryHostBindings({
      discoverBuiltInTools: () => [util('Base')],
      getDenyRuleForTool: () => undefined,
      getModeAwareTools: ({ baseTools }) => {
        recibio = baseTools.length === 1
        return [util('SoloEnEsteModo')]
      },
      replOnlyToolNames: () => new Set<string>(),
    })
    __resetToolRegistryForTests()
    expect(getTools({ mode: 'plan' }).map(t => t.name)).toEqual(['SoloEnEsteModo'])
    expect(recibio).toBe(true)
  })

  test('12. parseToolPreset normaliza y rechaza lo que no declara', () => {
    expect(parseToolPreset('DEFAULT')).toBe('default')
    expect(parseToolPreset('inventado')).toBeNull()
  })

  test('13. findToolByName y toolMatchesName comparten criterio', () => {
    const tools = [util('A', { aliases: ['a1'] }), util('B')]
    expect(findToolByName(tools, 'a1')?.name).toBe('A')
    expect(toolMatchesName(tools[0]!, 'a1')).toBe(true)
    expect(toolMatchesName(tools[1]!, 'a1')).toBe(false)
  })

  test('14. assembleToolPool de la API respeta el modo y deduplica', () => {
    installToolRegistryHostBindings({
      discoverBuiltInTools: () => [util('Beta'), util('Alfa')],
      getDenyRuleForTool: () => undefined,
      replOnlyToolNames: () => new Set<string>(),
    })
    __resetToolRegistryForTests()
    const pool = assembleToolPool({ mode: 'default' }, [util('Alfa'), util('Zeta')])
    expect(pool.map(t => t.name)).toEqual(['Alfa', 'Beta', 'Zeta'])
  })
})
