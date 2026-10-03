#!/usr/bin/env bash
# Mide, desde DENTRO de la unidad de un trabajador delegado, por qué vías podría
# heredar un secreto que su ExecutionAuthorization no declara. Trabaja por
# NOMBRES (el inventario son las claves de `.env.example` cuyo nombre declara un
# secreto); nunca lee ni imprime un valor. Una fila por fuente: `fuente<TAB>n`.
# Sale 1 si alguna fuente entrega un secreto no autorizado, 0 si ninguna.
# Uso: worker_secret_inheritance.sh <secreto-autorizado>...
set -uo pipefail
root="${THYROX_ROOT:-/home/user/thyrox}"
authorized=" $* "
mapfile -t inventory < <(gawk -F= '/^[A-Z][A-Z0-9_]*=/ && $1 ~ /(TOKEN|KEY|PASSWORD|SECRET|_PAT|CREDENTIAL)/ { print $1 }' "$root/.env.example" | sort -u)
unauthorized=(); for name in "${inventory[@]}"; do [[ "$authorized" == *" $name "* ]] || unauthorized+=("$name"); done
names_regex="$(IFS='|'; echo "${unauthorized[*]}")"
# NOMBRE=valor o "NOMBRE": "valor", con un valor no vacío.
assigned() { grep -lE "(^|[^A-Z0-9_])($names_regex)(=|\"[[:space:]]*:[[:space:]]*\")[^[:space:]\"'$]" "$@" 2>/dev/null | wc -l; }
total=0
row() { echo -e "$1\t$2"; total=$((total + $2)); }

# 1. el entorno que ve un proceso de bun arrancado en el árbol, como thyrox -p
row process_env "$(cd "$root" && bun -e 'console.log(Object.keys(process.env).join("\n"))' | grep -cxE "$names_regex")"
# 2. archivos de arranque del shell
row shell_startup "$(assigned /etc/profile /etc/bash.bashrc /etc/environment ~/.bashrc ~/.profile ~/.bash_profile)"
# 3. archivos de credenciales montados: secretos no autorizados en /run/secrets, netrc, git-credentials
mounted=0; for f in /run/secrets/*; do [ -e "$f" ] || continue; [[ "$authorized" == *" $(basename "$f") "* ]] || mounted=$((mounted + 1)); done
for f in ~/.netrc ~/.git-credentials; do [ -s "$f" ] && mounted=$((mounted + 1)); done
row mounted_credential_files "$mounted"
# 4. configuración de proveedores: hogares de thyrox y del harness, y el runtime del árbol
row provider_config "$( { find ~/.thyrox ~/.harness "$root/.thyrox/runtime" -maxdepth 3 -type f -size -2M 2>/dev/null || true; } | xargs -r grep -lE "(^|[^A-Z0-9_])($names_regex)(=|\"[[:space:]]*:[[:space:]]*\")[^[:space:]\"'$]" 2>/dev/null | wc -l)"
# 5. ayudantes de credenciales de git (global y del repositorio)
row git_credential_helper "$( { git config --global --get-all credential.helper; git -C "$root" config --get-all credential.helper; } 2>/dev/null | grep -c .)"
# 6. autenticación de Docker/Podman
auth=0; for f in ~/.docker/config.json ~/.config/containers/auth.json "${XDG_RUNTIME_DIR:-/run/user/0}/containers/auth.json" /run/containers/0/auth.json; do [ -s "$f" ] && auth=$((auth + 1)); done
row registry_auth "$auth"
# 7. entorno generado en tiempo de ejecución: el de cada proceso vivo de la unidad
runtime=0; for e in /proc/[0-9]*/environ; do tr '\0' '\n' < "$e" 2>/dev/null | cut -d= -f1 | grep -qxE "$names_regex" && runtime=$((runtime + 1)); done
row runtime_env "$runtime"
echo -e "inventory\t${#inventory[@]}\tauthorized\t$(( ${#inventory[@]} - ${#unauthorized[@]} ))"
(( total == 0 ))
