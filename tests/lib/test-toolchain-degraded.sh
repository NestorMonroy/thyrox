#!/usr/bin/env bash
# test-toolchain-degraded.sh — contrato del aviso degradado y de las dos
# sondas que `check-toolchain-ready` no tenia: el lector de SQLite y bun.
#
# El defecto que cierra lo nombro el ejecutor: quien clona el repositorio no
# tiene como saber QUE herramientas externas usa thyrox ni si las suyas
# sirven. Hoy `PROBES` declara cuatro —awk, parallel, python del proveedor,
# proxy— y el arbol depende ademas de dos que nadie interroga.
#
# Cual de las dos es cual se MIDIO antes de escribir esto, y el resultado
# invierte lo que el nombre sugiere:
#
#   ================================  =========  ==================================
#   Candidato                         Consumidores  Veredicto
#   ================================  =========  ==================================
#   CLI `sqlite3`                     0          NO es dependencia. Sondearlo daria
#                                                rojo sobre una via que nadie usa.
#   modulo `sqlite3` de Python        55         SI lo es: es como se abre el store.
#   `bun` / `bunx` como comando       55         SI lo es: 14 entrypoints .ts.
#   ================================  =========  ==================================
#
# Por eso la sonda se llama `require_sqlite_reader` y no `require_sqlite3`: el
# sujeto es la CAPACIDAD DE LEER el store, no un binario con ese nombre. En
# este contenedor el CLI esta AUSENTE y el store se abre sin problema — un
# guard sobre el CLI habria publicado rojo con el arbol sano.
#
# El aviso degradado es la forma que el ejecutor fijo verbatim:
#
#   IMPORTANT si desea usar <A> es necesario corregir <B> por el momento,
#   continua sin usar <A>
#
# Su valor es que NOMBRA las dos mitades —la herramienta y su precondicion— y
# declara que el resto sigue usable. Un «falta bun» a secas deja al que clona
# sin saber ni que arreglar ni que puede seguir haciendo.
#
# Ciega a: que la herramienta presente sea la VERSION que el arbol necesita.
# Las sondas miden que resuelva y que conteste, no su version; un bun 0.x que
# arrancara pasaria. Y ciega a toda herramienta que ningun consumidor invoque
# todavia — el universo son los cuatro de PROBES mas estos dos, no «todo lo
# que un shell trae».
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — las tres piezas existen.
faltan=()
for fn in thyrox_toolchain_degraded_notice \
          thyrox_toolchain_require_sqlite_reader \
          thyrox_toolchain_require_bun; do
  type "$fn" &>/dev/null || faltan+=("$fn")
