// Portado de omniroute: tests/unit/mitm-startup-error-3606.test.ts (MIT), sobre bun:test. El
// proceso del servidor de thyrox (`server/main.ts`) marca su única línea de fallo con `[MITM]`,
// no con `❌`; y como reenvía sin `Authorization` cuando falta la clave, el caso «falta
// ROUTER_API_KEY» de la referencia no existe aquí.
import { test } from 'bun:test'
import assert from 'node:assert/strict'

import { interpretMitmStartupError } from '../../src/manager.ts'

test('un puerto ocupado se informa como puerto ocupado', () => {
  const msg = interpretMitmStartupError('[MITM] Port 443 already in use', 443)
  assert.match(msg, /443/)
  assert.match(msg, /in use/i)
})

test('un permiso denegado se informa como permiso, no como puerto ocupado', () => {
  const msg = interpretMitmStartupError('[MITM] Permission denied for port 443', 443)
  assert.match(msg, /permission/i)
  assert.doesNotMatch(msg, /in use/i)
})

test('cualquier otra línea [MITM] se publica tal cual, sin el marcador', () => {
  const msg = interpretMitmStartupError('ruido\n[MITM] ENOENT: server.key missing\nmás ruido', 8443)
  assert.match(msg, /ENOENT: server\.key missing/)
  assert.doesNotMatch(msg, /\[MITM\]/)
})

test('el mensaje de puerto ocupado respeta un puerto no por defecto', () => {
  assert.match(interpretMitmStartupError('[MITM] Port 8443 already in use', 8443), /8443/)
})

test('sin stderr capturado no culpa a un puerto', () => {
  const msg = interpretMitmStartupError('', 443)
  assert.doesNotMatch(msg, /in use/i)
  assert.match(msg, /failed to start/i)
})
