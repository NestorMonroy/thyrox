/**
 * La mitad ROJA de `StubRegistry`.
 *
 * Procedencia del SUJETO: `ccnmt: packages/tool-registry/src/testing/index.ts`.
 * Los casos son propios —ese árbol declara `"license": "UNLICENSED"`— y cubren
 * el mismo contrato.
 *
 * QUÉ SE MIDE. El módulo existe para que un test hermético declare
 * herramientas sin arrancar el registro real, así que lo que hay que fijar es
 * su AISLAMIENTO, no su funcionalidad: dos registros no se ven entre sí, y lo
 * que `getAll()` devuelve no es el mapa interno.
 *
 * Dos costuras con anulación, y las dos se corrieron:
 *
 * 1. **La copia de `getAll()`** — `Array.from(...)` construye una cada vez.
 *    Anulación: construirla UNA vez y cachearla (`this.cached ??= ...`); cae
 *    **1** caso, el 7, el que muta lo devuelto. Una primera anulación —cachear
 *    pero rellenar en cada llamada— NO discriminó (0 fail): el arreglo se
 *    repoblaba, así que medía otra cosa. Se declara porque es el sub-patrón D
 *    cometido al escribir el propio control.
 * 2. **El mapa por instancia** — `private readonly tools` en el constructor.
 *    Anulación: subirlo a `static` y caen **2** casos, el 7 y el 8: con el
 *    mapa compartido, `getAll()` de un registro ve lo que sembró el otro. Es
 *    la costura que hace hermético al módulo.
 *
 * Métrica: registro, consulta, borrado y vaciado sobre dos instancias.
 * Ciega a: el registro REAL de herramientas — este módulo no lo toca por
 * diseño, y un test que confundiera ambos mediría otra cosa.
 */
import { describe, expect, test } from 'bun:test'
import { StubRegistry, type StubToolDefinition } from '../index.js'

const bash: StubToolDefinition = { name: 'Bash', description: 'corre un comando' }
const grep: StubToolDefinition = { name: 'Grep', inputSchema: { pattern: 'string' } }

describe('StubRegistry — el ciclo de una herramienta', () => {
  test('1. registrar y consultar devuelve la misma definición', () => {
    const r = new StubRegistry()
    r.register(bash)
    expect(r.get('Bash')).toBe(bash)
  })

  test('2. consultar un nombre no registrado devuelve undefined, no lanza', () => {
    expect(new StubRegistry().get('NoExiste')).toBeUndefined()
  })

  test('3. registrar dos veces el mismo nombre sustituye, no duplica', () => {
    const r = new StubRegistry()
    r.register({ name: 'Bash', description: 'primera' })
    r.register({ name: 'Bash', description: 'segunda' })
    expect(r.getAll()).toHaveLength(1)
    expect(r.get('Bash')?.description).toBe('segunda')
  })

  test('4. unregister distingue «había» de «no había»', () => {
    const r = new StubRegistry()
    r.register(bash)
    expect(r.unregister('Bash')).toBe(true)
    expect(r.unregister('Bash')).toBe(false)
    expect(r.get('Bash')).toBeUndefined()
  })

  test('5. reset vacía el registro entero', () => {
    const r = new StubRegistry()
    r.register(bash)
    r.register(grep)
    r.reset()
    expect(r.getAll()).toEqual([])
  })
})

describe('StubRegistry — el aislamiento, que es el punto', () => {
  test('6. getAll conserva el orden de inserción', () => {
    const r = new StubRegistry()
    r.register(grep)
    r.register(bash)
    expect(r.getAll().map(t => t.name)).toEqual(['Grep', 'Bash'])
  })

  test('7. mutar lo que devuelve getAll no toca el registro', () => {
    const r = new StubRegistry()
    r.register(bash)
    const copia = r.getAll()
    copia.push(grep)
    copia.length = 0
    expect(r.getAll().map(t => t.name)).toEqual(['Bash'])
  })

  test('8. dos registros no se ven entre sí', () => {
    const uno = new StubRegistry()
    const otro = new StubRegistry()
    uno.register(bash)
    expect(otro.get('Bash')).toBeUndefined()
    expect(otro.getAll()).toEqual([])
  })
})
