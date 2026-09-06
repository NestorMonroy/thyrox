import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { applyExtraCACertsFromConfig } from '../caCertsConfig.js'

let original: string | undefined

beforeEach(() => {
  original = process.env.NODE_EXTRA_CA_CERTS
  delete process.env.NODE_EXTRA_CA_CERTS
})

afterEach(() => {
  if (original === undefined) delete process.env.NODE_EXTRA_CA_CERTS
  else process.env.NODE_EXTRA_CA_CERTS = original
})

describe('applyExtraCACertsFromConfig', () => {
  test('si NODE_EXTRA_CA_CERTS ya está en el proceso, no toca nada más', () => {
    process.env.NODE_EXTRA_CA_CERTS = '/ya/estaba.pem'
    let leidoGlobalConfig = false
    applyExtraCACertsFromConfig({
      getGlobalConfigEnv: () => {
        leidoGlobalConfig = true
        return { NODE_EXTRA_CA_CERTS: '/otro.pem' }
      },
    })
    expect(process.env.NODE_EXTRA_CA_CERTS).toBe('/ya/estaba.pem')
    expect(leidoGlobalConfig).toBe(false)
  })

  test('sin ningún lector inyectado: no aplica nada (estado real hoy — sin config ausente)', () => {
    applyExtraCACertsFromConfig()
    expect(process.env.NODE_EXTRA_CA_CERTS).toBeUndefined()
  })

  test('userSettings tiene prioridad sobre globalConfig', () => {
    applyExtraCACertsFromConfig({
      getGlobalConfigEnv: () => ({ NODE_EXTRA_CA_CERTS: '/de-global.pem' }),
      getUserSettingsEnv: () => ({ NODE_EXTRA_CA_CERTS: '/de-settings.pem' }),
    })
    expect(process.env.NODE_EXTRA_CA_CERTS).toBe('/de-settings.pem')
  })

  test('cae a globalConfig si userSettings no trae el valor', () => {
    applyExtraCACertsFromConfig({
      getGlobalConfigEnv: () => ({ NODE_EXTRA_CA_CERTS: '/de-global.pem' }),
      getUserSettingsEnv: () => ({}),
    })
    expect(process.env.NODE_EXTRA_CA_CERTS).toBe('/de-global.pem')
  })

  test('un lector que lanza no rompe el arranque — se traga el error y no aplica', () => {
    const mensajes: string[] = []
    applyExtraCACertsFromConfig({
      getGlobalConfigEnv: () => {
        throw new Error('config corrupta')
      },
      debugSink: (m) => mensajes.push(m),
    })
    expect(process.env.NODE_EXTRA_CA_CERTS).toBeUndefined()
    expect(mensajes.some((m) => m.includes('Config fallback failed'))).toBe(true)
  })
})
