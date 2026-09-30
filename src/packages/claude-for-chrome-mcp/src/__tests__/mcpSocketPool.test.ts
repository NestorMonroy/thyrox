/**
 * El escaneo de sockets del pool es asíncrono y compartido, como en 2.1.275
 * (`refreshClients`/`doRefreshClients`).
 */
import { describe, expect, test } from 'bun:test'
import { createMcpSocketPool } from '../mcpSocketPool.js'
import type { ClaudeForChromeContext } from '../types.js'

function context(getSocketPaths: () => string[] | Promise<string[]>, logs: string[]): ClaudeForChromeContext {
  const log = (message: string) => void logs.push(message)
  return {
    serverName: 'test',
    logger: { info: log, error: log, warn: log, debug: log, silly: log },
    socketPath: '/nonexistent.sock',
    getSocketPaths,
    clientTypeId: 'claude-code',
    onToolCallDisconnected: () => '',
    onAuthenticationError: () => {},
  } as ClaudeForChromeContext
}

describe('McpSocketPool — escaneo de sockets', () => {
  test('dos conexiones concurrentes comparten un solo escaneo asíncrono', async () => {
    let scans = 0
    const pool = createMcpSocketPool(context(async () => {
      scans++
      await new Promise(resolve => setTimeout(resolve, 10))
      return []
    }, []))
    const [a, b] = await Promise.all([pool.ensureConnected(), pool.ensureConnected()])
    expect([a, b]).toEqual([false, false])
    expect(scans).toBe(1)
  })
  test('un escaneo que falla se registra y no rompe la conexión', async () => {
    const logs: string[] = []
    const pool = createMcpSocketPool(context(async () => {
      throw new Error('EACCES')
    }, logs))
    expect(await pool.ensureConnected()).toBe(false)
    expect(logs.some(line => line.includes('Socket scan failed'))).toBe(true)
  })
})
