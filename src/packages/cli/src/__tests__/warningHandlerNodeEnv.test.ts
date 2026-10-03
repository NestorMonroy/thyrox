/**
 * TASK-THYROX-0324 (B): `initializeWarningHandler` decide quitar los
 * listeners de `warning` sólo por `isRunningFromBuildDirectory()`. El
 * ejecutable 2.1.283 (`vr`, chunk-fa2jy0nf) es `if(!yn()) removeAllListeners`
 * sin ninguna rama por `NODE_ENV === 'development'`.
 */
import { afterEach, expect, test } from 'bun:test'
import { initializeWarningHandler } from '../utils/warningHandler.ts'

const savedEnv = process.env.NODE_ENV
const savedListeners = process.listeners('warning')

afterEach(() => {
  process.removeAllListeners('warning')
  for (const l of savedListeners) process.on('warning', l)
  process.env.NODE_ENV = savedEnv
})

test('NODE_ENV=development no conserva el handler por defecto de Node', () => {
  process.env.NODE_ENV = 'development'
  process.removeAllListeners('warning')
  const foreign = () => {}
  process.on('warning', foreign)
  initializeWarningHandler()
  expect(process.listeners('warning')).not.toContain(foreign)
})
