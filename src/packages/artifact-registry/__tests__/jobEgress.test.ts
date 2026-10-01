import { describe, expect, test } from 'bun:test'

import { JOB_EGRESS_ENV, JobEgressError, resolveJobEgress } from '../jobEgress.js'

describe('resolveJobEgress', () => {
  test('la variable declarada gana sobre el entorno heredado', () => {
    const egress = resolveJobEgress({
      [JOB_EGRESS_ENV.proxyUrl]: 'http://10.0.0.5:3128',
      HTTPS_PROXY: 'http://127.0.0.1:43003',
      [JOB_EGRESS_ENV.caBundle]: '/etc/ca/declared.crt',
      NODE_EXTRA_CA_CERTS: '/root/.ccr/ca-bundle.crt',
    })
    expect(egress).toEqual({ kind: 'proxy', proxyUrl: 'http://10.0.0.5:3128', caBundlePath: '/etc/ca/declared.crt' })
  })

  test('vacía, hereda el proxy y el CA que el proceso anfitrión ya recibe', () => {
    const egress = resolveJobEgress({ HTTPS_PROXY: 'http://127.0.0.1:43003', SSL_CERT_FILE: '/root/.ccr/ca-bundle.crt' })
    expect(egress).toEqual({ kind: 'proxy', proxyUrl: 'http://127.0.0.1:43003', caBundlePath: '/root/.ccr/ca-bundle.crt' })
  })

  test('sin proxy en ninguna fuente, la salida es directa', () => {
    expect(resolveJobEgress({})).toEqual({ kind: 'direct' })
  })

  test('rehúsa un proxy con credencial en la URL: quedaría en podman inspect', () => {
    expect(() => resolveJobEgress({ HTTPS_PROXY: 'http://user:pw@127.0.0.1:43003' })).toThrow(JobEgressError)
  })

  test('rehúsa un proxy que no es URL', () => {
    expect(() => resolveJobEgress({ [JOB_EGRESS_ENV.proxyUrl]: '127.0.0.1:43003' })).toThrow(JobEgressError)
  })
})
