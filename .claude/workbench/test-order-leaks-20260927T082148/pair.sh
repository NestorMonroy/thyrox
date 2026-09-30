#!/usr/bin/env bash
# Una pareja: el compañero corre ANTES que la víctima, en el mismo proceso.
# Escribe «víctima<TAB>compañero<TAB>fallos de la víctima».
victim="$1"; other="$2"
[ "$victim" = "$other" ] && exit 0
fails=$(bun test "$other" "$victim" 2>&1 | gawk -v v="$victim" '
  /^[^ ].*\.test\.tsx?:$/ { current = $0 }
  /^\(fail\)/ && index(current, v) { n++ }
  END { print n + 0 }')
printf '%s\t%s\t%s\n' "$victim" "$other" "$fails"
