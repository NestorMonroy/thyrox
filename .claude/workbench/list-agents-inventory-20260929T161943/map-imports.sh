#!/usr/bin/env bash
# Mapea cada símbolo que importa el chunk de ListAgents a su nombre exportado
# (cuando el chunk origen lo reexporta con alias) — sólo lectura del corpus.
R="$1"; C="$R/chunk-7h1n9jsx.js"
grep -oE 'import\{[^}]+\}from"/\$bunfs/root/chunk-[a-z0-9]+\.js"' "$C" |
while IFS= read -r imp; do
  src="$(sed -E 's/.*root\/(chunk-[a-z0-9]+\.js).*/\1/' <<<"$imp")"
  syms="$(sed -E 's/import\{([^}]+)\}.*/\1/' <<<"$imp" | tr ',' '\n')"
  exports="$(grep -oE 'export\{[^}]*\}' "$R/$src" | tail -1)"
  while IFS= read -r s; do
    [ -z "$s" ] && continue
    alias="$(grep -oE "(^|[{,])${s//\$/\\\$} as [A-Za-z0-9_\$]+" <<<"$exports" | sed -E 's/.* as //')"
    printf '%s\t%s\t%s\n' "$src" "$s" "${alias:-(sin alias)}"
  done <<<"$syms"
done
