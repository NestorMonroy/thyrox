/**
 * El nombre del producto vive en `@thyrox/config/product`, que todos los
 * paquetes con texto visible importan. Estaba sólo en la cli
 * (`cli/src/entry/productName.ts`), que el REPL no puede usar sin volver a
 * cruzar su dependencia mutua; la cli lo re-exporta desde aquí, así que las
 * dos rutas son el MISMO valor y no dos copias que puedan divergir.
 */
import { describe, expect, test } from 'bun:test'
import { PRODUCT_NAME } from '../product.js'

describe('PRODUCT_NAME', () => {
  test('es thyrox', () => {
    expect(PRODUCT_NAME).toBe('thyrox')
  })

  test('la cli lo toma de aquí', async () => {
    const source = await Bun.file(new URL('../../cli/src/entry/productName.ts', import.meta.url)).text()
    expect(source).toContain("export { PRODUCT_NAME } from '@thyrox/config/product'")
    expect(source).not.toMatch(/export const PRODUCT_NAME/)
  })
})
