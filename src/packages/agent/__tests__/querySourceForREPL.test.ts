// Contrato de `cxe` del binario 2.1.281: el estilo de salida por defecto es
// `repl_main_thread`; uno propio del producto lleva su nombre, y cualquier
// otro colapsa a `custom` para no abrir la etiqueta a nombres arbitrarios.
import { describe, expect, test } from 'bun:test'
import { getQuerySourceForREPL } from '../promptCategory.ts'

describe('getQuerySourceForREPL', () => {
  test('sin estilo, o con el de defecto, es el hilo principal a secas', () => {
    expect(getQuerySourceForREPL(() => undefined)).toBe('repl_main_thread')
    expect(getQuerySourceForREPL(() => 'default')).toBe('repl_main_thread')
  })
  test('un estilo propio lleva su nombre', () => {
    expect(getQuerySourceForREPL(() => 'Explanatory')).toBe('repl_main_thread:outputStyle:Explanatory')
  })
  test('un estilo del usuario colapsa a custom', () => {
    expect(getQuerySourceForREPL(() => 'mi-estilo')).toBe('repl_main_thread:outputStyle:custom')
  })
})
