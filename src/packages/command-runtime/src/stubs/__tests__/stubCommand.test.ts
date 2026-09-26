import { describe, expect, test } from 'bun:test'
import { isCommandEnabled } from '@thyrox/agent/command.js'
import stub from '../stubCommand.js'

// El stub sustituye a 17 comandos desactivados: el registro lo trata como
// ausente porque está oculto y deshabilitado, y si alguien lo cargara igual,
// falla nombrándose en vez de devolver un módulo vacío.
describe('stubCommand', () => {
  test('es un comando local oculto y deshabilitado', () => {
    expect(stub.type).toBe('local')
    expect(stub.isHidden).toBe(true)
    expect(isCommandEnabled(stub)).toBe(false)
  })

  test('cargarlo falla nombrando el stub', async () => {
    if (stub.type !== 'local') throw new Error('no es local')
    await expect(stub.load()).rejects.toThrow('stub')
  })
})
