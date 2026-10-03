/**
 * TASK-THYROX-0324 (B): el corte de `shouldLog` bajo entorno de prueba
 * exige `!toStderr && filePath === null` en el ejecutable 2.1.283
 * (`shouldLog`, chunk-zkn0228z). Con `--debug-file` el registro sigue activo
 * aunque `NODE_ENV` sea `test`.
 */
import { afterEach, expect, test } from 'bun:test'
import {
  getDebugFilePath,
  isDebugMode,
  shouldLogDebugMessage,
} from '../src/debug.ts'

const savedArgv = [...process.argv]

afterEach(() => {
  process.argv = [...savedArgv]
  ;(getDebugFilePath as any).cache?.clear?.()
  ;(isDebugMode as any).cache?.clear?.()
})

test('con --debug-file y NODE_ENV=test el mensaje se registra', () => {
  expect(process.env.NODE_ENV).toBe('test')
  process.argv = [...savedArgv, '--debug-file=/tmp/x.log']
  ;(getDebugFilePath as any).cache?.clear?.()
  ;(isDebugMode as any).cache?.clear?.()
  expect(shouldLogDebugMessage('hola')).toBe(true)
})

test('sin --debug-file ni --debug-to-stderr bajo NODE_ENV=test no se registra', () => {
  expect(shouldLogDebugMessage('hola')).toBe(false)
})
