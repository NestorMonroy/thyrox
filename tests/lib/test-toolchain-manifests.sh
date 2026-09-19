#!/usr/bin/env bash
# test-toolchain-manifests.sh — contrato de la sonda de MANIFIESTOS.
#
# El defecto que cierra. Las seis sondas anteriores del preflight miden
# EFECTO: responde el interprete, esta poblado node_modules, compila el awk.
# Ninguna mira el SIGNIFICANTE que lo declara — los seis manifiestos del
# arbol. Un clon donde `pyproject.toml` falte o este corrupto publica
# «error · python-proveedor» y manda a correr `uv sync`, que va a fallar por
# otra causa y con otro mensaje. El operador persigue el sintoma.
#
# Y el episodio que lo origina es de este mismo turno: se publico «numpy no
# esta instalado» sin medir que **no esta declarado**. Las dos afirmaciones
# son distintas y solo la segunda explica la primera. Por eso la sonda tiene
# DOS ejes y no uno.
#
# El caso que DISCRIMINA es el 6: un manifiesto PRESENTE pero ilegible. Una
# sonda que midiera solo `test -e` pasa en verde con el arbol igual de roto.
#
# Ciega a: que el contenido del manifiesto sea VALIDO. La sonda mide que el
# archivo este y se pueda leer, no que su TOML o su JSON parseen — eso lo
# dira la herramienta que lo consuma, con su propio mensaje, y duplicarlo
# aqui seria una segunda fuente de verdad sobre la sintaxis de un formato
# que no es nuestro.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — las dos piezas existen: los manifiestos y el paquete declarado.
if type thyrox_toolchain_require_manifests &>/dev/null \
   && type thyrox_toolchain_python_package_declared &>/dev/null; then
  ok "las dos sondas existen"
else
  bad "faltan require_manifests / python_package_declared en $SUBJECT"
  thyrox_summary; exit 1
fi

# Caso 2 — sobre ESTE arbol pasan. Es el control que separa «el mecanismo
# funciona» de «el mecanismo rehusa siempre».
if thyrox_toolchain_require_manifests >/dev/null 2>&1; then
  ok "los seis manifiestos de este arbol estan y se leen"
else
  bad "rehusa sobre el arbol real: $(thyrox_toolchain_require_manifests 2>&1 | head -3)"
fi

# Caso 3 — un manifiesto de la clase ERROR ausente rehusa con exit 2.
TREE="$(mktemp -d)"
trap 'rm -rf "$TREE"' EXIT
for name in uv.lock tsconfig.json package.json bunfig.toml bun.lock; do
  printf '{}\n' > "$TREE/$name"
done
missing_out="$(THYROX_ROOT="$TREE" thyrox_toolchain_require_manifests 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un manifiesto obligatorio ausente rehusa con exit 2"
else
  bad "esperaba exit 2 sin pyproject.toml, dio $rc"
fi

# Caso 4 — y lo NOMBRA. El codigo de salida por si solo no dice cual falta,
# y son seis: mandar a mirar «los manifiestos» no es un remedio.
if [[ "$missing_out" == *pyproject.toml* ]]; then
  ok "el rechazo nombra el manifiesto que falta"
else
  bad "no nombra pyproject.toml: '$missing_out'"
fi

# Caso 5 — un manifiesto de la clase AVISO ausente NO rehusa: el lock se
# regenera. Sin esta mitad, la sonda trataria los seis igual y un clon sin
# `bun.lock` —perfectamente instalable— quedaria bloqueado.
printf '[project]\nname = "x"\n' > "$TREE/pyproject.toml"
rm -f "$TREE/bun.lock"
lock_out="$(THYROX_ROOT="$TREE" thyrox_toolchain_require_manifests 2>&1)"; rc=$?
if [[ $rc -eq 0 ]]; then
  ok "un lock ausente no rehusa: se regenera"
else
  bad "bloqueo por un lock ausente (rc=$rc): $lock_out"
fi
if [[ "$lock_out" == *bun.lock* ]]; then
  ok "pero lo nombra igual, como aviso"
else
  bad "el lock ausente pasa en SILENCIO: '$lock_out'"
fi

