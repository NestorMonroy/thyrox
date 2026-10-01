/**
 * TASK-THYROX-0324 parte C: `resetAfterCommit` no ramifica por NODE_ENV. El
 * host config del ejecutable 2.1.283 (`yy`, chunk-j3kxae8b.js) llama a
 * `onComputeLayout` y luego a `onRender` en cada commit, sin condición; la
 * rama `NODE_ENV === 'test'` desviaba a `onImmediateRender` sólo bajo
 * `bun test`. Quien necesite el render síncrono lo inyecta como `onRender`.
 */
import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { ConcurrentRoot } from 'react-reconciler/constants.js'
import * as dom from '../dom.js'
import reconciler from '../reconciler.js'

function commitOnce(rootNode: dom.DOMElement): void {
  const noop = (): void => {}
  const container = reconciler.createContainer(
    rootNode, ConcurrentRoot, null, false, null, 'id', noop, noop, noop, noop,
  )
  reconciler.updateContainerSync(createElement('ink-box'), container, null, noop)
  reconciler.flushSyncWork()
}

describe('resetAfterCommit bajo NODE_ENV=test', () => {
  test('cada commit invoca onRender, no onImmediateRender', () => {
    expect(process.env.NODE_ENV).toBe('test')
    const calls: string[] = []
    const rootNode = dom.createNode('ink-root')
    rootNode.onRender = () => calls.push('onRender')
    rootNode.onImmediateRender = () => calls.push('onImmediateRender')
    commitOnce(rootNode)
    expect(calls).toEqual(['onRender'])
  })

  test('onComputeLayout corre antes de onRender', () => {
    const calls: string[] = []
    const rootNode = dom.createNode('ink-root')
    rootNode.onComputeLayout = () => calls.push('layout')
    rootNode.onRender = () => calls.push('render')
    commitOnce(rootNode)
    expect(calls).toEqual(['layout', 'render'])
  })
})
