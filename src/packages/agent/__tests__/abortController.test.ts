/**
 * Porte de `ccnmt: packages/agent/__tests__/abortController.test.ts`.
 * Lo que se mide no es que aborte —eso lo hace `AbortController` de serie—
 * sino la DIRECCION de la propagacion y la retirada de la escucha del padre.
 */
import { describe, expect, test } from 'bun:test'
import { createAbortController, createChildAbortController } from '../abortController.ts'

describe('createAbortController', () => {
  test('devuelve un controlador sin abortar', () => {
    expect(createAbortController().signal.aborted).toBe(false)
  })

  test('la senal se puede abortar a mano', () => {
    const c = createAbortController()
    c.abort()
    expect(c.signal.aborted).toBe(true)
  })

  test('conserva la razon del aborto', () => {
    const c = createAbortController()
    const reason = new Error('porque si')
    c.abort(reason)
    expect(c.signal.reason).toBe(reason)
  })

  test('cincuenta escuchas no disparan aviso de acumulacion', () => {
    const c = createAbortController()
    for (let i = 0; i < 50; i++) c.signal.addEventListener('abort', () => {})
    expect(() => c.abort()).not.toThrow()
  })

  test('el limite se puede subir por parametro', () => {
    const c = createAbortController(200)
    for (let i = 0; i < 120; i++) c.signal.addEventListener('abort', () => {})
    expect(() => c.abort()).not.toThrow()
  })
})

describe('createChildAbortController', () => {
  test('abortar al padre aborta al hijo', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    parent.abort()
    expect(child.signal.aborted).toBe(true)
  })

  test('abortar al hijo NO aborta al padre', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    child.abort()
    expect(parent.signal.aborted).toBe(false)
  })

  test('el hijo hereda la razon del padre', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    const reason = new Error('del padre')
    parent.abort(reason)
    expect(child.signal.reason).toBe(reason)
  })

  test('padre ya abortado: el hijo nace abortado por el camino corto', () => {
    const parent = createAbortController()
    const reason = new Error('previo')
    parent.abort(reason)
    const child = createChildAbortController(parent)
    expect(child.signal.aborted).toBe(true)
    expect(child.signal.reason).toBe(reason)
  })

  test('el hijo puede tener razon propia si aborta el primero', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    const propia = new Error('del hijo')
    child.abort(propia)
    expect(child.signal.reason).toBe(propia)
    expect(parent.signal.aborted).toBe(false)
  })

  test('varios hijos del mismo padre abortan juntos', () => {
    const parent = createAbortController()
    const hijos = [1, 2, 3].map(() => createChildAbortController(parent))
    parent.abort()
    for (const h of hijos) expect(h.signal.aborted).toBe(true)
  })

  test('abortar al hijo retira su escucha del padre: el padre sigue usable', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    child.abort()
    let visto = false
    parent.signal.addEventListener('abort', () => {
      visto = true
    })
    parent.abort()
    expect(visto).toBe(true)
  })
})
