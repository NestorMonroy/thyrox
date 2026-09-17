#!/usr/bin/env bash
# Reproduce la lista de fixtures de suite a retirar de /tmp.
#
# La lista NO se versiona: son ~105 mil rutas de un /tmp concreto, 1.8 MB que
# caducan en cuanto alguien borra o el contenedor se recicla. Lo durable es el
# criterio, que es este guion mas `prefixes.txt`.
#
# Criterio, en dos guardas:
#   1) el nombre es <prefijo>-XXXXXX con XXXXXX de mktemp, y el prefijo tiene
#      >=10 instancias -> generado en bucle por una suite, no un nombre propio;
#   2) el sufijo NO es una palabra en minusculas -> deja fuera /tmp/harness-skills,
#      que es un cache indexado por hash y no un fixture (577 excluidos asi).
#
# Nunca alcanza /tmp/claude-0 ni un archivo suelto: solo directorios de primer
# nivel que casan las dos guardas.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while read -r prefix; do
  find /tmp -maxdepth 1 -type d -regextype posix-extended \
       -regex "/tmp/${prefix}-[A-Za-z0-9]{6}" -print
done < "$here/prefixes.txt" \
  | grep -vE '/[a-z0-9_.]+-[a-z]{6}$' \
  | sort -u
