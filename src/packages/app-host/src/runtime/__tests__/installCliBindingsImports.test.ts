import { describe, expect, test } from 'bun:test'

/**
 * `installCliBindings` cablea tres bindings headless del host CLI
 * (`createHeadlessStore`, `runHeadless`, `getStructuredIO`) importando cada
 * submódulo de `@thyrox/cli` por su ruta propia, nunca por el barrel `.`. El
 * barrel reexporta el punto de entrada de `entry/run-cli.js`, que encadena
 * `entry/run-program.js` -> `commands/mitm-commands.js`: importarlo mete el
 * despacho de comandos entero y el paquete `@thyrox/mitm` sólo para instalar
 * unos enlaces.
 *
 * La prueba mide el grafo REAL en runtime (`require.cache`, el único
 * registro que Bun comparte entre `import` y `require`), no un recorrido
 * estático de imports: `cli/src/print.ts` difiere su propio
 * `require('./index.js')` hasta que alguien invoca `runHeadless`, así que un
 * análisis estático marcaría el barrel como cargado aunque en runtime no lo
 * esté todavía.
 */
describe('installCliBindings no arrastra la CLI entera ni mitm', () => {
  test('cargar el módulo no mete cli/src/index.ts ni @thyrox/mitm en el grafo', async () => {
    await import('../installCliBindings.ts')
    const loaded = Object.keys(require.cache)

    expect(loaded.some(path => path.endsWith('/cli/src/index.ts'))).toBe(false)
    expect(loaded.some(path => path.includes('/packages/mitm/'))).toBe(false)

    // Control positivo: el módulo sí se cargó, con sus tres bindings estrechos.
    expect(loaded.some(path => path.endsWith('/cli/src/host.ts'))).toBe(true)
    expect(loaded.some(path => path.endsWith('/cli/src/print.ts'))).toBe(true)
    expect(loaded.some(path => path.endsWith('/cli/src/structuredIOHelper.ts'))).toBe(true)
  })
})
