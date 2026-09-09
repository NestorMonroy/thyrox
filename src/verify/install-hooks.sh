#!/bin/bash
# =============================================================================
# src/verify/install-hooks.sh — habilita los hooks de un clon consumidor
# =============================================================================
# Activa los hooks que viven en .githooks/ apuntando git al directorio via
# 'git config core.hooksPath'. Idempotente — corre cuantas veces se quiera.
#
# Por defecto git no ejecuta hooks que viven fuera de .git/hooks/, que se
# inicializa con los samples al clonar. Eso permite que cada quien personalice
# sin afectar al repo, PERO tambien significa que las convenciones del repo no
# se aplican por defecto en un clon nuevo. La solucion estandar es versionar
# los hooks en el arbol (.githooks/) y apuntar git ahi en el arranque:
# https://git-scm.com/docs/githooks#_path
#
# DOS RAICES, y no se pueden colapsar (DEC-04):
#
#   PROVEEDOR (RAIZ)  — donde viven los MECANISMOS que este guion instala:
#                       el driver de merge y el arranque de hooks de sesion.
#                       Sale del localizador, asi que se resuelve igual se
#                       invoque desde donde se invoque.
#   CONSUMIDOR (TARGET) — el clon que se esta configurando. Sale de git, o de
#                       THYROX_TARGET_REPO si el llamador lo declara.
#
# Con una sola raiz, invocarlo parado en el consumidor configuraria al
# PROVEEDOR y saldria en verde: el destino equivocado sin senal de error.
#
# Uso:
#   bash src/verify/install-hooks.sh                 # githooks + hooks de sesion
#   bash src/verify/install-hooks.sh --solo-mostrar  # sin escribir la copia viva
#
# Este guion no tiene banderas propias: las que reciba se REENVIAN tal cual a
# clone_bootstrap.py (ver el bloque de hooks de sesion al final).
#
# Para deshabilitar:  git config --unset core.hooksPath
# =============================================================================
set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz y la
# RUTA a su declaracion. Los dos literales que el ultimo recurso necesita van
# tras constantes que el entorno tambien fija: cablearlos le quitaria al
# consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2

# El clon que se configura. `git rev-parse` lo lee del directorio actual — el
# mismo idioma que usa `scripts/install-hooks.sh` para decir «este clon».
TARGET="${THYROX_TARGET_REPO:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
if [[ -z "$TARGET" ]]; then
    echo "ERROR: no hay repositorio git en $(pwd) — declara THYROX_TARGET_REPO" >&2
    exit 1
fi

echo "proveedor: $RAIZ"
echo "consumidor: $TARGET"
echo ""

# -----------------------------------------------------------------------------
# 1. Los githooks del consumidor.
# -----------------------------------------------------------------------------
HOOKS_DIR="$TARGET/.githooks"
if [[ ! -d "$HOOKS_DIR" ]]; then
    echo "OMITIDO: $HOOKS_DIR no existe — este clon no versiona githooks"
else
    # git no corre un hook que no sea ejecutable.
    chmod +x "$HOOKS_DIR"/* 2>/dev/null || true

    CURRENT="$(git -C "$TARGET" config --get core.hooksPath 2>/dev/null || true)"
    if [[ "$CURRENT" == ".githooks" ]]; then
        echo "OK: core.hooksPath ya apunta a .githooks/ (idempotente, sin cambios)"
    else
        git -C "$TARGET" config core.hooksPath ".githooks"
        echo "OK: core.hooksPath -> .githooks/"
    fi

    echo ""
    echo "Hooks activos:"
    for h in "$HOOKS_DIR"/*; do
        [[ -f "$h" ]] || continue
        [[ -x "$h" ]] || { echo "  ! $(basename "$h") (no ejecutable — se omitira)"; continue; }
        echo "  * $(basename "$h")"
    done
fi

# -----------------------------------------------------------------------------
# 2. Driver de merge de union para el store de subagentes.
#
# .gitattributes declara `merge=sqlite-union` sobre la base, pero el atributo
# solo NOMBRA al driver: la DEFINICION va en .git/config, que no se versiona.
# Es la misma mitad ausente que core.hooksPath, y por eso se instala aqui. Sin
# ella git no falla — vuelve al comportamiento binario, que deja conflicto y se
# queda con nuestro lado, perdiendo las filas del otro.
#
# Se instala SOLO si el consumidor declara el atributo. Un clon que no lo
# declara no tiene con que disparar el driver: definirlo ahi seria configurar
# un mecanismo sin sujeto.
# -----------------------------------------------------------------------------
echo ""
if ! grep -qs "merge=sqlite-union" "$TARGET/.gitattributes"; then
    echo "OMITIDO: driver sqlite-union — $TARGET/.gitattributes no lo declara"
else
    MERGE_UNION="$RAIZ/src/agents/merge_sqlite_union.py"
    DRIVER="python3 $MERGE_UNION %O %A %B"
    if [[ ! -f "$MERGE_UNION" ]]; then
        echo "ERROR: $MERGE_UNION no existe — el proveedor esta incompleto" >&2
        exit 1
    fi
    if [[ "$(git -C "$TARGET" config --get merge.sqlite-union.driver 2>/dev/null || true)" == "$DRIVER" ]]; then
        echo "OK: driver de merge sqlite-union ya definido (idempotente, sin cambios)"
    else
        git -C "$TARGET" config merge.sqlite-union.name "union de filas para una base SQLite"
        git -C "$TARGET" config merge.sqlite-union.driver "$DRIVER"
        echo "OK: driver de merge sqlite-union -> $MERGE_UNION"
    fi
fi

# -----------------------------------------------------------------------------
# 3. Los hooks de SESION son otra cosa que los de git, y viven en otro archivo.
#
# Los de arriba los corre git en un commit; los de sesion los corre el cliente
# al abrir, cerrar y despachar subagentes, y su archivo —el settings.local.json
# de la raiz de proyecto— no vive en ningun repositorio. Un clon que sale de
# aqui sin ese paso queda con los githooks puestos y CERO hooks de sesion.
#
# `--docs-root` va ANTES de "$@": argparse se queda con la ultima aparicion, asi
# que un llamador que la declare gana sobre este default.
#
# Y NO se traga el fallo con `|| true`. Ese `|| true` convertia «cero hooks de
# sesion» en una salida verde: el sub-patron D — un verde que no distingue «el
# mecanismo corrio» de «el mecanismo murio».
# -----------------------------------------------------------------------------
echo ""
ARRANQUE="$RAIZ/src/session/clone_bootstrap.py"
if [[ ! -f "$ARRANQUE" ]]; then
    echo "ERROR: $ARRANQUE no existe — el proveedor esta incompleto" >&2
    exit 1
fi
python3 "$ARRANQUE" --docs-root "$TARGET" "$@"
rc=$?
if [[ $rc -ne 0 ]]; then
    echo "OMITIDO: hooks de sesion — clone_bootstrap.py salio con $rc" >&2
    exit 3
fi
