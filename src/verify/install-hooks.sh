#!/bin/bash
# =============================================================================
# scripts/install-hooks.sh — habilita los git hooks del repo
# =============================================================================
# Activa los hooks que viven en .githooks/ apuntando git al directorio
# via 'git config core.hooksPath'. Idempotente — corre cuantas veces se
# quiera.
#
# Por defecto git no ejecuta hooks que viven fuera de .git/hooks/ ya
# que .git/hooks/ se inicializa con scripts samples al hacer clone.
# Esto permite que cada developer customice sin afectar el repo, PERO
# tambien significa que las convenciones del repo no se enforcean por
# defecto en clones nuevos.
#
# La solucion estandar es vendor-los los hooks en el tree (.githooks/)
# y apuntar git ahi en el setup inicial. Ver:
# https://git-scm.com/docs/githooks#_path
#
# Uso:
#   bash scripts/install-hooks.sh                 # githooks + hooks de sesion
#   bash scripts/install-hooks.sh --solo-mostrar  # sin escribir la copia viva
#
# Este guion no tiene banderas propias: las que reciba se REENVIAN tal cual a
# arranque_de_clon.py (ver el bloque de hooks de sesion al final).
#
# Tras esto, todo commit en este clone valida el subject contra las
# reglas de .claude/rules/commit-conventions.md.
#
# Para deshabilitar:
#   git config --unset core.hooksPath
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Asegurar que estamos en la raiz del repo git.
if ! git -C "$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    echo "ERROR: $PROJECT_ROOT no es un repositorio git" >&2
    exit 1
fi

HOOKS_DIR="$PROJECT_ROOT/.githooks"
if [[ ! -d "$HOOKS_DIR" ]]; then
    echo "ERROR: $HOOKS_DIR no existe — repo incompleto?" >&2
    exit 1
fi

# Asegurar que los hooks son ejecutables (git no los corre si no lo son).
chmod +x "$HOOKS_DIR"/* 2>/dev/null || true

# Configurar git para usar .githooks/ en lugar de .git/hooks/.
CURRENT="$(git -C "$PROJECT_ROOT" config --get core.hooksPath 2>/dev/null || true)"
if [[ "$CURRENT" == ".githooks" ]]; then
    echo "OK: git ya esta configurado para usar .githooks/ (idempotente, sin cambios)"
else
    git -C "$PROJECT_ROOT" config core.hooksPath ".githooks"
    echo "OK: git core.hooksPath -> .githooks/"
fi

# -----------------------------------------------------------------------------
# Driver de merge de union para el store de subagentes.
#
# .gitattributes declara `merge=sqlite-union` sobre agent_store.sqlite3, pero el
# atributo solo nombra al driver: la DEFINICION va en .git/config, que no se
# versiona. Es la misma mitad ausente que core.hooksPath, y por eso se instala
# aqui. Sin ella git no falla — vuelve al comportamiento binario, que deja
# conflicto y se queda con nuestro lado, perdiendo las filas del otro.
#
# Ver #742. La politica ante una clave que los dos lados modificaron sigue
# siendo #436; este driver es el mecanismo que esa decision necesita.
# -----------------------------------------------------------------------------
DRIVER="python3 $PROJECT_ROOT/.claude/scripts/agents/merge_sqlite_union.py %O %A %B"
if [[ "$(git -C "$PROJECT_ROOT" config --get merge.sqlite-union.driver 2>/dev/null || true)" == "$DRIVER" ]]; then
    echo "OK: driver de merge sqlite-union ya definido (idempotente, sin cambios)"
else
    git -C "$PROJECT_ROOT" config merge.sqlite-union.name "union de filas para una base SQLite"
    git -C "$PROJECT_ROOT" config merge.sqlite-union.driver "$DRIVER"
    echo "OK: driver de merge sqlite-union -> .claude/scripts/agents/merge_sqlite_union.py"
fi

# Listar hooks instalados.
echo ""
echo "Hooks activos:"
for h in "$HOOKS_DIR"/*; do
    [[ -f "$h" ]] || continue
    [[ -x "$h" ]] || { echo "  ! $(basename "$h") (no ejecutable — se omitira)"; continue; }
    echo "  * $(basename "$h")"
done

# -----------------------------------------------------------------------------
# Los hooks de SESION son otra cosa que los de git, y viven en otro archivo.
#
# Los de arriba los corre git en un commit; los de sesion los corre el cliente
# al abrir, cerrar y despachar subagentes, y su archivo —el settings.local.json
# de la raiz de proyecto— no vive en ningun repositorio. Un clon que sale de
# aqui sin ese paso queda con los githooks puestos y CERO hooks de sesion.
#
# El guion pregunta antes de escribir; con --si no pregunta. Aqui NO se fija la
# bandera: se reenvia lo que el llamador haya puesto, asi que sin argumentos
# pregunta —quien clona ve el desglose y decide— y con --si escribe directo.
#
# El comentario decia "aqui se invoca sin --si a proposito" y el codigo pasaba
# "$@" desde el primer dia: describia una invocacion fija donde hay una
# variable. Medido: con --solo-mostrar el argumento llega y cambia la conducta.
# -----------------------------------------------------------------------------
echo ""
python3 "$PROJECT_ROOT/.claude/scripts/session/arranque_de_clon.py" "$@" || true
