#!/usr/bin/env bash
# Memoria de patrones del lazo agente-verificador (Reflexion, plan 2.1.0).
#
# Cada entrada de patterns.jsonl es una reflexión reutilizable:
#   {"id", "pattern", "signal", "fix", "applied_files": [...]}
# donde `signal` es una expresión regular (gawk) sobre la línea normalizada
# del verificador `archivo: TSxxxx: mensaje`.
#
#   patterns.sh add <id> <signal> <pattern> <fix>   escribe una reflexión
#   patterns.sh match <final.log>                    UNA pasada: por patrón,
#                                                    total y archivos donde
#                                                    la señal sigue viva
#   patterns.sh applied <id> <archivo>...            registra la aplicación
#
# El match NO aplica nada: devuelve el universo sobre el que aplicar de
# forma masiva; la aplicación pasa por el verificador neto como cualquier
# otro paso, y si el total no baja el patrón se revierte.
set -euo pipefail
MEM="${PATTERNS_FILE:-$(dirname "$0")/patterns.jsonl}"
cmd="${1:-}"; shift || true

json_str() { gawk 'BEGIN{s=ARGV[1]; gsub(/\\/,"\\\\",s); gsub(/"/,"\\\"",s); printf "\"%s\"", s}' "$1"; }

case "$cmd" in
  add)
    [ $# -eq 4 ] || { echo "uso: add <id> <signal> <pattern> <fix>" >&2; exit 2; }
    if [ -f "$MEM" ] && gawk -v id="$1" 'index($0,"\"id\": \"" id "\"")>0{f=1} END{exit !f}' "$MEM"; then
      echo "ERROR — el patrón $1 ya existe" >&2; exit 2
    fi
    printf '{"id": %s, "signal": %s, "pattern": %s, "fix": %s, "applied_files": []}\n' \
      "$(json_str "$1")" "$(json_str "$2")" "$(json_str "$3")" "$(json_str "$4")" >> "$MEM"
    echo "patrón $1 registrado en $MEM" ;;
  match)
    [ $# -eq 1 ] && [ -f "$1" ] || { echo "uso: match <final.log>" >&2; exit 2; }
    [ -f "$MEM" ] || { echo "ERROR — sin memoria en $MEM; NO se emite un conteo" >&2; exit 2; }
    # Primer archivo: la memoria. Segundo: el log. Una sola pasada por ambos.
    gawk '
      NR==FNR {
        match($0,/"id": "([^"]*)"/,a); match($0,/"signal": "(([^"\\]|\\.)*)"/,b)
        s=b[1]; gsub(/\\"/,"\"",s); gsub(/\\\\/,"\\",s); ids[++n]=a[1]; sig[a[1]]=s; next }
      /error TS[0-9]+/ {
        line=$0; file=line; sub(/\(.*/,"",file)
        norm=line; sub(/\([0-9]+,[0-9]+\): error /,": ",norm); total++
        for (i=1;i<=n;i++) if (norm ~ sig[ids[i]]) { c[ids[i]]++; fc[ids[i] SUBSEP file]++ }
      }
      END {
        printf "memoria: %d patrón(es); log: %d diagnóstico(s)\n", n, total
        for (i=1;i<=n;i++) { id=ids[i]; printf "%-28s %5d", id, c[id]+0
          k=0; for (x in fc) { split(x,p,SUBSEP); if (p[1]==id) k++ }
          printf "  en %d archivo(s)\n", k
          PROCINFO["sorted_in"]="@val_num_desc"
          for (x in fc) { split(x,p,SUBSEP); if (p[1]==id) printf "    %4d  %s\n", fc[x], p[2] } }
      }' "$MEM" "$1" ;;
  applied)
    [ $# -ge 2 ] || { echo "uso: applied <id> <archivo>..." >&2; exit 2; }
    id="$1"; shift
    tmp="$MEM.next"
    gawk -v id="$id" -v files="$*" '
      index($0,"\"id\": \"" id "\"")>0 { found=1; n=split(files,f," ")
        match($0,/"applied_files": \[([^]]*)\]/,a); cur=a[1]
        for (i=1;i<=n;i++) if (index(cur,"\"" f[i] "\"")==0) cur=(cur==""?"":cur ", ") "\"" f[i] "\""
        sub(/"applied_files": \[[^]]*\]/,"\"applied_files\": [" cur "]") }
      { print } END { if (!found) { print "ERROR — sin patrón " id > "/dev/stderr"; exit 2 } }' "$MEM" > "$tmp"
    mv "$tmp" "$MEM" ;;
  *) echo "uso: patterns.sh add|match|applied" >&2; exit 2 ;;
esac
