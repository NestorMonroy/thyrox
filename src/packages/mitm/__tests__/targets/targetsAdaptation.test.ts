/**
 * Lo que el porte de los destinos cambia respecto de la referencia: el
 * handler es una referencia estática y no un import dinámico, y los textos
 * nombran este producto.
 */
import { expect, test } from 'bun:test'

import { PRODUCT_NAME } from '@thyrox/config/product'

import { MitmHandlerBase } from '../../src/handlers/base.ts'
import { detectAgent } from '../../src/detection/index.ts'
import { ALL_TARGETS } from '../../src/targets/index.ts'

test('every target resolves to its handler class', async () => {
  for (const target of ALL_TARGETS) {
    const { default: Handler } = await target.handler()
    expect(new Handler()).toBeInstanceOf(MitmHandlerBase)
  }
})

test('no target text names the reference product', () => {
  const text = JSON.stringify(ALL_TARGETS.map(({ handler: _handler, ...view }) => view))
  expect(text).not.toContain('OmniRoute')
  expect(text).toContain(PRODUCT_NAME)
})

test('ghe-copilot has no local probe and reports not installed', () => {
  expect(detectAgent('ghe-copilot')).toEqual({ installed: false })
})
