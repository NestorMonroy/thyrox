/**
 * La lista de dominios preaprobados de WebFetch NO llega a la red del sandbox.
 *
 * Es el control que `tool-registry: tools/WebFetchTool/preapproved.ts:11`
 * citaba —«test/utils/sandbox/webfetch-preapproved-separation.test.ts»— y que
 * no existía en este árbol. La razón está en esa cabecera: los preaprobados
 * valen SÓLO para peticiones GET de WebFetch; varios admiten subidas
 * (huggingface.co, kaggle.com, nuget.org), así que heredarlos como red libre
 * del sandbox abriría una vía de exfiltración.
 *
 * Qué haría fallar a este control:
 * - que `convertToSandboxRuntimeConfig` sembrara `allowedDomains` con un
 *   preaprobado. Anulado, medido sembrando `docs.python.org`: caen los
 *   cuatro casos, porque cada uno afirma la lista EXACTA de dominios;
 * - que dejara de traducir una regla explícita `WebFetch(domain:…)` a un
 *   dominio permitido o denegado (casos 3 y 4): sin ellos, «no hay
 *   preaprobados» se cumpliría también con una lista siempre vacía.
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import { installConfigHostBindings } from '@thyrox/config'
import { InMemoryConfig } from '@thyrox/config/testing'
import { PREAPPROVED_HOSTS } from '@thyrox/tool-registry/tools/WebFetchTool/preapproved.js'
import { convertToSandboxRuntimeConfig } from '../sandbox-adapter.js'

// Las rutas de los archivos de ajustes que el sandbox protege de escritura se
// resuelven contra los bindings del host; aquí, un config en memoria.
beforeAll(() => {
  installConfigHostBindings(new InMemoryConfig().bindings)
})

const settings = (value: object) => value as Parameters<typeof convertToSandboxRuntimeConfig>[0]

describe('separación entre preaprobados de WebFetch y red del sandbox', () => {
  test('1. sin reglas, ningún dominio está permitido', () => {
    expect(convertToSandboxRuntimeConfig(settings({})).network.allowedDomains).toEqual([])
  })

  test('2. ningún preaprobado aparece aunque haya otras reglas', () => {
    const { allowedDomains } = convertToSandboxRuntimeConfig(
      settings({ permissions: { allow: ['WebFetch(domain:example.org)'] } }),
    ).network
    const inherited = [...PREAPPROVED_HOSTS].filter(host => allowedDomains.includes(host))
    expect(inherited).toEqual([])
  })

  test('3. un preaprobado entra sólo con su regla explícita', () => {
    const { allowedDomains } = convertToSandboxRuntimeConfig(
      settings({ permissions: { allow: ['WebFetch(domain:huggingface.co)'] } }),
    ).network
    expect(allowedDomains).toEqual(['huggingface.co'])
  })

  test('4. una regla de denegación va a deniedDomains, no a allowedDomains', () => {
    const { allowedDomains, deniedDomains } = convertToSandboxRuntimeConfig(
      settings({ permissions: { deny: ['WebFetch(domain:kaggle.com)'] } }),
    ).network
    expect([allowedDomains, deniedDomains]).toEqual([[], ['kaggle.com']])
  })
})
