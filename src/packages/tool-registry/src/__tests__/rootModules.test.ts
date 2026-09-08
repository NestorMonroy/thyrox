/**
 * Tramo 2 del porte de `@thyrox/tool-registry` (#234) — los módulos de raíz
 * que la re-medición declara portables HOY, y la cadena que desbloquean.
 *
 * QUÉ MIDE ESTE ARCHIVO, y por qué son ocho módulos y no uno. El tramo 1
 * trajo el núcleo del registro (`contracts`, `errors`, `host`,
 * `ToolRegistry`, `api`, el proveedor de built-ins). Ese núcleo no se puede
 * usar todavía: `api.ts` existe pero nadie instala los host bindings que
 * `getToolRegistryHostBindings()` exige, así que la primera llamada real
 * lanza. La cadena que cierra ese hueco son tres módulos —`constants.ts`,
 * `toolRuntimeInstaller.ts` y `runtime.ts`— y ninguno tiene sentido solo.
 *
 * RE-MEDICIÓN DEL BLOQUEO, que es el paso que esta iniciativa ya aprendió a
 * no saltarse. La ficha de #234 declara «le faltan 11 de 19 deps». Medido
 * módulo a módulo sobre los imports de la fuente:
 *
 *   sin dependencia alguna .... constants, notebookTypes, peerAddress,
 *                               toolLimits
 *   sólo builtins de node ..... generatedFiles (path), words (crypto)
 *   sólo el SDK ............... toolSchemaCache
 *   sólo hermanos ya portados . toolRuntimeInstaller (./host),
 *                               runtime (./api ./constants ./contracts
 *                               ./host ./toolRuntimeInstaller)
 *
 * Nueve módulos sin un solo bloqueo real. Lo que la ficha contaba eran las
 * dependencias del PAQUETE —el `dependencies` del manifiesto— no las del
 * árbol de módulos, que es otro sujeto. Es el mismo defecto de significante
 * contra significado que ya apareció tres veces en esta iniciativa.
 *
 * MITAD ROJA: los casos fallan porque los ocho módulos no existen.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

describe('constants — los cuatro conjuntos que acotan qué herramienta ve un agente', () => {
  test('1. un agente NUNCA puede engendrar otro ni salir del plan por su cuenta', async () => {
    // Es la conducta, no la lista: los seis nombres son los verbos con que
    // un agente cambiaría la forma de la sesión que lo contiene. Que
    // `Task` esté aquí es lo que hace que la profundidad de anidamiento
    // sea 1 y no infinita.
    const { ALL_AGENT_DISALLOWED_TOOLS } = await import('../constants.ts')
    for (const nombre of ['Task', 'TaskStop', 'TaskOutput', 'EnterPlanMode', 'ExitPlanMode', 'AskUserQuestion']) {
      expect(ALL_AGENT_DISALLOWED_TOOLS.has(nombre)).toBe(true)
    }
    // Y no veta lo que un agente sí necesita para trabajar.
    expect(ALL_AGENT_DISALLOWED_TOOLS.has('Read')).toBe(false)
    expect(ALL_AGENT_DISALLOWED_TOOLS.has('Bash')).toBe(false)
  })

  test('2. el veto del agente a medida CONTIENE al veto general, no lo sustituye', async () => {
    // La relación importa más que el contenido: si un día se añade un veto
    // al conjunto general y el de agentes a medida no lo hereda, un agente
    // declarado en `.claude/agents/` tendría más poder que uno interno.
    const { ALL_AGENT_DISALLOWED_TOOLS, CUSTOM_AGENT_DISALLOWED_TOOLS } =
      await import('../constants.ts')
    for (const nombre of ALL_AGENT_DISALLOWED_TOOLS) {
      expect(CUSTOM_AGENT_DISALLOWED_TOOLS.has(nombre)).toBe(true)
    }
  })

  test('3. el agente asíncrono es una LISTA BLANCA — se declara lo que puede', async () => {
    // Los dos conjuntos anteriores son negros (se declara lo prohibido) y
    // éste es blanco (se declara lo permitido). La asimetría es el punto:
    // un agente que corre sin nadie mirando no puede heredar una
    // herramienta nueva por el mero hecho de que nadie la vetó.
    const { ASYNC_AGENT_ALLOWED_TOOLS } = await import('../constants.ts')
    expect(ASYNC_AGENT_ALLOWED_TOOLS.has('Read')).toBe(true)
    expect(ASYNC_AGENT_ALLOWED_TOOLS.has('Bash')).toBe(true)
    expect(ASYNC_AGENT_ALLOWED_TOOLS.has('Edit')).toBe(true)
    // Ninguno de los seis vetados entra por la puerta de atrás.
    const { ALL_AGENT_DISALLOWED_TOOLS } = await import('../constants.ts')
    for (const vetado of ALL_AGENT_DISALLOWED_TOOLS) {
      expect(ASYNC_AGENT_ALLOWED_TOOLS.has(vetado)).toBe(false)
    }
  })

  test('4. el coordinador reparte y no ejecuta', async () => {
    // Su lista blanca es de cuatro verbos, y los cuatro son de despacho o
    // de mensaje. Un coordinador con `Bash` dejaría de ser coordinador.
    const { COORDINATOR_MODE_ALLOWED_TOOLS } = await import('../constants.ts')
    expect(COORDINATOR_MODE_ALLOWED_TOOLS.has('Task')).toBe(true)
    expect(COORDINATOR_MODE_ALLOWED_TOOLS.has('SendMessage')).toBe(true)
    expect(COORDINATOR_MODE_ALLOWED_TOOLS.has('Bash')).toBe(false)
    expect(COORDINATOR_MODE_ALLOWED_TOOLS.has('Edit')).toBe(false)
  })
})

describe('peerAddress — el esquema decide el transporte', () => {
  test('5. las tres formas que la fuente distingue', async () => {
    const { parseAddress } = await import('../peerAddress.ts')
    expect(parseAddress('uds:/run/x.sock')).toEqual({ scheme: 'uds', target: '/run/x.sock' })
    expect(parseAddress('bridge:host-b')).toEqual({ scheme: 'bridge', target: 'host-b' })
    expect(parseAddress('main')).toEqual({ scheme: 'other', target: 'main' })
  })

  test('6. una ruta absoluta SIN prefijo es un socket, no un destino opaco', async () => {
    // Es la única regla que no se lee del literal: `/run/x.sock` no dice
    // «uds» en ninguna parte y aun así lo es. Sin esta rama, un destino
    // escrito como ruta caería en `other` y el mensaje no saldría.
    const { parseAddress } = await import('../peerAddress.ts')
    expect(parseAddress('/run/thyrox/peer.sock')).toEqual({
      scheme: 'uds', target: '/run/thyrox/peer.sock',
    })
  })
})

describe('toolLimits — el techo del sistema por encima de lo que cada herramienta declare', () => {
  test('7. los cinco valores de contrato', async () => {
    const m = await import('../toolLimits.ts')
    expect(m.DEFAULT_MAX_RESULT_SIZE_CHARS).toBe(50_000)
    expect(m.MAX_TOOL_RESULT_TOKENS).toBe(100_000)
    expect(m.BYTES_PER_TOKEN).toBe(4)
    expect(m.MAX_TOOL_RESULTS_PER_MESSAGE_CHARS).toBe(200_000)
    expect(m.TOOL_SUMMARY_MAX_LENGTH).toBe(50)
  })

  test('8. el tope en bytes se DERIVA, no se transcribe', async () => {
    // Si se escribiera a mano, subir el tope en tokens dejaría el de bytes
    // atrás sin que nada lo delatara — la forma exacta que
    // `calibration-verified-numbers` prohíbe para una cifra que vive en
    // código.
    const m = await import('../toolLimits.ts')
    expect(m.MAX_TOOL_RESULT_BYTES).toBe(m.MAX_TOOL_RESULT_TOKENS * m.BYTES_PER_TOKEN)
  })
})

describe('toolSchemaCache — la caché que fija los bytes del esquema por sesión', () => {
  test('9. es un singleton: dos lecturas devuelven el MISMO mapa', async () => {
    // Si devolviera una copia, escribir en ella no afectaría al render y la
    // caché sería un adorno: el esquema se re-renderizaría cada turno y
    // reventaría el bloque de ~11K tokens que vive en posición 2.
    const { getToolSchemaCache } = await import('../toolSchemaCache.ts')
    expect(getToolSchemaCache()).toBe(getToolSchemaCache())
  })

  test('10. se puede vaciar sin perder la identidad del mapa', async () => {
    // `auth.ts` lo vacía al cambiar de credencial. Si `clear` sustituyera
    // el mapa, quien guardara una referencia seguiría escribiendo en el
    // viejo — un fallo silencioso, no un error.
    const { getToolSchemaCache, clearToolSchemaCache } = await import('../toolSchemaCache.ts')
    const mapa = getToolSchemaCache()
    mapa.set('Bash', { name: 'Bash' } as never)
    expect(getToolSchemaCache().size).toBe(1)
    clearToolSchemaCache()
    expect(mapa.size).toBe(0)
    expect(getToolSchemaCache()).toBe(mapa)
  })
})

describe('generatedFiles — qué archivo NO cuenta como autoría', () => {
  test('11. los lockfiles por nombre exacto, sin importar la caja', async () => {
    const { isGeneratedFile } = await import('../generatedFiles.ts')
    expect(isGeneratedFile('bun.lock')).toBe(true)
    expect(isGeneratedFile('package-lock.json')).toBe(true)
    expect(isGeneratedFile('Cargo.lock')).toBe(true)
    expect(isGeneratedFile('src/index.ts')).toBe(false)
  })

  test('12. la extensión COMPUESTA — el caso que una sola extensión no ve', async () => {
    // `extname('app.min.js')` da `.js`, que no está vetado. Sin la rama de
    // extensión compuesta, un bundle minificado contaría como código
    // escrito a mano.
    const { isGeneratedFile } = await import('../generatedFiles.ts')
    expect(isGeneratedFile('static/app.min.js')).toBe(true)
    expect(isGeneratedFile('static/app.js')).toBe(false)
    expect(isGeneratedFile('types/api.d.ts')).toBe(true)
  })

  test('13. el directorio veta su contenido entero, y sólo como segmento', async () => {
    // `/dist/` con barras a los dos lados: un archivo llamado
    // `redistribute.ts` NO es generado, y un emparejamiento por subcadena
    // suelta diría que sí.
    const { isGeneratedFile } = await import('../generatedFiles.ts')
    expect(isGeneratedFile('pkg/dist/bundle.css')).toBe(true)
    expect(isGeneratedFile('node_modules/x/index.js')).toBe(true)
    expect(isGeneratedFile('src/redistribute.ts')).toBe(false)
  })

  test('14. la ruta se normaliza a POSIX antes de mirar el directorio', async () => {
    // La fuente parte por `sep` y vuelve a unir por `posix.sep`. Sin eso,
    // en Windows `pkg\\dist\\x.js` nunca contendría `/dist/` y el veto
    // sería inerte en la mitad de las plataformas — inerte EN SILENCIO,
    // que es peor que roto.
    const { isGeneratedFile } = await import('../generatedFiles.ts')
    expect(isGeneratedFile('pkg/dist/x.js')).toBe(true)
    // Y una ruta que ya empieza por barra no gana una segunda.
    expect(isGeneratedFile('/vendor/lib.js')).toBe(true)
  })

  test('15. los patrones de generador por nombre', async () => {
    const { isGeneratedFile } = await import('../generatedFiles.ts')
    expect(isGeneratedFile('api.pb.go')).toBe(true)
    expect(isGeneratedFile('schema_pb2.py')).toBe(true)
    expect(isGeneratedFile('client.swagger.ts')).toBe(true)
    expect(isGeneratedFile('model.gen.ts')).toBe(true)
    expect(isGeneratedFile('model.ts')).toBe(false)
  })

  test('16. el filtro conserva el orden y sólo quita lo generado', async () => {
    const { filterGeneratedFiles } = await import('../generatedFiles.ts')
    expect(filterGeneratedFiles(['a.ts', 'bun.lock', 'b.ts', 'dist/c.js'])).toEqual(['a.ts', 'b.ts'])
  })
})

describe('toolRuntimeInstaller — el respaldo que hace usable al registro sin host', () => {
  beforeEach(async () => {
    const { __resetToolRuntimeInstallerForTests } = await import('../toolRuntimeInstaller.ts')
    __resetToolRuntimeInstallerForTests()
  })

  test('17. sin bindings previos INSTALA el respaldo, y el registro deja de lanzar', async () => {
    // Es la razón de existir del módulo: `getToolRegistryHostBindings()`
    // lanza a propósito (fail-closed), así que sin este instalador el
    // núcleo del tramo 1 es inarrancable fuera de un host completo.
    const { ensureToolRegistryRuntimeInstalled } = await import('../toolRuntimeInstaller.ts')
    const { getToolRegistryHostBindings } = await import('../host.ts')
    ensureToolRegistryRuntimeInstalled()
    const b = getToolRegistryHostBindings()
    expect(b.discoverBuiltInTools().length).toBeGreaterThan(0)
    expect(b.replOnlyToolNames().size).toBe(0)
  })

  test('18. NO pisa unos bindings ya instalados', async () => {
    // El respaldo es para cuando no hay host. Si sobreescribiera al host
    // real, un arranque en el orden equivocado degradaría la sesión entera
    // a cuatro herramientas de mentira, y en silencio.
    const { installToolRegistryHostBindings, getToolRegistryHostBindings } = await import('../host.ts')
    const propio = {
      discoverBuiltInTools: () => [{ name: 'Mio', isEnabled: () => true }],
      getDenyRuleForTool: () => null,
      replOnlyToolNames: () => new Set<string>(),
    }
    installToolRegistryHostBindings(propio as never)
    const { ensureToolRegistryRuntimeInstalled } = await import('../toolRuntimeInstaller.ts')
    ensureToolRegistryRuntimeInstalled()
    expect(getToolRegistryHostBindings().discoverBuiltInTools()[0]?.name).toBe('Mio')
  })

  test('19. la regla de denegación del respaldo lee las TRES fuentes de settings', async () => {
    // Local, proyecto y usuario. Leer sólo una haría que una denegación
    // escrita en las otras dos no tuviera efecto — y un filtro que deja
    // pasar es exactamente el fallo que no se nota hasta que importa.
    const { ensureToolRegistryRuntimeInstalled } = await import('../toolRuntimeInstaller.ts')
    const { getToolRegistryHostBindings } = await import('../host.ts')
    ensureToolRegistryRuntimeInstalled()
    const { getDenyRuleForTool } = getToolRegistryHostBindings()
    for (const fuente of ['localSettings', 'projectSettings', 'userSettings']) {
      const ctx = { alwaysDenyRules: { [fuente]: ['Bash'] } }
      expect(getDenyRuleForTool(ctx as never, { name: 'Bash' })).toBe('Bash')
    }
    expect(getDenyRuleForTool({ alwaysDenyRules: {} } as never, { name: 'Bash' })).toBeNull()
  })

  test('20. una herramienta MCP se deniega por su nombre CALIFICADO', async () => {
    // Su `name` es corto y su identidad real es `mcp__<servidor>__<tool>`.
    // Denegar por el nombre corto dejaría fuera a dos servidores que
    // exponen la misma herramienta, o a ninguno.
    const { ensureToolRegistryRuntimeInstalled } = await import('../toolRuntimeInstaller.ts')
    const { getToolRegistryHostBindings } = await import('../host.ts')
    ensureToolRegistryRuntimeInstalled()
    const { getDenyRuleForTool } = getToolRegistryHostBindings()
    const ctx = { alwaysDenyRules: { userSettings: ['mcp__github__search_code'] } }
    const t = { name: 'search_code', mcpInfo: { serverName: 'github', toolName: 'search_code' } }
    expect(getDenyRuleForTool(ctx as never, t as never)).toBe('mcp__github__search_code')
  })

  test('21. una fuente que NO es arreglo no rompe la lectura', async () => {
    // Los settings vienen de JSON de usuario. Un `alwaysDenyRules` mal
    // escrito no puede tumbar la enumeración de herramientas entera.
    const { ensureToolRegistryRuntimeInstalled } = await import('../toolRuntimeInstaller.ts')
    const { getToolRegistryHostBindings } = await import('../host.ts')
    ensureToolRegistryRuntimeInstalled()
    const { getDenyRuleForTool } = getToolRegistryHostBindings()
    const ctx = { alwaysDenyRules: { userSettings: 'Bash', localSettings: ['Bash'] } }
    expect(getDenyRuleForTool(ctx as never, { name: 'Bash' })).toBe('Bash')
  })
})

describe('runtime — la puerta pública, y el conjunto que se puebla al mirarlo', () => {
  beforeEach(async () => {
    const { __resetToolRuntimeInstallerForTests } = await import('../toolRuntimeInstaller.ts')
    const { __resetToolRegistryForTests } = await import('../api.ts')
    __resetToolRuntimeInstallerForTests()
    __resetToolRegistryForTests()
  })

  test('22. cada puerta instala el respaldo antes de responder', async () => {
    // Sin esto, el primer llamador tendría que acordarse de instalarlo, y
    // el que se olvidara recibiría el error de host ausente en vez de una
    // respuesta. El módulo existe para que ese olvido no sea posible.
    const rt = await import('../runtime.ts')
    const { hasToolRegistryHostBindings } = await import('../host.ts')
    expect(hasToolRegistryHostBindings()).toBe(false)
    expect(rt.getAllBaseTools().length).toBeGreaterThan(0)
    expect(hasToolRegistryHostBindings()).toBe(true)
  })

  test('23. REPL_ONLY_TOOLS se puebla al PRIMER acceso, no al importar', async () => {
    // Es la conducta que el proxy compra: el conjunto se exporta como
    // valor —hay llamadores que lo capturan al importar— pero su contenido
    // sale de un host que quizá aún no existe. Poblarlo al importar
    // obligaría a que el orden de import decidiera el resultado.
    const { hasToolRegistryHostBindings, installToolRegistryHostBindings } = await import('../host.ts')
    installToolRegistryHostBindings({
      discoverBuiltInTools: () => [],
      getDenyRuleForTool: () => null,
      replOnlyToolNames: () => new Set(['Repl']),
    } as never)
    const rt = await import('../runtime.ts')
    expect(hasToolRegistryHostBindings()).toBe(true)
    expect(rt.REPL_ONLY_TOOLS.has('Repl')).toBe(true)
    expect(rt.REPL_ONLY_TOOLS.size).toBe(1)
  })

  test('24. reexporta los cuatro conjuntos de constants, sin copiarlos', async () => {
    // Un llamador de `runtime` no tiene por qué saber que existe
    // `constants.ts`. Pero si `runtime` los REDECLARARA, habría dos
    // fuentes de verdad y sólo una se actualizaría.
    const rt = await import('../runtime.ts')
    const c = await import('../constants.ts')
    expect(rt.ALL_AGENT_DISALLOWED_TOOLS).toBe(c.ALL_AGENT_DISALLOWED_TOOLS)
    expect(rt.CUSTOM_AGENT_DISALLOWED_TOOLS).toBe(c.CUSTOM_AGENT_DISALLOWED_TOOLS)
    expect(rt.ASYNC_AGENT_ALLOWED_TOOLS).toBe(c.ASYNC_AGENT_ALLOWED_TOOLS)
    expect(rt.COORDINATOR_MODE_ALLOWED_TOOLS).toBe(c.COORDINATOR_MODE_ALLOWED_TOOLS)
  })

  test('25. el preajuste se analiza y lo desconocido devuelve null, no lanza', async () => {
    const rt = await import('../runtime.ts')
    expect(rt.parseToolPreset('default')).toBe('default')
    expect(rt.parseToolPreset('lo-que-nadie-declaro')).toBeNull()
  })

  test('26. el filtro de denegación pasa por el host instalado', async () => {
    const rt = await import('../runtime.ts')
    const tools = [{ name: 'Bash', isEnabled: () => true }, { name: 'Read', isEnabled: () => true }]
    const ctx = { alwaysDenyRules: { userSettings: ['Bash'] } }
    const vivas = rt.filterToolsByDenyRules(tools as never, ctx as never)
    expect(vivas.map(t => t.name)).toEqual(['Read'])
  })
})
