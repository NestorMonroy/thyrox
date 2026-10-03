/**
 * TASK-THYROX-0324 (B): el intervalo de sondeo de `GitFileWatcher` es 1000 ms
 * también bajo `NODE_ENV=test`. El ejecutable 2.1.283 (`cn`, chunk-m8ebe51k)
 * es la constante `1000` y no tiene variante de prueba; las pruebas que
 * necesitan sondeo rápido lo inyectan.
 */
import { afterEach, expect, test } from 'bun:test'
import {
  getWatchIntervalMs,
  setWatchIntervalMsForTesting,
} from '../gitFilesystem.ts'

afterEach(() => setWatchIntervalMsForTesting(undefined))

test('por defecto es 1000 ms aunque NODE_ENV sea test', () => {
  expect(process.env.NODE_ENV).toBe('test')
  expect(getWatchIntervalMs()).toBe(1000)
})

test('una prueba puede inyectar otro intervalo y restaurarlo', () => {
  setWatchIntervalMsForTesting(10)
  expect(getWatchIntervalMs()).toBe(10)
  setWatchIntervalMsForTesting(undefined)
  expect(getWatchIntervalMs()).toBe(1000)
})
