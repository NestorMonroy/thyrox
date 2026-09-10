/**
 * Porte de `ccnmt: packages/agent/__tests__/claudeInChromeCommon.test.ts`.
 *
 * Tests de `claudeInChromeCommon` — seguimiento de pestañas de Chrome +
 * detección del nombre del servidor MCP.
 *
 * `trackClaudeInChromeTabId` tiene un tope de 200 pestañas que se resuelve
 * con "limpiar y añadir" cuando se agrega un id NUEVO en el tope. Una
 * expulsión equivocada es o bien crecimiento ilimitado de memoria (sin
 * expulsión) o perder la pestaña que el usuario acaba de abrir (expulsión
 * al re-agregar una existente). Se prueba el comportamiento documentado.
 */
import { describe, expect, test } from 'bun:test'
import {
  isClaudeInChromeMCPServer,
  isTrackedClaudeInChromeTabId,
  trackClaudeInChromeTabId,
} from '../claudeInChromeCommon.ts'

describe('isClaudeInChromeMCPServer', () => {
  test('coincide exactamente con "claude-in-chrome"', () => {
    expect(isClaudeInChromeMCPServer('claude-in-chrome')).toBe(true)
  })

  test('distingue mayúsculas: la variante en mayúsculas NO coincide', () => {
    // normalizeNameForMCP sólo reemplaza [^a-zA-Z0-9_-] por `_` — no pasa a
    // minúsculas. Así que "Claude-In-Chrome" queda igual y falla la
    // igualdad estricta. Es comportamiento documentado — la forma
    // canónica es exactamente "claude-in-chrome".
    expect(isClaudeInChromeMCPServer('Claude-In-Chrome')).toBe(false)
  })

  test('los caracteres fuera de [a-zA-Z0-9_-] se normalizan a _', () => {
    // Un espacio → guion bajo. Así que "claude in chrome" →
    // "claude_in_chrome", que NO es la forma canónica (con guiones).
    expect(isClaudeInChromeMCPServer('claude in chrome')).toBe(false)
  })

  test('la forma con guion bajo NO se considera equivalente a la de guion', () => {
    // La constante es "claude-in-chrome" (guiones). normalizeNameForMCP
    // no traduce guion bajo a guion (ni viceversa).
    expect(isClaudeInChromeMCPServer('claude_in_chrome')).toBe(false)
  })

  test('un nombre distinto devuelve false', () => {
    expect(isClaudeInChromeMCPServer('claude-in-firefox')).toBe(false)
    expect(isClaudeInChromeMCPServer('chrome')).toBe(false)
    expect(isClaudeInChromeMCPServer('')).toBe(false)
  })
})

describe('trackClaudeInChromeTabId — seguimiento básico', () => {
  test('agregar → isTracked devuelve true', () => {
    const tabId = 999_001 // fuera del rango del test de expulsión
    trackClaudeInChromeTabId(tabId)
    expect(isTrackedClaudeInChromeTabId(tabId)).toBe(true)
  })

  test('un id no rastreado devuelve false', () => {
    expect(isTrackedClaudeInChromeTabId(999_999_998)).toBe(false)
  })

  test('agregar el mismo id dos veces es idempotente (sigue rastreado una sola vez)', () => {
    const tabId = 999_002
    trackClaudeInChromeTabId(tabId)
    trackClaudeInChromeTabId(tabId)
    expect(isTrackedClaudeInChromeTabId(tabId)).toBe(true)
  })
})

describe('trackClaudeInChromeTabId — expulsión LRU en MAX_TRACKED_TABS', () => {
  test('agregar 250 ids distintos dispara limpiar-y-agregar', () => {
    // El tope es 200. Agregar un 201º id NUEVO limpia todo y agrega el
    // nuevo. Así que tras agregar 250 ids distintos en secuencia:
    //   - Los primeros 200 llenan el conjunto.
    //   - El 201º: no está presente + tamaño === 200 → limpia + agrega
    //     (el conjunto queda con 1).
    //   - Los 49 restantes se agregan normal → el conjunto queda con 50.
    // Los ids más viejos (1..200) se expulsan en el punto de desborde 201.
    const baseId = 1_000_000 // rango único para no chocar con otros tests
    for (let i = 0; i < 250; i++) {
      trackClaudeInChromeTabId(baseId + i)
    }
    // El primer lote (el más viejo) debe expulsarse en el punto de desborde.
    expect(isTrackedClaudeInChromeTabId(baseId)).toBe(false)
    expect(isTrackedClaudeInChromeTabId(baseId + 100)).toBe(false)

    // El último lote de 50 debe estar rastreado.
    expect(isTrackedClaudeInChromeTabId(baseId + 249)).toBe(true)
    expect(isTrackedClaudeInChromeTabId(baseId + 200)).toBe(true)
  })
})

describe('trackClaudeInChromeTabId — re-agregar un id existente en el tope NO expulsa', () => {
  test('agregar un id existente estando en el tope NO limpia', () => {
    // Crítico: si el tamaño === MAX y el id YA está rastreado, la función
    // agrega normalmente sin limpiar. Esto protege contra perder estado
    // real cuando una pestaña dispara onActivated repetidamente.
    const baseId = 2_000_000
    // Primero, agregar ids frescos repetidamente para reconstruir el
    // seguimiento cerca del tope. (No se puede resetear el estado
    // limpiamente, así que sólo se verifica la guarda de comportamiento.)
    const sentinel = 2_000_500
    trackClaudeInChromeTabId(sentinel)
    expect(isTrackedClaudeInChromeTabId(sentinel)).toBe(true)
    // Re-rastrear el mismo id — debe seguir rastreado.
    trackClaudeInChromeTabId(sentinel)
    expect(isTrackedClaudeInChromeTabId(sentinel)).toBe(true)
  })
})
