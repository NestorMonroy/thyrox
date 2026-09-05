#!/bin/bash
# =============================================================================
# test-hallazgo-sucesor.sh — prueba del gate de `hallazgo-abierto-genera-sucesor`
# =============================================================================
#
# El gate ha fallado SEIS veces por su instrumento —sus propios comentarios las
# enumeran— y no tenía suite. Ésta la construye, y su control positivo es **real
# del repo**: los dos hallazgos que el gate marcaba el 2026-08-27 declarando
# «Nada abierto» bajo su sección canónica. Un incumplidor escrito a mano por
# quien escribió el patrón hereda su encuadre y confirma el instrumento en vez
# de probarlo.
#
# El gate no acepta rutas: opera sobre `source/gestion/pm/*/iniciativas/*/hallazgos/`
# desde la raíz del repo git. Por eso cada caso monta un árbol sintético con su
# propio `git init` y corre el gate ahí — el árbol real queda intacto.
#
# Uso:  bash .claude/scripts/tests/test-hallazgo-sucesor.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
SUT="$SCRIPT_DIR/gates/check-hallazgo-sucesor.sh"

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

# Monta un árbol sintético con UN hallazgo y devuelve su raíz.
montar() {   # $1 = contenido del hallazgo
  local d; d=$(mktemp -d)
  mkdir -p "$d/source/gestion/pm/docs/iniciativas/x/hallazgos"
  printf '%s' "$1" > "$d/source/gestion/pm/docs/iniciativas/x/hallazgos/hallazgo-H-DOCS-1-caso.rst"
  git -C "$d" init -q
  echo "$d"
}

correr() {   # $1 = raíz;  imprime el conteo de --quiet
  ( cd "$1" && bash "$SUT" --quiet 2>/dev/null )
}

echo "test-hallazgo-sucesor"

# --- Caso 1: control positivo REAL — sección canónica cuya respuesta es «Nada
#     abierto», en un párrafo aparte. Es un CIERRE, no una apertura.
REAL=$(sed -n '/^Lo que este hallazgo no cierra/,$p' \
  "$REPO/source/gestion/pm/docs/iniciativas/unificar-trabajo-en-rama-kaupamex-l1/hallazgos/hallazgo-H-DOCS-439-el-valor-por-omision-se-ataba-como-declaracion.rst")
D=$(montar ".. meta::
   :estado: resuelto

H-DOCS-1 — caso
===============

- **Estado:** RESUELTO

$REAL")
check "cierre en parrafo aparte NO cuenta como apertura" "0" "$(correr "$D")"
rm -rf "$D"

# --- Caso 2: control negativo — la misma sección, con contenido que SÍ abre y
#     sin sucesor. El gate tiene que seguir viéndolo.
D=$(montar ".. meta::
   :estado: resuelto

H-DOCS-1 — caso
===============

- **Estado:** RESUELTO

Lo que este hallazgo no cierra
-------------------------------

El barrido del resto del árbol queda pendiente y nadie lo tiene asignado.")
check "apertura real sin sucesor SI se marca" "1" "$(correr "$D")"
rm -rf "$D"

# --- Caso 3: la misma apertura, con sucesor citado.
D=$(montar ".. meta::
   :estado: resuelto

H-DOCS-1 — caso
===============

- **Estado:** RESUELTO

Lo que este hallazgo no cierra
-------------------------------

El barrido del resto del árbol queda pendiente. Sucesor: tarea **#910**.")
check "apertura con #NNN no se marca" "0" "$(correr "$D")"
rm -rf "$D"

# --- Caso 4: la forma inline que el sexto arreglo introdujo sigue descontándose.
D=$(montar ".. meta::
   :estado: resuelto

H-DOCS-1 — caso
===============

- **Estado:** RESUELTO

**Lo que este hallazgo no cierra:** nada del alcance declarado.")
check "cierre inline sigue descontandose" "0" "$(correr "$D")"
rm -rf "$D"

# --- Caso 5: el estado estructural manda — `documentado` sin sucesor se marca
#     aunque la prosa no abra nada.
D=$(montar ".. meta::
   :estado: documentado

H-DOCS-1 — caso
===============

- **Estado:** DOCUMENTADO")
check "estado documentado sin sucesor SI se marca" "1" "$(correr "$D")"
rm -rf "$D"

# --- Caso 6: sin árbol que medir el gate NO sale verde — sale 2 y lo dice.
D=$(mktemp -d); git -C "$D" init -q
( cd "$D" && bash "$SUT" >/dev/null 2>&1 ); EC=$?
check "sin arbol que medir sale 2, no 0" "2" "$EC"
rm -rf "$D"

# --- Caso 7: el reporte publica su denominador.
DEN=$(cd "$REPO" && bash "$SUT" 2>/dev/null | grep -cE 'alcance medido: [0-9]+ de [0-9]+')
check "el reporte publica su denominador" "1" "$DEN"

# --- Caso 8: control positivo REAL — un hallazgo del repo que cita SÓLO la
#     forma durable `TASK-<CAPA>-NNNN`, sin ningún `#NNN`. El gate lo marcaba
#     como incumplidor: era ciego justo a la cita mejor. Se toma su sección de
#     apertura y su cita del archivo real, no de un texto fabricado.
FUENTE="$REPO/source/gestion/pm/docs/iniciativas/construir-harness-propio/hallazgos/hallazgo-H-DOCS-1061-pushe-al-mismo-repo-y-el-amend-del-agente-reescribio-mi-commit.rst"
check "el control positivo real NO cita ningun #NNN" "0" \
  "$(grep -cE '#[0-9]+|T-[0-9]{3}|sub-iniciativa|DESCONOCIDO' "$FUENTE")"
D=$(montar "$(cat "$FUENTE")")
check "cita TASK-<CAPA>-NNNN cuenta como sucesor" "0" "$(correr "$D")"
rm -rf "$D"

# --- Caso 9: el guard de compilación DISCRIMINA. Con un `awk` que revienta —el
#     defecto octavo, mawk 1.3.4 ante un intervalo seguido de grupo— el gate NO
#     puede salir 0: tiene que rehusar con exit 2 y sin cifra. Sin este control,
#     un patrón que no compila deja el conteo en 0 y se lee como salud.
#
#     El stub reproduce la conducta real: mensaje a stderr y exit 100.
STUB=$(mktemp -d)
printf '#!/bin/sh\necho "REcompile() - panic:  values still on machine stack" >&2\nexit 100\n' > "$STUB/awk"
chmod +x "$STUB/awk"
D=$(montar ".. meta::
   :estado: resuelto

H-DOCS-1 — caso
===============

- **Estado:** RESUELTO")
SALIDA=$( cd "$D" && PATH="$STUB:$PATH" bash "$SUT" --quiet 2>/dev/null ); EC=$?
check "con awk que no compila el gate sale 2" "2" "$EC"
check "y NO emite cifra alguna"              ""  "$SALIDA"
rm -rf "$D" "$STUB"

echo ""
echo "test-hallazgo-sucesor: $PASS ok, $FAIL falla(s) — $(( PASS + FAIL )) aserciones"
[[ "$FAIL" -eq 0 ]] || exit 1
