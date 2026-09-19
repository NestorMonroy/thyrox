#!/usr/bin/env bash
# test-toolchain-proxy.sh — contrato de la sonda de COHERENCIA proxy/CA.
#
# Lo que mide NO es conducta de red. Una sonda que saliera a la red mediria
# ademas la disponibilidad del destino y la latencia, y su rojo no separaria
# «el entorno esta mal declarado» de «el destino esta caido»: seria el
# sub-patron D de `metrica-decide-la-conclusion.md` con la red como ruido.
#
# Mide COHERENCIA entre dos declaraciones que el operador hace por separado:
# hay proxy declarado, y ¿hay un CA que el consumidor de esa familia pueda
# leer? Un proxy que intercepta TLS sin CA legible rompe cada salida con un
# fallo de verificacion, y el remedio no es del proxy sino de la declaracion.
#
# El caso que DISCRIMINA es el 4: proxy declarado y CA ausente. Una
# implementacion que solo mirara «hay proxy» pasa los casos 1-3 y falla el 4.
# El 6 mide la otra mitad: SIN proxy declarado el veredicto es `ok`, nunca
# aviso — un aviso ahi entrenaria a ignorarlo, que es como una regla se
# vuelve ruido.
#
# El caso 7 mide que la sonda distingue la familia del consumidor: node lee
# NODE_EXTRA_CA_CERTS, python lee REQUESTS_CA_BUNDLE o SSL_CERT_FILE, curl
# lee CURL_CA_BUNDLE. Colapsarlas en una sola clave daria verde a un entorno
# donde node puede salir y python no.
#
# Ciega a: si el archivo de CA declarado CONTIENE el certificado del proxy —
# eso exige leer el PEM y compararlo con la cadena que el proxy presenta, que
# es conducta de red. Y ciega a un consumidor que lea una cuarta clave que
# este arbol no ha medido usar.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Un CA que EXISTE, para que el caso positivo no pase por la ausencia del
# archivo. `metrica-decide-la-conclusion.md` sub-patron D: un test negativo
# que apunta a algo inexistente lo rechaza la ausencia, no la guarda.
CA_REAL="$(mktemp)"; printf -- '-----BEGIN CERTIFICATE-----\n' > "$CA_REAL"
CA_AUSENTE="/no/existe/este/ca.crt"
trap 'rm -f "$CA_REAL"' EXIT

# Corre la sonda con un entorno declarado, sin heredar el de esta sesion.
correr() {
  env -i PATH="$PATH" HOME="$HOME" "$@" \
    bash -c 'source "$0" 2>/dev/null; thyrox_toolchain_probe_proxy' "$SUBJECT" 2>&1
}
codigo() {
  env -i PATH="$PATH" HOME="$HOME" "$@" \
    bash -c 'source "$0" 2>/dev/null; thyrox_toolchain_probe_proxy' "$SUBJECT" >/dev/null 2>&1
  echo $?
}

# Caso 1 — la pieza existe.
if type thyrox_toolchain_probe_proxy &>/dev/null; then
  ok "caso 1: thyrox_toolchain_probe_proxy esta definida"
else
  bad "caso 1: thyrox_toolchain_probe_proxy NO esta definida"
fi

# Caso 2 — esta exportada, como sus tres hermanas: el corredor de sondas la
# invoca desde un subshell que hace `source` de la biblioteca.
if grep -q '^export -f thyrox_toolchain_probe_proxy$' "$SUBJECT"; then
  ok "caso 2: la funcion se exporta"
else
  bad "caso 2: falta 'export -f thyrox_toolchain_probe_proxy'"
fi

# Caso 3 — proxy declarado CON un CA legible: pasa.
if [[ "$(codigo https_proxy=http://p:8080 SSL_CERT_FILE="$CA_REAL" \
                NODE_EXTRA_CA_CERTS="$CA_REAL" CURL_CA_BUNDLE="$CA_REAL")" == "0" ]]; then
  ok "caso 3: proxy + CA legible en las tres familias -> exit 0"
