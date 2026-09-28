# shellcheck shell=bash
# Sustitutos en verde de cada gate que el pre-commit invoca, derivados del hook.
#
# Cada prueba de `tests/githooks/` monta un repositorio sintético donde sólo
# el gate que mide es real. Las cuatro llevaban su propia lista de sustitutos
# escrita a mano, y cada gate nuevo del hook las dejaba atrás: el hook invocaba
# un archivo inexistente, salía 1, y la prueba fallaba por algo que no mide.
# La lista sale ahora del propio hook —toda ruta `$GATES/<archivo>`—, así que
# un gate nuevo tiene sustituto sin tocar ninguna prueba.
#
# Uso: stub_hook_gates <hook> <raíz del repositorio sintético>
# La prueba sobrescribe DESPUÉS el sustituto del gate que mide.
stub_hook_gates() {
    local hook="$1" root="$2" name
    mkdir -p "$root/src/verify" "$root/src/task"
    printf 'import sys\nsys.exit(0)\n' > "$root/src/task/board_sync.py"
    while IFS= read -r name; do
        case "$name" in
            *.sh) printf '#!/usr/bin/env bash\nexit 0\n' > "$root/src/verify/$name" ;;
            *.py) printf 'import sys\nsys.exit(0)\n' > "$root/src/verify/$name" ;;
            *.ts) printf 'process.exit(0)\n' > "$root/src/verify/$name" ;;
        esac
    done < <(grep -oE '\$GATES/[A-Za-z0-9_.-]+\.(sh|py|ts)' "$hook" | sed 's#^\$GATES/##' | sort -u)
    grep -oE '^GATE_[A-Z]+="\$GATES/[A-Za-z0-9_.-]+"' "$hook" | sed -E 's#.*\$GATES/([^"]+)"#\1#' \
        | while IFS= read -r name; do printf '#!/usr/bin/env bash\nexit 0\n' > "$root/src/verify/$name"; done
}
