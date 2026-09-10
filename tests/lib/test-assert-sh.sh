#!/usr/bin/env bash
# La biblioteca de asercion compartida, adaptada de la forma que VVV le da a
# `provision/provision-helpers.sh`.
#
# MITAD ROJA. El hueco medido en el corpus de thyrox, antes de escribir nada:
#
#   - 128 guiones de shell, 20 920 lineas.
#   - 28 de ellos definen su PROPIA asercion: 14 `check()`, 12 `ok()`,
#     1 `fallo()`, 1 `fail()`. Los 14 `check()` tienen ONCE cuerpos distintos
#     (md5 del bloque), asi que no es una copia: es once reinvenciones.
#   - `src/lib/logging.sh` existe, declara sus nueve funciones con exactitud, y
#     tiene CERO consumidores. Es capacidad muerta — y su causa es medible: al
#     sourcearse crea `logs/` y un archivo, asi que sourcearlo no es gratis.
#   - Los 74 guiones que si sourcean algo de `src/lib/` sourcean uno solo:
#     `reach.sh`. Ninguno sourcea `logging.sh`.
#
# De VVV se adaptan CUATRO mecanismos, no su contenido:
#
#   1. guard de doble inclusion   — `provisioners.sh:5-8` (`type X &>/dev/null`)
#   2. prefijo de namespace       — las 41 funciones llevan `vvv_`
#   3. `export -f` por funcion    — sobrevive a un subshell / `bash -c`
#   4. sed in-place con guardas   — `vvv_safe_sed`, `provision-helpers.sh:1009`
#
# Lo que NO se adapta, y es deliberado: el registro de hooks
# (`vvv_add_hook`/`vvv_hook`) es el mecanismo mas potente de VVV y hoy no tiene
# ningun consumidor aqui. Implementarlo seria repetir el defecto que
# `logging.sh` ya encarna — capacidad muerta. Queda como tarea con su condicion
# de cierre: un orquestador que necesite puntos de extension ordenados.
#
# CONTROL DE ANULACION declarado: si se retira el `export -f`, cae el caso 4 —y
# solo el 4—. Si se retira el guard de doble inclusion, cae el 5 —y solo el 5—.
# Cada mecanismo tiene un caso que lo mide en solitario; un verde global sin
# ellos no distinguiria «la biblioteca funciona» de «los mecanismos estan».
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LIB="${RAIZ}/src/lib/assert.sh"

OK=0; FALLOS=0
caso() {
  if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; OK=$((OK+1))
  else printf '  FALLO %s\n        esperado=[%s]\n        obtenido=[%s]\n' "$1" "$2" "$3"; FALLOS=$((FALLOS+1)); fi
}

echo "== 1. sourcear la biblioteca NO tiene efecto secundario en disco =="
# El defecto que dejo a logging.sh sin consumidores: sourcearlo crea un
# directorio y un archivo. Una biblioteca con efecto al importarse no se puede
# sourcear desde un gate ni desde un hook.
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
( cd "$TMP" && antes=$(find . | wc -l) \
  && source "$LIB" \
  && despues=$(find . | wc -l) \
  && [[ "$antes" == "$despues" ]] ) && r=limpio || r=escribio
caso "no crea nada al sourcearse" "limpio" "$r"

source "$LIB"

echo "== 2. la asercion publica su veredicto y lleva la cuenta =="
salida="$(thyrox_check "iguales" "a" "a" 2>&1)"
caso "un acierto dice ok"    "ok"    "$(echo "$salida" | awk '{print $1}')"
salida="$(thyrox_check "distintos" "a" "b" 2>&1)"
caso "un fallo dice FALLO"   "FALLO" "$(echo "$salida" | awk 'NR==1{print $1}')"

echo "== 3. el fallo publica AMBOS valores, no solo que fallo =="
salida="$(thyrox_check "distintos" "esperanza" "realidad" 2>&1)"
caso "cita el esperado" "1" "$(echo "$salida" | grep -c 'esperanza')"
caso "cita el obtenido" "1" "$(echo "$salida" | grep -c 'realidad')"

echo "== 4. export -f: la funcion sobrevive a un subshell =="
# VVV exporta cada helper porque sus provisioners se invocan con `bash $@` y
# `sudo -EH -u vagrant`, que son procesos nuevos. Aqui el caso real es un gate
# que se llama desde otro guion.
r="$(bash -c 'thyrox_check "desde subshell" x x' 2>&1 | awk '{print $1}')"
caso "thyrox_check existe en un bash hijo" "ok" "$r"

echo "== 5. guard de doble inclusion: sourcear dos veces es no-op =="
# CORREGIDO en el mismo pase. La primera version fijaba un testigo PROPIO y
# comprobaba que sobrevivia — pero ese testigo lo escribia el test, no la
# biblioteca, asi que sobrevivia con guard y sin el. Medido: retirando el
# guard, el caso seguia en verde. Era decorativo: el sub-patron D de
# `metrica-decide-la-conclusion.md` dentro del propio control.
#
# Lo que el guard protege de verdad son los CONTADORES de la biblioteca. Sin
# el, un guion que sourcea A y B —donde B tambien sourcea assert.sh— pierde la
# cuenta a mitad de suite y publica un total menor que los casos que corrio.
r="$(bash -c "
  source '$LIB'
  thyrox_check uno x x >/dev/null
  thyrox_check dos x x >/dev/null
  source '$LIB'          # el segundo source: el guard debe hacerlo no-op
  echo \$THYROX_OK
")"
caso "el segundo source no reinicia el contador" "2" "$r"

echo "== 6. el resumen publica su DENOMINADOR, no solo los fallos =="
# Un conteo sin denominador no es un resultado: con el alcance oculto, un
# instrumento ciego y uno correcto publican la misma cifra.
sub="$(bash -c "source '$LIB'; thyrox_check a x x; thyrox_check b x y; thyrox_summary" 2>&1 | tail -1)"
caso "nombra los dos"      "1" "$(echo "$sub" | grep -cE '2 (casos|aserciones)')"
caso "nombra el fallo"     "1" "$(echo "$sub" | grep -c '1 fallo')"

echo "== 7. safe_sed: in-place con guardas, no 'sed -i' a pelo =="
# Adaptado de vvv_safe_sed. Las tres guardas de la fuente: exige expresion y
# archivo, exige que el archivo exista, y escribe por temporal.
printf 'hola mundo\n' > "$TMP/f.txt"
thyrox_safe_sed 's/mundo/thyrox/' "$TMP/f.txt" >/dev/null 2>&1
caso "sustituye" "hola thyrox" "$(cat "$TMP/f.txt")"
thyrox_safe_sed 's/x/y/' "$TMP/no-existe.txt" >/dev/null 2>&1 && r=0 || r=$?
caso "rehusa ante archivo ausente" "1" "$r"
thyrox_safe_sed '' "$TMP/f.txt" >/dev/null 2>&1 && r=0 || r=$?
caso "rehusa sin expresion" "1" "$r"
# La guarda que la fuente NO tiene y aqui si: un sed que falla no debe dejar el
# archivo a medias. `vvv_safe_sed` ya lo cubre escribiendo por temporal; se mide.
thyrox_safe_sed 's/[/' "$TMP/f.txt" >/dev/null 2>&1 || true
caso "un sed invalido deja el archivo intacto" "hola thyrox" "$(cat "$TMP/f.txt")"

printf '\n%d ok, %d fallos\n' "$OK" "$FALLOS"
[[ "$FALLOS" -eq 0 ]]
