// El agente de proxy recibe las opciones de conexión (mTLS, CA y las que
// pasa quien llama). Con https-proxy-agent 5 el constructor tomaba un único
// argumento y el segundo —donde `createHttpsProxyAgent` pone esas opciones—
// se ignoraba en silencio; la fuente fija la versión 8.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { InternalAxiosRequestConfig } from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { createAxiosInstance } from '../proxy.ts'

const saved = process.env.HTTPS_PROXY
beforeEach(() => {
  process.env.HTTPS_PROXY = 'http://proxy.example.test:3128'
})
afterEach(() => {
  if (saved === undefined) delete process.env.HTTPS_PROXY
  else process.env.HTTPS_PROXY = saved
})

describe('createAxiosInstance con proxy', () => {
  test('las opciones extra llegan a connectOpts del agente', () => {
    const instance = createAxiosInstance({ servername: 'api.example.test' })
    const handlers = (instance.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig }>
    }).handlers
    const config = handlers[0]?.fulfilled({ url: 'https://api.example.test/v1' } as InternalAxiosRequestConfig)
    expect(config?.httpsAgent).toBeInstanceOf(HttpsProxyAgent)
    expect((config?.httpsAgent as HttpsProxyAgent<string>).connectOpts.servername).toBe('api.example.test')
  })
})
