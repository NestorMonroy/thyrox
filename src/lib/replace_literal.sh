#!/usr/bin/env bash
# replace_literal.sh — reemplaza un texto LITERAL en un archivo, con gawk.
#
# Uso:  OLD='<texto>' NEW='<texto>' bash src/lib/replace_literal.sh [--all] <archivo>
#
# Por que existe
# --------------
# El reemplazo de un texto fijo se hacia con `perl -pe 's/…/…/'`, `sed -i` o
# un heredoc de Python. Los dos primeros leen el texto como regex —`$`, `{`,
# `.` hay que escaparlos— y, dentro de un `bash -c` o de un `eval`, las
# comillas anidadas rompen el comando antes de ejecutarlo (episodio del
# 2026-09-25 sobre `wait-jobs.sh`). Aqui:
#
# - `index()` busca el texto LITERAL: nada que escapar.
# - `OLD`/`NEW` llegan por `ENVIRON[...]` y no por `-v`, que procesa las
#   secuencias de escape: la `\` de una continuacion de linea llega intacta.
# - `RS = "^$"` lee el archivo ENTERO (gawk), asi que `OLD` puede ocupar varias
#   lineas, y el final del archivo —con o sin salto— se conserva byte a byte.
# - El resultado se vuelca con `cat >`, no con `mv`: conserva el inodo y los
#   permisos, como `thyrox_safe_sed` (`src/lib/assert.sh`).
#
# Unicidad: por defecto exige UNA coincidencia, como `old_string` de `Edit`;
# dos o mas sin `--all` rehusan sin tocar el archivo.
#
# Desenlaces:
#   exit 0 = reemplazo hecho; publica cuantos y en que archivo
#   exit 1 = 0 coincidencias, o varias sin --all; el archivo queda intacto
#   exit 2 = NO se pudo medir (sin OLD, archivo ausente, sin gawk); sin conteo
#
# Metrica: coincidencias no solapadas de OLD en el contenido del archivo.
# Ciega a: la codificacion — gawk compara por caracter segun el locale, asi
#   que un archivo con bytes invalidos en UTF-8 puede contar distinto; y a que
#   el texto nuevo sea correcto, que es juicio de quien lo pide.
set -uo pipefail

replace_all=0
file=""
for arg in "$@"; do
    case "$arg" in
        --all) replace_all=1 ;;
        -h|--help) gawk 'FNR>=2 && /^#/ {sub(/^# ?/, ""); print} FNR>2 && !/^#/ {exit}' "$0"; exit 0 ;;
        *) file="$arg" ;;
    esac
done

refuse() { echo "replace_literal: NO se pudo medir — $1. No se emite conteo." >&2; exit 2; }

command -v gawk >/dev/null || refuse "falta gawk (RS=\"^\$\" y el volcado exacto son de gawk)"
[[ -n "${OLD:-}" ]] || refuse "OLD vacio o sin declarar"
[[ -n "$file" ]] || refuse "falta el archivo"
[[ -f "$file" ]] || refuse "no existe el archivo $file"

scratch="$file.replace_literal.$$"
trap 'rm -f "$scratch"' EXIT

REPLACE_ALL="$replace_all" gawk '
    BEGIN { RS = "^$"; ORS = ""; text = "" }
    { text = $0 }
    END {
        old = ENVIRON["OLD"]; new = ENVIRON["NEW"]
        rest = text; out = ""; count = 0
        while ((at = index(rest, old)) > 0) {
            out = out substr(rest, 1, at - 1) new
            rest = substr(rest, at + length(old))
            count++
        }
        if (count == 0) exit 10
        if (count > 1 && ENVIRON["REPLACE_ALL"] != "1") { print count > "/dev/stderr"; exit 11 }
        print out rest
        print count > "/dev/stderr"
    }
' "$file" >"$scratch" 2>"$scratch.count"
status=$?
count="$(cat "$scratch.count" 2>/dev/null)"
rm -f "$scratch.count"

case "$status" in
    0)
        cat "$scratch" >"$file"
        echo "replace_literal: $count reemplazo(s) en $file"
        ;;
    10)
        echo "replace_literal: 0 coincidencias de OLD en $file; no se toca" >&2
        exit 1
        ;;
    11)
        echo "replace_literal: $count coincidencias de OLD en $file; sin --all no se toca ninguna" >&2
        exit 1
        ;;
    *)
        refuse "gawk salio con $status"
        ;;
esac
