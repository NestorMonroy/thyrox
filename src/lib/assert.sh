#!/usr/bin/env bash
# =============================================================================
# assert.sh — el vocabulario de asercion compartido de thyrox
# =============================================================================
# Adaptado de la FORMA que VVV le da a `provision/provision-helpers.sh`
# (Varying Vagrant Vagrants, MIT). Se adapta el mecanismo, no el contenido:
# VVV provisiona WordPress y aqui no se provisiona nada.
#
# Los cuatro mecanismos que se toman, con su cita:
#
#   1. guard de doble inclusion — `vvv: provision/provisioners.sh:5-8`
#        `if ( type provisioner_begin &>/dev/null ); then return; fi`
#      Sourcear dos veces es no-op. Sin el, un guion que sourcea A y B —donde B
#      tambien sourcea A— reinicializa los contadores a mitad de suite.
#
#   2. prefijo de namespace — las 41 funciones de VVV llevan `vvv_`
#      Aqui `thyrox_`, que es el que `src/lib/reach.sh` ya usa (`thyrox_root`).
#      Sin prefijo, sourcear pisa el `check()` que el guion ya tenia y el
#      cambio de conducta es silencioso.
#
#   3. `export -f` por funcion — VVV lo hace en las 41
#      Sus provisioners se invocan con `bash $@` y `sudo -EH -u vagrant`, que
#      son procesos nuevos. Aqui el caso real es un gate llamado desde otro
#      guion.
#
#   4. sed in-place con guardas — `vvv: provision/provision-helpers.sh:1009`
#      (`vvv_safe_sed`): exige expresion y archivo, exige que el archivo
#      exista, y escribe por temporal para que un sed fallido no deje el
#      archivo a medias.
#
# Lo que NO se adapta, y es deliberado: el registro de hooks de VVV
# (`vvv_add_hook`/`vvv_hook`, `provision-helpers.sh:533-627`) es su mecanismo
# mas potente —extension por nombre con prioridad numerica, sin editar el
# orquestador— y hoy no tiene ningun consumidor aqui. Implementarlo repetiria
# el defecto que `src/lib/logging.sh` ya encarna: nueve funciones correctas y
# CERO consumidores. Queda con su condicion de cierre declarada.
#
# El hueco que esta biblioteca cierra, medido antes de escribirla: de 128
# guiones de shell, 28 definen su propia asercion —14 `check()`, 12 `ok()`,
# 1 `fallo()`, 1 `fail()`— y los 14 `check()` tienen ONCE cuerpos distintos.
# No es una copia propagada: son once reinvenciones del mismo verbo.
#
# NO tiene efecto secundario al sourcearse. Es la causa medible de que
# `logging.sh` no la use nadie: crea `logs/` y un archivo con solo importarlo,
# asi que no se puede sourcear desde un gate ni desde un hook.
# =============================================================================

# (1) Guard de doble inclusion — la forma de `vvv: provisioners.sh:5-8`.
if type thyrox_check &>/dev/null; then
  return 0 2>/dev/null || true
fi

# El color se apaga si la salida no es un terminal: un log con \033[..] es
# ilegible, y la salida de estos guiones la lee un gate tanto como una persona.
if [[ -t 1 ]]; then
  _THYROX_VERDE=$'\033[0;32m'; _THYROX_ROJO=$'\033[0;31m'; _THYROX_NEUTRO=$'\033[0m'
else
  _THYROX_VERDE=""; _THYROX_ROJO=""; _THYROX_NEUTRO=""
fi

THYROX_OK=0
THYROX_FALLOS=0

