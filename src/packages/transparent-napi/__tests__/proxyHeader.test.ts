// La cabecera PROXY v1 (HAProxy) con que el puente en C anuncia el destino original a Bun,
// y con que Bun anuncia a la salida marcada adónde conectar. Una línea ASCII terminada en
// CRLF: `PROXY TCP4 <origen> <destino> <puerto-origen> <puerto-destino>`.
import { test } from 'bun:test'
import assert from 'node:assert/strict'

import { formatProxyV1Header, parseProxyV1Header } from '../src/proxyHeader.ts'

test('escribe la línea con el origen, el destino y CRLF', () => {
  assert.equal(
    formatProxyV1Header({ srcIp: '10.0.0.2', srcPort: 51000, dstIp: '1.2.3.4', dstPort: 443 }),
    'PROXY TCP4 10.0.0.2 1.2.3.4 51000 443\r\n',
  )
})

test('lee la cabecera y devuelve lo que sigue a ella', () => {
  const parsed = parseProxyV1Header(Buffer.from('PROXY TCP4 10.0.0.2 1.2.3.4 51000 443\r\nGET / HTTP/1.1'))
  assert.equal(parsed.kind, 'header')
  if (parsed.kind !== 'header') return
  assert.deepEqual(parsed.header, { srcIp: '10.0.0.2', srcPort: 51000, dstIp: '1.2.3.4', dstPort: 443 })
  assert.equal(parsed.rest.toString(), 'GET / HTTP/1.1')
})

test('sin CRLF todavía, pide más bytes', () => {
  assert.equal(parseProxyV1Header(Buffer.from('PROXY TCP4 10.0.0.2 1.2')).kind, 'incomplete')
})

test('una línea que no es PROXY v1 TCP4 se rechaza', () => {
  assert.equal(parseProxyV1Header(Buffer.from('GET / HTTP/1.1\r\n')).kind, 'invalid')
  assert.equal(parseProxyV1Header(Buffer.from('PROXY TCP6 ::1 ::1 1 2\r\n')).kind, 'invalid')
  assert.equal(parseProxyV1Header(Buffer.from('PROXY TCP4 1.2.3.4 5.6.7.8 70000 443\r\n')).kind, 'invalid')
})

test('más de 107 bytes sin CRLF es inválido: la especificación acota la línea', () => {
  assert.equal(parseProxyV1Header(Buffer.alloc(120, 0x41)).kind, 'invalid')
})
