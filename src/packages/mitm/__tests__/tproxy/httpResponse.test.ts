// El lector de respuestas HTTP/1.1 del reenvío TPROXY: Bun ignora createConnection, así que el
// reenvío escribe la petición sobre su propio socket TLS y lee la respuesta con este lector.
import { test } from 'bun:test'
import assert from 'node:assert/strict'

import { formatHttpRequest, parseHttpResponse } from '../../src/tproxy/httpResponse.ts'

test('lee estado, cabeceras en minúsculas y cuerpo por content-length', () => {
  const parsed = parseHttpResponse(Buffer.from('HTTP/1.1 201 Created\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\nhola!'))
  assert.equal(parsed.status, 201)
  assert.equal(parsed.headers['content-type'], 'text/plain')
  assert.equal(parsed.body.toString(), 'hola!')
})

test('decodifica transfer-encoding chunked', () => {
  const raw = 'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4\r\nhola\r\n6\r\n mundo\r\n0\r\n\r\n'
  assert.equal(parseHttpResponse(Buffer.from(raw)).body.toString(), 'hola mundo')
})

test('sin content-length ni chunked, el cuerpo es lo que queda hasta el cierre', () => {
  assert.equal(parseHttpResponse(Buffer.from('HTTP/1.1 200 OK\r\n\r\nhasta el final')).body.toString(), 'hasta el final')
})

test('una cabecera repetida se une con coma', () => {
  const parsed = parseHttpResponse(Buffer.from('HTTP/1.1 200 OK\r\nVary: a\r\nVary: b\r\nContent-Length: 0\r\n\r\n'))
  assert.equal(parsed.headers.vary, 'a, b')
})

test('una respuesta sin línea de estado HTTP lanza', () => {
  assert.throws(() => parseHttpResponse(Buffer.from('basura')), /HTTP/)
})

test('la petición lleva su content-length y connection: close', () => {
  const raw = formatHttpRequest({ method: 'POST', path: '/v1', headers: { host: 'a.test', authorization: 'Bearer x' }, body: Buffer.from('{}') })
  assert.equal(
    raw.toString(),
    'POST /v1 HTTP/1.1\r\nhost: a.test\r\nauthorization: Bearer x\r\ncontent-length: 2\r\nconnection: close\r\n\r\n{}',
  )
})
