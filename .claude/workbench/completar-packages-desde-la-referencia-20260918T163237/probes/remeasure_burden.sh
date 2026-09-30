#!/usr/bin/env bash
# Re-mide la carga de traduccion por paquete con el discriminador EN/ES y
# node_modules excluido. La tabla 09 la midio con el criterio viejo y, en
# `ide`, sin excluir node_modules: publicaba 8 donde el criterio viejo bien
# aplicado da 111 y el nuevo da 1.
set -uo pipefail
cd /home/user/thyrox
B=$(cat .claude/cache/banco_packages.txt)
printf '%-22s %8s %8s %8s %8s\n' paquete tramos nuevo viejo archivos
for d in src/packages/*/; do
  p=$(basename "$d")
  F=$(find "$d" \( -name '*.ts' -o -name '*.tsx' \) -not -path '*/node_modules/*')
  [ -z "$F" ] && continue
  n=$(node "$B/probes/comment_language.mjs" $F 2>/dev/null)
  v=$(node "$B/probes/comment_language.mjs" --sin-espanol $F 2>/dev/null)
  printf '%-22s %8s %8s %8s %8s\n' "$p" \
    "$(printf '%s' "$n"|grep -oE 'tramos=[0-9]+'|cut -d= -f2)" \
    "$(printf '%s' "$n"|grep -oE 'en_ingles=[0-9]+'|cut -d= -f2)" \
    "$(printf '%s' "$v"|grep -oE 'en_ingles=[0-9]+'|cut -d= -f2)" \
    "$(printf '%s' "$n"|grep -oE 'archivos_con_ingles=[0-9]+'|cut -d= -f2)"
done
