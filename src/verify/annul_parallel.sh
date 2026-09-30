#!/usr/bin/env bash
# Controles de anulacion en paralelo, cada variante en su propia copia.
#
# Un control de anulacion retira una mitad del juicio de un modulo y mide que
# caigan exactamente las aserciones que dependen de ella. Las variantes son
# independientes entre si, pero editar el modulo en su sitio las obliga a ir en
# serie (cada una restaura antes de la siguiente). Aqui cada variante escribe
# su propia copia bajo .claude/cache/<name>/annul/<run-id>/<index>/ y la prueba
# la importa por una
# variable de entorno, asi que GNU Parallel las corre a la vez sin pisarse.
#
# Uso:
#   bash src/verify/annul_parallel.sh MODULE TEST ENV_VAR VARIANTS [NAME]
#     MODULE    el modulo bajo prueba (se copia, nunca se edita en su sitio)
#     TEST      la prueba que lo importa desde ${ENV_VAR}: `bun test` para
#               .ts, `python3` para .py y `bash` para .sh
#     ENV_VAR   la variable que la prueba lee para importar el modulo
#     VARIANTS  un archivo: una variante por linea, `etiqueta<TAB>expresion-sed`
#     NAME      el sujeto, que agrupa sus ejecuciones en .claude/cache/<NAME>/;
#               por defecto el nombre del modulo sin extension, para que las
#               ejecuciones de dos modulos distintos no se mezclen en un solo
#               directorio
#
# THYROX_ANNUL_TEST_TIMEOUT: segundos por ejecución de la prueba (300 por
# defecto). Una variante que la cuelga se corta ahí y se publica como
# «agotó el plazo».
#
# Sale 2 si falta algo o si una variante no cambia el modulo: una expresion
# que no casa produce una copia identica, y su verde se leeria como «el
# control no discrimina» cuando en realidad no se anulo nada.
set -euo pipefail

module="${1:?falta MODULE}"; test_file="${2:?falta TEST}"
env_var="${3:?falta ENV_VAR}"; variants="${4:?falta VARIANTS}"
name="${5:-$(basename "${module%.*}")}"
# Una variante puede colgar la prueba (una promesa que ya nunca se resuelve):
# se corta en este plazo y cuenta como fallo.
limit="${THYROX_ANNUL_TEST_TIMEOUT:-300}"
for f in "$module" "$test_file" "$variants"; do
  [[ -f "$f" ]] || { echo "annul_parallel: REHUSA — no existe $f" >&2; exit 2; }
done
command -v parallel >/dev/null || { echo "annul_parallel: REHUSA — falta GNU parallel" >&2; exit 2; }

root="$(git rev-parse --show-toplevel)"
work="$root/.claude/cache/$name/annul/$(date -u +%Y%m%dT%H%M%S)-$$"
mkdir -p "$work"
# Al salir se borra el directorio de esta ejecucion y, solo si quedan vacios,
# sus padres: otra ejecucion concurrente del mismo sujeto conserva el suyo.
trap 'rm -rf "$work"; rmdir "${work%/*}" "${work%/*/*}" 2>/dev/null || true' EXIT

# La prueba se corre con el ejecutor de su lenguaje; `bun test` publica sus
# fallos como `(fail) nombre`, y las suites de Python y shell del arbol, como
# `FALLA nombre: detalle` con un `ok nombre` por acierto.
run_test() {
  local module="$1" out status=0
  case "$TEST" in
    *.py) out="$(env "$ENV_VAR=$module" timeout "$LIMIT" python3 "$TEST" 2>&1)" || status=$? ;;
    *.sh) out="$(env "$ENV_VAR=$module" timeout "$LIMIT" bash "$TEST" 2>&1)" || status=$? ;;
    *) out="$(env "$ENV_VAR=$module" timeout "$LIMIT" bun test "$TEST" 2>&1)" || status=$? ;;
  esac
  # Una salida con error sin fallos nombrados es una prueba que abortó: un fallo.
  printf '%s\n' "$out" | gawk -v runner="${TEST##*.}" -v status="$status" -v limit="$LIMIT" '
    runner ~ /^(py|sh)$/ && /^[[:space:]]*ok[[:space:]]/ { p++ }
    runner ~ /^(py|sh)$/ && /^[[:space:]]*FALLA[[:space:]]/ {
      f++; line = $0; sub(/^[[:space:]]*FALLA[[:space:]]+/, "", line); sub(/:.*$/, "", line)
      names = names sep line; sep = " | "
    }
    runner !~ /^(py|sh)$/ && /^\(fail\)/ {
      line = $0; sub(/ \[[0-9.]+ms\]$/, "", line); sub(/^\(fail\) /, "", line)
      names = names sep line; sep = " | "
    }
    runner !~ /^(py|sh)$/ && (/ pass$/ || /^ *[0-9]+ pass/) { p = $1 }
    runner !~ /^(py|sh)$/ && / fail$/ { f = $1 }
    END {
      if (status == 124) { f = 1; names = "agotó el plazo (" limit " s)" }
      else if (status != 0 && f + 0 == 0 && names == "") { f = 1; names = "abortó (exit " status ")" }
      printf "%s pass, %s fail\t%s\n", p + 0, f + 0, (names == "" ? "—" : names)
    }'
}

# La copia ocupa el lugar del modulo en un arbol sombra del repositorio: en
# cada nivel del camino se enlazan las demas entradas, asi que todo camino
# relativo del modulo —un import `../x.ts`, un `with_name`, un
# `$(dirname "$0")/../lib`— resuelve como en el original. Imprime la ruta que
# ocupa la copia.
shadow_tree() {
  local src="$ROOT" dst="$1" part entry name
  local -a parts
  IFS=/ read -ra parts <<< "${MODULE#"$ROOT"/}"
  mkdir -p "$dst"
  for part in "${parts[@]}"; do
    for entry in "$src"/* "$src"/.[!.]*; do
      [[ -e "$entry" || -L "$entry" ]] || continue
      name="$(basename "$entry")"
      [[ "$name" == "$part" || "$name" == __pycache__ ]] || ln -s "$entry" "$dst/$name"
    done
    src="$src/$part"; dst="$dst/$part"
    [[ "$src" == "$MODULE" ]] || mkdir -p "$dst"
  done
  printf '%s\n' "$dst"
}

run_variant() {
  local index="$1" label="$2" expr="$3"
  local dir="$WORK/$index" copy
  mkdir -p "$dir"
  copy="$(shadow_tree "$dir/tree")"
  sed -e "$expr" "$MODULE" > "$dir/variant"
  if cmp -s "$MODULE" "$dir/variant"; then
    printf '%s\tNO-CAMBIO\t%s\n' "$label" "la expresion no casa: no se anulo nada"
    return 0
  fi
  mv "$dir/variant" "$copy"
  printf '%s\t%s\n' "$label" "$(PYTHONDONTWRITEBYTECODE=1 run_test "$copy")"
}
export -f run_test shadow_tree run_variant
export LIMIT="$limit" ROOT="$root" MODULE="$root/${module#"$root"/}" TEST="$test_file" ENV_VAR="$env_var" WORK="$work"

printf 'base\t%s\n' "$(run_test "$MODULE" | cut -f1)"$'\t—'
gawk -F'\t' 'NF>=2{print NR"\t"$1"\t"$2}' "$variants" \
  | parallel --colsep '\t' --keep-order -j "$(nproc)" run_variant '{1}' '{2}' '{3}' \
  | tee "$work/result.tsv"
if gawk -F'\t' '$2=="NO-CAMBIO"{bad=1} END{exit !bad}' "$work/result.tsv"; then exit 2; fi