else
  bad "caso 3: proxy + CA legible deberia salir 0"
fi

# Caso 4 — EL QUE DISCRIMINA. Proxy declarado, ninguna clave de CA: avisa.
salida4="$(correr https_proxy=http://p:8080)"
if [[ "$(codigo https_proxy=http://p:8080)" == "1" ]]; then
  ok "caso 4: proxy sin ningun CA declarado -> exit 1"
else
  bad "caso 4: proxy sin CA deberia salir 1, salio $(codigo https_proxy=http://p:8080)"
fi

# Caso 5 — el aviso NOMBRA la familia sin CA. Un aviso que solo dijera «falta
# CA» manda a buscar cual de las tres claves, que es el trabajo que la sonda
# ya hizo.
if [[ "$salida4" == *"node"* && "$salida4" == *"python"* && "$salida4" == *"curl"* ]]; then
  ok "caso 5: el aviso nombra las tres familias sin CA"
else
  bad "caso 5: el aviso no nombra las tres familias — salida: $salida4"
fi

# Caso 6 — SIN proxy declarado el veredicto es ok, no aviso.
if [[ "$(codigo)" == "0" ]]; then
  ok "caso 6: sin proxy declarado -> exit 0, nunca aviso"
else
  bad "caso 6: sin proxy declarado deberia salir 0"
fi

# Caso 7 — las familias son INDEPENDIENTES: node con CA y python sin el avisa,
# y el aviso nombra python sin nombrar node.
salida7="$(correr https_proxy=http://p:8080 NODE_EXTRA_CA_CERTS="$CA_REAL" CURL_CA_BUNDLE="$CA_REAL")"
if [[ "$(codigo https_proxy=http://p:8080 NODE_EXTRA_CA_CERTS="$CA_REAL" \
                CURL_CA_BUNDLE="$CA_REAL")" == "1" \
      && "$salida7" == *"python"* && "$salida7" != *"node"* ]]; then
  ok "caso 7: una familia con CA y otra sin el se separan"
else
  bad "caso 7: las familias no se separan — salida: $salida7"
fi

# Caso 8 — el CA declarado pero AUSENTE en disco cuenta como sin CA. Declarar
# una ruta no es tenerla: es la misma distincion significante/significado que
# el resto del arbol aplica a una cifra.
if [[ "$(codigo https_proxy=http://p:8080 SSL_CERT_FILE="$CA_AUSENTE" \
                NODE_EXTRA_CA_CERTS="$CA_AUSENTE" CURL_CA_BUNDLE="$CA_AUSENTE")" == "1" ]]; then
  ok "caso 8: un CA declarado que no existe en disco no cuenta"
else
  bad "caso 8: un CA inexistente deberia avisar igual"
fi

# Caso 9 — las cuatro formas de declarar proxy disparan la sonda, no solo
# https_proxy. La minuscula y la MAYUSCULA son dos cajas distintas.
for clave in https_proxy HTTPS_PROXY http_proxy HTTP_PROXY; do
  if [[ "$(codigo "$clave"=http://p:8080)" == "1" ]]; then
    ok "caso 9/$clave: dispara la sonda"
  else
    bad "caso 9/$clave: NO dispara la sonda"
  fi
done

# Caso 10 — python admite DOS claves, y cualquiera de las dos basta.
if [[ "$(codigo https_proxy=http://p:8080 REQUESTS_CA_BUNDLE="$CA_REAL" \
                NODE_EXTRA_CA_CERTS="$CA_REAL" CURL_CA_BUNDLE="$CA_REAL")" == "0" ]]; then
  ok "caso 10: REQUESTS_CA_BUNDLE basta para python"
else
  bad "caso 10: REQUESTS_CA_BUNDLE deberia bastar para python"
fi

thyrox_summary