# Caso 6 — EL QUE DISCRIMINA. Presente pero ILEGIBLE. Una sonda de `test -e`
# pasa aqui con el arbol igual de roto.
#
# El permiso NO se puede medir en proceso cuando la suite corre como root:
# root ignora el control de acceso discrecional, asi que un archivo en modo
# 000 le sigue siendo legible y el caso publicaria verde sin haber medido
# nada — el sub-patron D con este propio control como sujeto. La salida es
# BAJAR el privilegio para la medicion, no declararla imposible: `setpriv`
# corre la sonda como un usuario sin privilegio, que es el unico contexto
# donde el modo 000 significa lo que dice.
printf '{}\n' > "$TREE/bun.lock"
chmod 755 "$TREE"          # el usuario sin privilegio tiene que poder entrar
chmod 000 "$TREE/tsconfig.json"

# El invocador de la sonda, ya resuelto: en proceso si el permiso discrimina
# para este usuario, y bajo privilegio caido si no.
probe_manifests() {
  if [[ ! -r "$TREE/tsconfig.json" ]]; then
    THYROX_ROOT="$TREE" thyrox_toolchain_require_manifests 2>&1
    return $?
  fi
  command -v setpriv >/dev/null 2>&1 || return 111
  setpriv --reuid=65534 --regid=65534 --clear-groups \
    bash -c 'source "$1" 2>/dev/null || exit 111
             THYROX_ROOT="$2" thyrox_toolchain_require_manifests 2>&1' \
    _ "$SUBJECT" "$TREE"
}

unreadable_out="$(probe_manifests)"; rc=$?
if [[ $rc -eq 111 ]]; then
  bad "SIN MEDIR el caso ilegible: este usuario lee el modo 000 y no hay setpriv"
elif [[ $rc -eq 2 && "$unreadable_out" == *tsconfig.json* ]]; then
  ok "un manifiesto presente e ilegible rehusa y lo nombra"
else
  bad "no vio el ilegible (rc=$rc): '$unreadable_out'"
fi
chmod 644 "$TREE/tsconfig.json" 2>/dev/null || true

# Caso 7 — el rechazo NO emite conteo. Un cero aqui seria un verde falso.
residue="${missing_out//pyproject.toml/}"
if [[ "$residue" =~ [0-9] ]]; then
  bad "el rechazo emite una cifra y no debe: '$residue'"
else
  ok "el rechazo no emite ningun conteo"
fi

# --------------------------------------------------------------------------
# EJE 2 — lo declarado, que es otra pregunta que lo instalado.
# --------------------------------------------------------------------------

# Caso 8 — un paquete declarado en este arbol se ve.
if thyrox_toolchain_python_package_declared docutils; then
  ok "ve un paquete declarado en [project.dependencies]"
else
  bad "no ve docutils, que si esta declarado"
fi

# Caso 9 — y uno que no esta declarado, no.
if ! thyrox_toolchain_python_package_declared thyrox-paquete-que-no-existe; then
  ok "y no ve uno que no esta declarado"
else
  bad "afirma ver un paquete inventado"
fi

# Caso 10 — EL QUE DISCRIMINA el eje 2: el guion del nombre. `uv` normaliza
# `spacy-lookups-data` y `spacy_lookups_data` al MISMO paquete (PEP 503), asi
# que una comparacion de cadena cruda publica «no declarado» sobre uno que
# si lo esta — el falso positivo que el censo de imports de este turno
# produjo, con el propio instrumento como sujeto.
if thyrox_toolchain_python_package_declared spacy_lookups_data; then
  ok "normaliza guion bajo contra guion medio, como PEP 503"
else
  bad "el guion bajo no resuelve al mismo paquete: compara cadenas crudas"
fi

# Caso 11 — rehusa con exit 2 si no puede LEER el manifiesto, en vez de
# responder «no declarado». Un no aqui no distingue «no esta» de «no pude
# mirar», que es el sub-patron D con esta sonda como sujeto.
declared_rc=0
THYROX_ROOT="/thyrox-raiz-que-no-existe-$$" \
  thyrox_toolchain_python_package_declared docutils >/dev/null 2>&1 || declared_rc=$?
if [[ $declared_rc -eq 2 ]]; then
  ok "sin manifiesto legible rehusa con 2, no responde «no declarado»"
else
  bad "esperaba exit 2 sin manifiesto, dio $declared_rc"
fi

thyrox_summary