# @description Compara dos valores y publica el veredicto con AMBOS.
# @arg $1 string etiqueta del caso
# @arg $2 string valor esperado
# @arg $3 string valor obtenido
thyrox_check() {
  local etiqueta="${1:-}" esperado="${2:-}" obtenido="${3:-}"
  if [[ "${esperado}" == "${obtenido}" ]]; then
    printf '  %sok%s    %s\n' "${_THYROX_VERDE}" "${_THYROX_NEUTRO}" "${etiqueta}"
    THYROX_OK=$((THYROX_OK + 1))
    return 0
  fi
  # Los dos valores van SIEMPRE. Un «FALLO» a secas obliga a reproducir el
  # caso a mano para saber que se obtuvo, que es el coste que este formato
  # ahorra en cada rojo.
  printf '  %sFALLO%s %s\n        esperado=[%s]\n        obtenido=[%s]\n' \
    "${_THYROX_ROJO}" "${_THYROX_NEUTRO}" "${etiqueta}" "${esperado}" "${obtenido}"
  THYROX_FALLOS=$((THYROX_FALLOS + 1))
  return 1
}
export -f thyrox_check

# @description Registra un acierto que no nace de una comparacion.
thyrox_ok() {
  printf '  %sok%s    %s\n' "${_THYROX_VERDE}" "${_THYROX_NEUTRO}" "${1:-}"
  THYROX_OK=$((THYROX_OK + 1))
}
export -f thyrox_ok

# @description Registra un fallo que no nace de una comparacion.
thyrox_fail() {
  printf '  %sFALLO%s %s\n' "${_THYROX_ROJO}" "${_THYROX_NEUTRO}" "${1:-}"
  THYROX_FALLOS=$((THYROX_FALLOS + 1))
  return 1
}
export -f thyrox_fail

# @description Publica el resumen CON su denominador y fija el codigo de salida.
#
# El denominador no es cosmetico: un conteo de fallos sin el no distingue «0
# fallos sobre 40 casos» de «0 fallos porque el guion no llego a correr
# ninguno». Es el mismo criterio con que los gates publican su alcance medido.
thyrox_summary() {
  local total=$((THYROX_OK + THYROX_FALLOS))
  printf '\n%d casos: %d ok, %d fallos\n' "${total}" "${THYROX_OK}" "${THYROX_FALLOS}"
  [[ "${THYROX_FALLOS}" -eq 0 ]]
}
export -f thyrox_summary

# @description sed in-place con guardas — adaptado de `vvv_safe_sed`
#   (`vvv: provision/provision-helpers.sh:1009-1043`).
#
# `sed -i` a pelo tiene dos defectos que esta forma cierra: reescribe el
# archivo aunque la expresion sea invalida, y falla ante un archivo cuyo
# directorio no admite el temporal que `sed -i` crea al lado. Escribir por un
# temporal propio y volcar con `cat >` conserva el inodo y sus permisos.
#
# @arg $1 string la expresion sed
# @arg $2 string el archivo
thyrox_safe_sed() {
  local expresion="${1:-}" archivo="${2:-}" temporal

  if [[ -z "${expresion}" || -z "${archivo}" ]]; then
    printf '%sthyrox_safe_sed%s: se exigen expresion y archivo\n' \
      "${_THYROX_ROJO}" "${_THYROX_NEUTRO}" >&2
    return 1
  fi
  if [[ ! -f "${archivo}" ]]; then
    printf '%sthyrox_safe_sed%s: el archivo «%s» no existe\n' \
      "${_THYROX_ROJO}" "${_THYROX_NEUTRO}" "${archivo}" >&2
    return 1
  fi

  temporal="$(mktemp "${archivo}.sed.XXXXXX")" || {
    printf '%sthyrox_safe_sed%s: no se pudo crear el temporal\n' \
      "${_THYROX_ROJO}" "${_THYROX_NEUTRO}" >&2
    return 1
  }

  if ! sed "${expresion}" "${archivo}" > "${temporal}" 2>/dev/null; then
    rm -f "${temporal}"
    printf '%sthyrox_safe_sed%s: sed fallo; «%s» queda intacto\n' \
      "${_THYROX_ROJO}" "${_THYROX_NEUTRO}" "${archivo}" >&2
    return 1
  fi

  if ! cat "${temporal}" > "${archivo}"; then
    rm -f "${temporal}"
    printf '%sthyrox_safe_sed%s: no se pudo volcar sobre «%s»\n' \
      "${_THYROX_ROJO}" "${_THYROX_NEUTRO}" "${archivo}" >&2
    return 1
  fi

  rm -f "${temporal}"
  return 0
}
export -f thyrox_safe_sed
