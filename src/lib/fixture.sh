#!/usr/bin/env bash
# Desmontaje automatico del fixture — *automated teardown* de xUnit.
#
# El defecto que cierra tiene nombre en Meszaros (xUnit Test Patterns):
# *resource leakage*. Una suite crea su fixture con `mktemp -d` y no ejecuta su
# fase de desmontaje; lo que queda son directorios huerfanos en el directorio
# compartido. Medido por conducta con `src/repo/fixture_leak.sh`: seis suites
# dejaban 47 entradas entre todas.
#
# Por que una biblioteca y no seis `trap`
# ----------------------------------------
# Escribir el `trap` seis veces es la duplicacion que DRY prohibe: seis copias
# que envejecen por separado y cuya correccion hay que recordar seis veces. Una
# herramienta hace una cosa —registrar y retirar— y seis consumidores la usan.
#
# El registro vive en un ARCHIVO, no en un arreglo
# -------------------------------------------------
# `d=$(fixture_dir)` corre en un subshell, y un arreglo modificado ahi se
# pierde al volver. El archivo sobrevive, asi que el idioma que las seis suites
# ya usan —`X=$(mktemp -d)`— se conserva cambiando una palabra por sitio.
#
# La composicion del `trap`, que es el filo del asunto
# -----------------------------------------------------
# `trap ... EXIT` REEMPLAZA al anterior, no se acumula. Una suite que ya mata un
# centinela perderia ese desmontaje al adoptar este mecanismo, y el defecto
# seria peor que la fuga porque es silencioso. `fixture_arm` captura el `trap`
# vigente y lo compone; se invoca DESPUES de instalar el propio.
#
# Metrica: las rutas que este mecanismo registro y retiro.
# Ciega a: lo que la suite cree fuera de `fixture_dir`/`fixture_file`; a un
#   `trap ... EXIT` instalado DESPUES de `fixture_arm`, que vuelve a reemplazar
#   al nuestro sin aviso; y a `SIGKILL`, ante el cual ningun `trap` corre.

#: La composicion con el `trap` vigente es lo unico que separa «se compone» de
#: «se reemplaza». Se declara como constante para que el control pueda
#: **anularla**: sin composicion, el desmontaje propio de la suite desaparece y
#: cae exactamente la asercion que lo mide.
THYROX_TEST_COMPOSE_TRAP=1

_fixture_registry=""
_fixture_extra_trap=""

# El registro: un archivo bajo TMPDIR, una ruta por linea. Se crea al primer uso.
_fixture_open_registry() {
    [[ -n "$_fixture_registry" && -f "$_fixture_registry" ]] && return 0
    _fixture_registry="$(mktemp "${TMPDIR:-/tmp}/fixture-registry-XXXXXX")" || return 1
    return 0
}

_fixture_record() {   # _fixture_record <ruta>
    _fixture_open_registry || return 1
    printf '%s\n' "$1" >> "$_fixture_registry"
}

_fixture_on_exit() {
    local pending="$_fixture_extra_trap"
    # El desmontaje propio de la suite corre PRIMERO: puede necesitar lo que el
    # fixture contiene (un pid, un log) y despues de retirarlo ya no estaria.
    [[ -n "$pending" ]] && eval "$pending"
    fixture_teardown
    return 0
}

# Instala el desmontaje componiendo con el `trap EXIT` que ya hubiera.
fixture_arm() {
    # El registro se abre AQUI, en el proceso que arma — no dentro de
    # `fixture_dir`. Si se abriera ahi, `d=$(fixture_dir)` fijaria la variable
    # en su subshell y el padre llegaria al desmontaje sin saber que archivo
    # leer: el archivo sobrevive, su ruta no.
    _fixture_open_registry || return 1
    if [[ "$THYROX_TEST_COMPOSE_TRAP" == "1" ]]; then
        local declared; declared="$(trap -p EXIT)"
        if [[ -n "$declared" && "$declared" != *_fixture_on_exit* ]]; then
            declared="${declared#trap -- }"
            declared="${declared% EXIT}"
            # `trap -p` emite el cuerpo ya entrecomillado y reutilizable, asi
            # que una asignacion evaluada lo recupera sin romper su escapado.
            eval "_fixture_extra_trap=$declared"
        fi
    fi
    trap '_fixture_on_exit' EXIT
}

# Crea un directorio de fixture, lo registra y lo imprime.
fixture_dir() {
    local path; path="$(mktemp -d "${TMPDIR:-/tmp}/fixture-XXXXXX")" || return 1
    _fixture_record "$path"
    printf '%s\n' "$path"
}

# Crea un archivo de fixture, lo registra y lo imprime.
fixture_file() {
    local path; path="$(mktemp "${TMPDIR:-/tmp}/fixture-XXXXXX")" || return 1
    _fixture_record "$path"
    printf '%s\n' "$path"
}

# Registra una ruta que la suite creo por otra via. Dos formas reales lo
# necesitan: `mktemp -u`, que devuelve un nombre sin crearlo, y el hijo de un
# padre que nadie capturo en una variable (`$(mktemp -d)/ledger`).
fixture_adopt() {   # fixture_adopt <ruta>
    [[ -n "${1:-}" ]] || return 1
    _fixture_record "$1"
}

# Retira todo lo registrado. Idempotente: llamarlo dos veces no falla.
fixture_teardown() {
    [[ -n "$_fixture_registry" && -f "$_fixture_registry" ]] || return 0
    local path
    while IFS= read -r path; do
        [[ -n "$path" ]] && rm -rf -- "$path"
    done < "$_fixture_registry"
    rm -f -- "$_fixture_registry"
    _fixture_registry=""
    return 0
}

# Sourcear la biblioteca ya deja armado el desmontaje: una suite sin `trap`
# propio no tiene que acordarse de nada.
fixture_arm
