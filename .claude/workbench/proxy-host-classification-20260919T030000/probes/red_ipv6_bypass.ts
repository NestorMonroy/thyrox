// Mitad ROJA, persistida al producirse. Mide por CONDUCTA que shouldBypassProxy
// no reconoce IPv6 en NO_PROXY, en sus dos formas. No lee el docstring.
import { shouldBypassProxy } from '../../../../src/packages/provider/src/proxy.ts'

const casos: Array<[string, string, boolean, string]> = [
  ['http://[::1]:8080/x',        '::1',        true,  'literal IPv6 desnudo'],
  ['http://[fd00::1]:443/x',     'fd00::/8',   true,  'bloque CIDR IPv6 (ULA)'],
  ['http://[fe80::1]:443/x',     'fe80::/10',  true,  'bloque CIDR IPv6 (link-local)'],
  // Prefijo > 32, que es donde el tope de la version vieja mordia. Sin este
  // caso la guarda `maxPrefix` no estaba medida: su anulacion no hacia caer
  // ninguna asercion, que es el sub-patron D con mi propio control de sujeto.
  ['http://[fd12:3456:789a::1]/x', 'fd12:3456:789a::/48', true, 'CIDR IPv6 con prefijo > 32'],
  ['http://[fd99::1]/x',           'fd12:3456:789a::/48', false, 'CONTROL: prefijo > 32 discrimina'],
  ['http://127.0.0.1:8080/x',    '127.0.0.0/8', true, 'CONTROL IPv4: ya funciona'],
  // CONTROL negativo DENTRO de familia. El anterior era 'example.com' contra
  // '::1', que pasa bajo cualquier implementacion — rota o no — porque las dos
  // cadenas nunca se parecen. Este exige que el CIDR discrimine de verdad:
  // 2001:db8::/32 es documentacion publica, fd00::/8 es ULA privada.
  ['http://[2001:db8::1]/x',     'fd00::/8',   false, 'CONTROL en familia: CIDR discrimina'],
  ['http://example.com/x',       '::1',        false, 'CONTROL fuera de familia (debil)'],
]
let rojos = 0
for (const [url, noProxy, esperado, nota] of casos) {
  const real = shouldBypassProxy(url, noProxy)
  const veredicto = real === esperado ? 'ok  ' : 'ROJO'
  if (real !== esperado) rojos++
  console.log(`${veredicto} ${nota.padEnd(32)} NO_PROXY=${noProxy.padEnd(12)} -> ${real} (esperado ${esperado})`)
}
console.log(`\nrojos: ${rojos} de ${casos.length}`)
process.exit(rojos > 0 ? 1 : 0)
