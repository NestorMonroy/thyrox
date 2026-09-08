/**
 * La mitad ROJA del porte de `claudeCodeHints`.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/claudeCodeHints.ts`
 * (195 líneas, 9 símbolos exportados). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se reimplementa y no se copia.
 *
 * Métrica: el parseador con entradas construidas a mano, y el almacén de una
 * sola ranura con su bandera de sesión.
 * Ciega a: si algún CLI real emite la etiqueta —eso es contrato con terceros,
 * no del módulo—, y al consumidor de React que se suscribe a la señal.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

describe('extractClaudeCodeHints — el parseador y lo que descarta', () => {
  test('1. una etiqueta en su propia línea se lee y se RETIRA de la salida', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    const { hints, stripped } = extractClaudeCodeHints(
      'antes\n<thyrox-hint v="1" type="plugin" value="x@market" />\ndespués',
      'mi-cli --flag',
    )
    expect(hints).toHaveLength(1)
    expect(hints[0]).toEqual({
      v: 1,
      type: 'plugin',
      value: 'x@market',
      sourceCommand: 'mi-cli',
    })
    // La etiqueta es un canal lateral del harness: el modelo no la ve.
    expect(stripped).not.toContain('thyrox-hint')
  })

  test('2. sin etiqueta, la salida vuelve INTACTA y sin asignar nada', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    const entrada = 'una salida cualquiera\ncon dos líneas'
    const { hints, stripped } = extractClaudeCodeHints(entrada, 'ls')
    expect(hints).toEqual([])
    // La misma referencia: el camino rápido no reconstruye la cadena.
    expect(stripped).toBe(entrada)
  })

  test('3. una etiqueta ENTERRADA en una línea mayor se ignora', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    // Un log que cite la etiqueta no es una emisión: sin este anclaje, el
    // registro de otro programa podría instalar un plugin.
    const { hints, stripped } = extractClaudeCodeHints(
      'log: emití <thyrox-hint v="1" type="plugin" value="x@m" /> ayer',
      'cli',
    )
    expect(hints).toEqual([])
    expect(stripped).toContain('thyrox-hint')
  })

  test('4. el espacio en blanco al principio y al final SÍ se tolera', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    const { hints } = extractClaudeCodeHints(
      '  \t<thyrox-hint v="1" type="plugin" value="x@m" />\t  ',
      'cli',
    )
    expect(hints).toHaveLength(1)
  })

  test('5. una versión NO soportada se descarta, y la línea igual se retira', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    const { hints, stripped } = extractClaudeCodeHints(
      '<thyrox-hint v="99" type="plugin" value="x@m" />',
      'cli',
    )
    expect(hints).toEqual([])
    expect(stripped).not.toContain('thyrox-hint')
  })

  test('6. un tipo NO soportado se descarta', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    const { hints } = extractClaudeCodeHints(
      '<thyrox-hint v="1" type="desconocido" value="x@m" />',
      'cli',
    )
    expect(hints).toEqual([])
  })

  test('7. un valor VACÍO o ausente se descarta', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    expect(
      extractClaudeCodeHints('<thyrox-hint v="1" type="plugin" value="" />', 'c')
        .hints,
    ).toEqual([])
    expect(
      extractClaudeCodeHints('<thyrox-hint v="1" type="plugin" />', 'c').hints,
    ).toEqual([])
  })

  test('8. varias etiquetas dan varias sugerencias', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    const { hints } = extractClaudeCodeHints(
      [
        '<thyrox-hint v="1" type="plugin" value="a@m" />',
        '<thyrox-hint v="1" type="plugin" value="b@m" />',
      ].join('\n'),
      'cli',
    )
    expect(hints.map(h => h.value)).toEqual(['a@m', 'b@m'])
  })

  test('9. las líneas en blanco que deja el retiro se colapsan', async () => {
    const { extractClaudeCodeHints } = await import('../claudeCodeHints.ts')
    const { stripped } = extractClaudeCodeHints(
      'a\n<thyrox-hint v="1" type="plugin" value="x@m" />\n<thyrox-hint v="1" type="plugin" value="y@m" />\nb',
      'cli',
    )
    // Sin el colapso, la salida que ve el modelo crece en blanco vertical.
    expect(stripped).not.toMatch(/\n{3,}/)
  })
})

describe('los atributos, y el primer token del comando', () => {
  test('10. `parseAttrs` acepta la forma con comillas y la desnuda', async () => {
    const { _test } = await import('../claudeCodeHints.ts')
    expect(_test.parseAttrs('v="1" type=plugin value="a@m"')).toEqual({
      v: '1',
      type: 'plugin',
      value: 'a@m',
    })
  })

  test('11. la forma desnuda termina en espacio o en el cierre', async () => {
    const { _test } = await import('../claudeCodeHints.ts')
    // Sin excluir `/` y `>`, el cierre `/>` se pegaría al valor.
    expect(_test.parseAttrs('value=a@m/>')).toEqual({ value: 'a@m' })
  })

  test('12. `firstCommandToken` toma sólo el primer token', async () => {
    const { _test } = await import('../claudeCodeHints.ts')
    expect(_test.firstCommandToken('  npm  install  x ')).toBe('npm')
    expect(_test.firstCommandToken('ls')).toBe('ls')
    expect(_test.firstCommandToken('')).toBe('')
  })
})

describe('el almacén de una sola ranura', () => {
  beforeEach(async () => {
    const { _resetClaudeCodeHintStore } = await import('../claudeCodeHints.ts')
    _resetClaudeCodeHintStore()
  })

  test('13. la escritura gana sobre lo que ya hubiera', async () => {
    const mod = await import('../claudeCodeHints.ts')
    const uno = { v: 1, type: 'plugin' as const, value: 'a@m', sourceCommand: 'c' }
    const dos = { v: 1, type: 'plugin' as const, value: 'b@m', sourceCommand: 'c' }
    mod.setPendingHint(uno)
    mod.setPendingHint(dos)
    // Una ranura, no una cola: un CLI que emita en cada invocación se
    // acumularía sin fin, y el diálogo se muestra una vez por sesión.
    expect(mod.getPendingHintSnapshot()).toEqual(dos)
  })

  test('14. tras marcar la sesión, escribir es un NO-OP', async () => {
    const mod = await import('../claudeCodeHints.ts')
    mod.markShownThisSession()
    mod.setPendingHint({
      v: 1,
      type: 'plugin',
      value: 'a@m',
      sourceCommand: 'c',
    })
    expect(mod.getPendingHintSnapshot()).toBeNull()
    expect(mod.hasShownHintThisSession()).toBe(true)
  })

  test('15. limpiar NO levanta la bandera de sesión', async () => {
    const mod = await import('../claudeCodeHints.ts')
    mod.setPendingHint({
      v: 1,
      type: 'plugin',
      value: 'a@m',
      sourceCommand: 'c',
    })
    mod.clearPendingHint()
    expect(mod.getPendingHintSnapshot()).toBeNull()
    // Un rechazo no consume la única oportunidad de la sesión.
    expect(mod.hasShownHintThisSession()).toBe(false)
  })

  test('16. la señal avisa al escribir y al limpiar, no al limpiar en vacío', async () => {
    const mod = await import('../claudeCodeHints.ts')
    let avisos = 0
    const desuscribir = mod.subscribeToPendingHint(() => {
      avisos++
    })
    mod.clearPendingHint() // ranura vacía: no hay cambio que anunciar
    expect(avisos).toBe(0)
    mod.setPendingHint({
      v: 1,
      type: 'plugin',
      value: 'a@m',
      sourceCommand: 'c',
    })
    expect(avisos).toBe(1)
    mod.clearPendingHint()
    expect(avisos).toBe(2)
    desuscribir()
  })
})