done
if [[ ${#faltan[@]} -eq 0 ]]; then
  ok "las tres piezas existen en la biblioteca"
else
  bad "faltan en $SUBJECT: ${faltan[*]}"
  thyrox_summary; exit 1
fi

# --------------------------------------------------------------------------
# El aviso degradado: forma exacta, y las dos mitades sustituidas.
# --------------------------------------------------------------------------

# Caso 2 — lleva el prefijo IMPORTANT, que es lo que lo hace greppeable.
aviso="$(thyrox_toolchain_degraded_notice "los 14 entrypoints .ts" "cd \$THYROX_ROOT && bun install")"
if [[ "$aviso" == IMPORTANT\ * ]]; then
  ok "el aviso abre con IMPORTANT"
else
  bad "no abre con IMPORTANT: $aviso"
fi

# Caso 3 — nombra la HERRAMIENTA dos veces: al pedirla y al decir que se sigue
# sin ella. Es la mitad que un «falta X» pierde.
apariciones="$(printf '%s' "$aviso" | grep -o 'los 14 entrypoints \.ts' | wc -l)"
if [[ "$apariciones" -eq 2 ]]; then
  ok "nombra la herramienta dos veces (al pedirla y al seguir sin ella)"
else
  bad "esperaba 2 apariciones de la herramienta, dio $apariciones: $aviso"
fi

# Caso 4 — nombra la PRECONDICION, que es el remedio accionable.
if [[ "$aviso" == *"bun install"* ]]; then
  ok "nombra la precondicion a corregir"
else
  bad "no nombra la precondicion: $aviso"
fi

# Caso 5 — declara que se CONTINUA. Sin esta mitad el aviso se lee como un
# rehuse, que es justo lo contrario de lo que el ejecutor pidio.
if [[ "$aviso" == *"continua sin usar"* ]]; then
  ok "declara que se continua sin la herramienta"
else
  bad "no declara la continuacion: $aviso"
fi

# Caso 6 — DISCRIMINA: dos herramientas distintas dan avisos distintos. Una
# implementacion que devolviera una constante pasa los casos 2-5 y falla este.
otro="$(thyrox_toolchain_degraded_notice "el pool acotado" "instalar parallel")"
if [[ "$otro" != "$aviso" && "$otro" == *"el pool acotado"* ]]; then
  ok "el aviso varia con sus argumentos — no es una constante"
else
  bad "el aviso no discrimina entre herramientas"
fi

# Caso 7 — rehusa sin argumentos, en vez de emitir una linea con huecos.
sin_args="$(thyrox_toolchain_degraded_notice 2>&1)"; rc=$?
if [[ $rc -ne 0 ]]; then
  ok "rehusa sin argumentos (exit $rc)"
else
  bad "emitio un aviso sin argumentos: $sin_args"
fi

# --------------------------------------------------------------------------
# Sonda del lector de SQLite. El sujeto es la CAPACIDAD, no el binario.
# --------------------------------------------------------------------------

# Caso 8 — sobre este arbol pasa. Es el control positivo, y no es fabricado:
# el CLI `sqlite3` esta AUSENTE en este contenedor y el store se abre igual.
if thyrox_toolchain_require_sqlite_reader >/dev/null 2>&1; then
  ok "el lector de SQLite resuelve en este arbol (con el CLI ausente)"
else
  bad "la sonda rehusa y el store SI se abre — mide el binario, no la capacidad"
fi

# Caso 9 — apuntada a un interprete que no existe, REHUSA con exit 2 y sin
# conteo: un cero ahi no distinguiria «no hay lector» de «no pude medir».
falso="$ROOT/no-existe-este-interprete-$$"
salida="$(THYROX_TOOLCHAIN_PYTHON_BIN="$falso" thyrox_toolchain_require_sqlite_reader 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "rehusa con exit 2 cuando el interprete no resuelve"
else
  bad "esperaba exit 2 con interprete ausente, dio $rc: $salida"
fi

# Caso 10 — y su rechazo trae el aviso degradado, no un mensaje suelto.
if [[ "$salida" == *IMPORTANT* ]]; then
  ok "el rechazo del lector emite el aviso degradado"
else
  bad "el rechazo no trae IMPORTANT: $salida"
fi

# --------------------------------------------------------------------------
# Sonda de bun. DOS ejes, como awk: presencia y node_modules materializado.
# --------------------------------------------------------------------------

# Caso 11 — ausente: rehusa nombrando la instalacion, no `bun install`.
bun_falso="thyrox-bun-que-no-existe-$$"
salida_bun="$(THYROX_TOOLCHAIN_BUN_BIN="$bun_falso" thyrox_toolchain_require_bun 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$salida_bun" == *IMPORTANT* ]]; then
  ok "bun ausente: rehusa con 2 y emite el aviso degradado"
else
  bad "bun ausente dio rc=$rc: $salida_bun"
fi

# Caso 12 — EJE 2, y es el que DISCRIMINA: bun presente y `node_modules`
# ausente. Una sonda que midiera solo presencia pasa este caso con los 14
# entrypoints .ts igual de muertos —el sub-patron C otra vez—.
vacio="$(mktemp -d)"
salida_nm="$(THYROX_TOOLCHAIN_NODE_MODULES_HOME="$vacio" thyrox_toolchain_require_bun 2>&1)"; rc=$?
rmdir "$vacio" 2>/dev/null || true
if [[ $rc -eq 2 && "$salida_nm" == *"bun install"* ]]; then
  ok "bun presente sin node_modules: rehusa nombrando bun install"
else
  bad "no vio el node_modules ausente (rc=$rc): $salida_nm"
fi

# Caso 13 — sobre este arbol, con node_modules materializado, pasa.
if thyrox_toolchain_require_bun >/dev/null 2>&1; then
  ok "bun resuelve en este arbol con node_modules materializado"
else
  bad "rehusa con bun 1.3.x presente y node_modules poblado"
fi

thyrox_summary
