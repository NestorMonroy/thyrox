/**
 * TASK-THYROX-0324 parte C: el proveedor no ramifica por NODE_ENV. El
 * ejecutable 2.1.283 no contiene `TestingPermissionTool` (0 literales), así
 * que la rama `NODE_ENV === 'test'` era conducta que existía sólo bajo
 * `bun test`. Quien la necesite la inyecta con `extraTools`.
 */
import { describe, expect, test } from 'bun:test'
import { TestingPermissionTool } from '../../../testing/TestingPermissionTool.js'
import {
  BuiltInToolsProvider,
  createBuiltInToolsProvider,
} from '../BuiltInToolsProvider.js'

describe('BuiltInToolsProvider y el útil de pruebas de permisos', () => {
  test('el proveedor por defecto no lo registra ni bajo NODE_ENV=test', async () => {
    expect(process.env.NODE_ENV).toBe('test')
    const names = (await BuiltInToolsProvider.discover()).map(t => t.name)
    expect(names).not.toContain(TestingPermissionTool.name)
  })

  test('se inyecta con extraTools', async () => {
    const provider = createBuiltInToolsProvider({ extraTools: [TestingPermissionTool] })
    const names = (await provider.discover()).map(t => t.name)
    expect(names).toContain(TestingPermissionTool.name)
  })
})
