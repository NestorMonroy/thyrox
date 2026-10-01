#!/usr/bin/env bash
# Corre UN envoltorio de bin/ con --help dentro de un espacio de montaje donde
# /home/user es de sólo lectura, y publica una línea TSV:
#   nombre  exit  termina(si|no)  ayuda(si|no)  intento-de-escritura(si|no)  primera-línea
# Nada puede quedar escrito en los árboles: un intento aparece como EROFS.
set -uo pipefail
name="$1"; root="$2"
out="$(timeout 20 unshare --mount --propagation private bash -c '
  mount --bind /home/user /home/user && mount -o remount,ro,bind /home/user || exit 99
  cd "$1" && exec bash "bin/$2" --help </dev/null' _ "$root" "$name" 2>&1)"
rc=$?
finished=si; [[ $rc -eq 124 ]] && finished=no
help=no; grep -qiE '(^|[^a-z])(usage|uso)[: ]|--help|options:' <<<"$out" && help=si
write=no; grep -qiE 'read-only file system|EROFS' <<<"$out" && write=si
first="$(grep -m1 -vE '^\s*$' <<<"$out" | cut -c1-140 | tr '\t' ' ')"
printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$name" "$rc" "$finished" "$help" "$write" "$first"
