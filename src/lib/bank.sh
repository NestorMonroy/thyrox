#!/usr/bin/env bash
# =============================================================================
# bank.sh — el archivo de trabajo nace DENTRO del banco, no en /tmp
# =============================================================================
# Hermano de `assert.sh`, que ya adaptó de VVV el guard de doble inclusión, el
# prefijo de namespace, el `export -f` por función y el sed con guardas. Aquí va
# UNO más, con su consumidor medido — no por completitud del catálogo:
#
# `thyrox_work_file` <- la RAZÓN de `log_to_file` de VVV, no su forma.
#      VVV lo usa para que la salida de un provisioner sobreviva a la consola;
#      aquí el defecto medido es otro y peor: un archivo de trabajo —el mensaje
#      de un commit, la salida de una sonda— escrito en `/tmp` o en `/dev/shm`
#      muere con el contenedor, y con él la única pista de qué se hizo. Ocurrió
#      en esta sesión: un puntero en `/dev/shm` que ninguna otra sesión podía
#      leer. El mecanismo no es «un directorio mejor»: es que el archivo nazca
#      DENTRO del banco de trabajo, que es territorio versionable.
#
# Lo que NO se porta, y sigue declarado:
#
# - `cmd_exists` con su caché. Se escribió y se retiró en el mismo pase: su
#   único consumidor posible es `src/lib/reach.sh`, que es el bootstrap y tiene
#   que seguir siendo autocontenido —sourcear otra biblioteca desde él invierte
#   la dependencia—. Dejarlo habría repetido el defecto que `assert.sh` nombra
#   en `logging.sh`: funciones correctas y cero consumidores.
# - El registro de hooks (`vvv_add_hook`/`vvv_hook`), por la razón que
#   `assert.sh` ya escribió, y porque su contraparte TypeScript sí existe
#   (`runHooks`).
# - La familia `vvv_apt_*`, `vvv_maybe_install_nginx_config`, `vvv_get_sites`:
#   son el DOMINIO de VVV, no su mecanismo.
# =============================================================================

# Guard de doble inclusión — `vvv: provision/provisioners.sh:5-8`.
[[ -n "${THYROX_BANK_SH_LOADED:-}" ]] && return 0
THYROX_BANK_SH_LOADED=1

# @description La ruta de un archivo de trabajo DENTRO del banco, no en /tmp.
#
# Imprime la ruta y crea su directorio; no crea el archivo — quien lo escriba
# decide si es un heredoc, un volcado o una redirección.
#
# El banco se pasa como argumento y no se adivina: un mecanismo que compusiera
# el hogar por `cwd` escribiría en el árbol equivocado cuando lo invoca un
# guion de otro clon, que es el defecto que `consumer_root` ya registró.
#
# REHÚSA si el banco no existe, en vez de crearlo: un banco es un artefacto con
# manifiesto, y fabricarlo aquí produciría uno sin las cinco claves — un
# directorio que el gate reporta como no conforme y que nadie pidió.
#
# @arg $1 string la ruta del banco de trabajo
# @arg $2 string el nombre del archivo
thyrox_work_file() {
  local bank="${1:-}" name="${2:-}"

  if [[ -z "$bank" || -z "$name" ]]; then
    echo "thyrox_work_file: se exigen el banco y el nombre" >&2
    return 2
  fi
  if [[ ! -d "$bank" ]]; then
    echo "thyrox_work_file: el banco «$bank» no existe. Se REHÚSA en vez de" >&2
    echo "  crearlo: un banco sin manifiesto es un directorio que nadie pidio." >&2
    return 2
  fi
  # Un nombre con separador de ruta escaparía del banco, que es exactamente lo
  # que este mecanismo existe para impedir.
  if [[ "$name" == */* ]]; then
    echo "thyrox_work_file: el nombre no lleva separador de ruta: $name" >&2
    return 2
  fi

  printf '%s/%s' "$bank" "$name"
}
export -f thyrox_work_file
