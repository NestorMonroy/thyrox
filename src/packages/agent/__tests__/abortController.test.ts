/**
 * Porte de `ccnmt: packages/agent/__tests__/abortController.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia es
 * el idioma de la descripcion. Lo que se mide no es que aborte —eso lo hace
 * `AbortController` de serie— sino la DIRECCION de la propagacion.
 */
import { describe, expect, test } from 'bun:test'
import { createAbortController, createChildAbortController } from '../abortController.ts'

describe('createAbortController', () => {
  test('devuelve un AbortController nuevo', () => {
    const c = createAbortController()
    expect(c).toBeInstanceOf(AbortController)
    expect(c.signal.aborted).toBe(false)
  })

  test('la senal se puede abortar a mano', () => {
    const c = createAbortController()
    c.abort()
    expect(c.signal.aborted).toBe(true)
  })

  test('conserva la razon del aborto', () => {
    const c = createAbortController()
    const reason = new Error('boom')
    c.abort(reason)
    expect(c.signal.reason).toBe(reason)
  })

  test('sesenta escuchas no disparan el aviso de acumulacion con el limite por defecto', () => {
    const c = createAbortController()
    // Sesenta pasa del limite por defecto: sin `setMaxListeners` avisaria.
    for (let i = 0; i < 60; i++) c.signal.addEventListener('abort', () => {})
    expect(c.signal.aborted).toBe(false)
  })

  test('el limite por parametro se respeta', () => {
    const c = createAbortController(5)
    for (let i = 0; i < 5; i++) c.signal.addEventListener('abort', () => {})
    expect(c.signal.aborted).toBe(false)
  })
})

describe('createChildAbortController', () => {
  test('abortar al padre aborta al hijo', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    expect(child.signal.aborted).toBe(false)
    parent.abort()
    expect(child.signal.aborted).toBe(true)
  })

  test('abortar al hijo NO aborta al padre', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    child.abort()
    expect(child.signal.aborted).toBe(true)
    expect(parent.signal.aborted).toBe(false)
  })

  test('el hijo hereda la razon del padre', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    const reason = new Error('parent-aborted')
    parent.abort(reason)
    expect(child.signal.reason).toBe(reason)
  })

  test('padre ya abortado: el hijo nace abortado por el camino corto', () => {
    const parent = createAbortController()
    parent.abort(new Error('pre-aborted'))
    const child = createChildAbortController(parent)
    expect(child.signal.aborted).toBe(true)
    expect((child.signal.reason as Error).message).toBe('pre-aborted')
  })

  test('el hijo tiene razon propia e independiente', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    const childReason = new Error('child-only')
    child.abort(childReason)
    expect(child.signal.reason).toBe(childReason)
    expect(parent.signal.aborted).toBe(false)
  })

  test('varios hijos del mismo padre abortan juntos', () => {
    const parent = createAbortController()
    const childA = createChildAbortController(parent)
    const childB = createChildAbortController(parent)
    parent.abort()
    expect(childA.signal.aborted).toBe(true)
    expect(childB.signal.aborted).toBe(true)
  })

  test('tras abortar el hijo, abortar al padre no lo re-dispara', () => {
    const parent = createAbortController()
    const child = createChildAbortController(parent)
    // La escucha padre→hijo se retira sola con `{ once: true }`; la de
    // limpieza quita lo que quede. Abortar al padre despues es un no-op.
    child.abort()
    parent.abort()
    expect(child.signal.aborted).toBe(true)
    expect(parent.signal.aborted).toBe(true)
  })
})
