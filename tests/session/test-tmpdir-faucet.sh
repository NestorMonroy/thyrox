#!/usr/bin/env bash
# El grifo de /tmp: una suite no deja su fixture en el directorio compartido.
#
# El defecto que mide, medido antes de escribirlo: 123 504 hijos directos de
# /tmp, de los cuales 105 715 son directorios de fixture que nuestras propias
# suites dejaron; `impact-*` solo aportaba 3408 copias del mismo repo sintetico
# (823 MB). El disco raiz quedo en 260 MB libres.
#
# La correccion NO edita las 56 suites que crean su directorio sin retirarlo:
# redirige `TMPDIR`, que las tres formas honran por construccion. Medido por
# conducta antes de elegir el camino:
#
#   TMPDIR=$P bun -e 'require("os").tmpdir()'   -> $P
#   TMPDIR=$P bun -e 'mkdtempSync(...)'         -> $P/probe-eRko7O
#   TMPDIR=$P mktemp -d                         -> $P/tmp.i9hxiou6n5
#
# Y el bypass esta medido en CERO en las tres superficies: ningun `.ts`, `.py`
# ni `.sh` del arbol crea bajo un literal `/tmp/` (los 33 `.ts` que lo mencionan
# son rutas sinteticas que nunca tocan el disco).
#
# El control positivo NO esta fabricado: es `impactCli.test.ts`, la suite real
# que dejo esas 3408 copias.
#
# Por que los casos 1 y 2 neutralizan `THYROX_TEST_TMPDIR`: bajo `tests/run.sh`
# la variable ya viene fijada, asi que sin neutralizarla los dos casos medirian
# la redireccion de la EJECUCION y no la del preload — el mismo verde con y sin
# `bunfig.toml`. Se aisla el sujeto, no se confia en el entorno del llamador.
set -uo pipefail
cd "$(dirname "$0")/../.."
RAIZ="$PWD"

SUJETO="src/packages/cli/__tests__/impactCli.test.ts"
PREFIJO="impact-"
PROPIO="thyrox-tests-"

fallos=0
aserciones=0

afirmar() {   # afirmar <descripcion> <esperado> <obtenido>
  aserciones=$((aserciones + 1))
  if [ "$2" = "$3" ]; then
    echo "  ok   $1"
  else
    echo "  FALLA $1 — esperado '$2', obtenido '$3'"
    fallos=$((fallos + 1))
  fi
}

contar_fixture() { ls -d /tmp/"$PREFIJO"?????? 2>/dev/null | wc -l; }
contar_propios() { ls -d /tmp/"$PROPIO"?????? 2>/dev/null | wc -l; }

# El sujeto, aislado del TMPDIR del llamador.
correr_sujeto_aislado() {
  env -u THYROX_TEST_TMPDIR TMPDIR=/tmp bun test "$SUJETO" >/dev/null 2>&1
}

# --- caso 1: la suite real NO deja fixture en /tmp -------------------------
echo "== caso 1: con el preload, la suite no deja fixture en /tmp =="
antes="$(contar_fixture)"
correr_sujeto_aislado
despues="$(contar_fixture)"
afirmar "delta de directorios $PREFIJO en /tmp" "0" "$((despues - antes))"

# --- caso 2: el preload RETIRA su propio directorio ------------------------
#
# La mitad que el caso 1 no ve, y que ya fallo una vez: con
# `process.on('exit')` el `TMPDIR` se redirigia —caso 1 en verde— y el
# directorio quedaba en disco con sus doce fixtures dentro. Medido: `bun test`
# no dispara `exit` ni `beforeExit`. Un caso 1 solo no distingue «el grifo
# cierra» de «el charco cambio de sitio».
echo "== caso 2: el preload retira su propio directorio al salir =="
antes="$(contar_propios)"
correr_sujeto_aislado
despues="$(contar_propios)"
afirmar "delta de directorios $PROPIO en /tmp" "0" "$((despues - antes))"

# --- caso 3: la anulacion — sin preload, el fixture reaparece --------------
#
# Es la mitad que discrimina. Un caso 1 en verde sin esta anulacion no
# distingue «el preload redirige» de «la suite dejo de crear directorios».
echo "== caso 3: anulacion — retirado el bunfig, el fixture vuelve a /tmp =="
if [ -f "$RAIZ/bunfig.toml" ]; then
  mv "$RAIZ/bunfig.toml" "$RAIZ/bunfig.toml.anulado"
  antes="$(contar_fixture)"
  correr_sujeto_aislado
  despues="$(contar_fixture)"
  mv "$RAIZ/bunfig.toml.anulado" "$RAIZ/bunfig.toml"
  creados=$((despues - antes))
  # Se retira lo que la anulacion dejo: el control no puede ensuciar lo que mide.
  if [ "$creados" -gt 0 ]; then
    ls -dt /tmp/"$PREFIJO"?????? 2>/dev/null | head -n "$creados" | xargs -r rm -rf
    afirmar "sin preload la suite SI deja fixture" "si" "si"
  else
    afirmar "sin preload la suite SI deja fixture" "si" "no ($creados)"
  fi
else
  afirmar "existe bunfig.toml con el preload" "si" "no"
fi

# --- caso 4: el preload NO retira un TMPDIR heredado -----------------------
#
# La guarda que impide el dano: si el llamador ya fijo `THYROX_TEST_TMPDIR`
# —lo hace `tests/run.sh` para toda la ejecucion— el preload lo hereda y NO lo
# retira al salir. Sin esta guarda, cada `bun test` de una ejecucion borraria el
# directorio de los demas.
echo "== caso 4: un TMPDIR heredado sobrevive al preload =="
heredado="$(mktemp -d)"
THYROX_TEST_TMPDIR="$heredado" TMPDIR="$heredado" \
  bun test "$SUJETO" >/dev/null 2>&1
if [ -d "$heredado" ]; then
  afirmar "el directorio heredado sigue existiendo" "si" "si"
else
  afirmar "el directorio heredado sigue existiendo" "si" "no"
fi
rm -rf "$heredado"

# --- caso 5: el fixture aterriza DENTRO del TMPDIR heredado ----------------
#
# Que el heredado sobreviva no prueba que la suite escribiera ahi: podria
# haber escrito en /tmp y el directorio seguir vacio. Este caso lo separa, y
# es el que cae si se anula la guarda de herencia del preload.
echo "== caso 5: el fixture aterriza dentro del TMPDIR heredado =="
heredado="$(mktemp -d)"
THYROX_TEST_TMPDIR="$heredado" TMPDIR="$heredado" \
  bun test "$SUJETO" >/dev/null 2>&1
dentro="$(ls -d "$heredado"/"$PREFIJO"?????? 2>/dev/null | wc -l)"
if [ "$dentro" -gt 0 ]; then
  afirmar "hay fixture dentro del heredado" "si" "si"
else
  afirmar "hay fixture dentro del heredado" "si" "no ($dentro)"
fi
rm -rf "$heredado"

echo
echo "== $aserciones asercion(es), $fallos en rojo =="
[ "$fallos" -eq 0 ] || exit 1
