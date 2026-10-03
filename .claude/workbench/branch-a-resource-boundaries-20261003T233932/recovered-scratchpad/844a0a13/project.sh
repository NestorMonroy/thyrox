#!/usr/bin/env bash
# Proyección con lista de campos permitidos del estado de la infraestructura:
# contenedores (name, state, running, pid, pid_alive), locks, volúmenes por
# nombre e imágenes por id corto y etiqueta. Nada crudo.
cd /home/user/thyrox || exit 2
echo "## contenedores (name state running pid pid_alive)"
bash bin/podman-execution-execute observe containers 2>/dev/null | jq -r '.[] | [.name, .state, (.running|tostring), (.pid|tostring)] | @tsv' |
  while IFS=$'\t' read -r name state running pid; do
    alive=false; [[ "$pid" != 0 ]] && kill -0 "$pid" 2>/dev/null && alive=true
    printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$state" "$running" "$pid" "$alive"
  done
echo "## locks (allocated referenced)"
(source src/lib/podman_locks.sh && thyrox_podman_lock_balance)
echo "## volúmenes (name)"
bash bin/podman-execution-execute observe volumes 2>/dev/null | jq -r '.[].name' | sort
echo "## imágenes (id12 tag)"
bash bin/podman-execution-execute observe images 2>/dev/null | jq -r '.[] | "\(.id[0:12])\t\(.tags|join(","))"' | sort
