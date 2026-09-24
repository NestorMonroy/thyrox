#!/usr/bin/env bash
# Controles de anulacion en paralelo, cada variante en su propia copia.
#
# Un control de anulacion retira una mitad del juicio de un modulo y mide que
# caigan exactamente las aserciones que dependen de ella. Las variantes son
# independientes entre si, pero editar el modulo en su sitio las obliga a ir en
# serie (cada una restaura antes de la siguiente). Aqui cada variante escribe
# su propia copia bajo .claude/cache/annul/<n>/ y la prueba la importa por una
# variable de entorno, asi que GNU Parallel las corre a la vez sin pisarse.
#
# Uso:
#   bash src/verify/annul_parallel.sh MODULE TEST ENV_VAR VARIANTS
#     MODULE    el modulo bajo prueba (se copia, nunca se edita en su sitio)
#     TEST      el archivo de bun test que lo importa desde ${ENV_VAR}
#     ENV_VAR   la variable que la prueba lee para importar el modulo
#     VARIANTS  un archivo: una variante por linea, `etiqueta<TAB>expresion-sed`
#
# Sale 2 si falta algo o si una variante no cambia el modulo: una expresion
# que no casa produce una copia identica, y su verde se leeria como «el
# control no discrimina» cuando en realidad no se anulo nada.
set -euo pipefail

module="${1:?falta MODULE}"; test_file="${2:?falta TEST}"
env_var="${3:?falta ENV_VAR}"; variants="${4:?falta VARIANTS}"
for f in "$module" "$test_file" "$variants"; do
  [[ -f "$f" ]] || { echo "annul_parallel: REHUSA — no existe $f" >&2; exit 2; }
done
command -v parallel >/dev/null || { echo "annul_parallel: REHUSA — falta GNU parallel" >&2; exit 2; }

root="$(git rev-parse --show-toplevel)"
work="$root/.claude/cache/annul/$(date -u +%Y%m%dT%H%M%S)-$$"
mkdir -p "$work"
trap 'rm -rf "$work"' EXIT

run_variant() {
  local n="$1" label="$2" expr="$3"
  local dir="$WORK/$n" copy
  mkdir -p "$dir"
  copy="$dir/$(basename "$MODULE")"
  sed -e "$expr" "$MODULE" > "$copy"
  if cmp -s "$MODULE" "$copy"; then
    printf '%s\tNO-CAMBIO\t%s\n' "$label" "la expresion no casa: no se anulo nada"
    return 0
  fi
  local out fails
  out="$(env "$ENV_VAR=$copy" timeout 300 bun test "$TEST" 2>&1 || true)"
  fails="$(printf '%s\n' "$out" | gawk '/^\(fail\)/{sub(/ \[[0-9.]+ms\]$/,""); sub(/^\(fail\) /,""); printf "%s%s", sep, $0; sep=" | "}')"
  printf '%s\t%s\t%s\n' "$label" "$(printf '%s\n' "$out" | gawk '/ pass$|^ *[0-9]+ pass/{p=$1} / fail$/{f=$1} END{printf "%s pass, %s fail", p+0, f+0}')" "${fails:-—}"
}
export -f run_variant
export MODULE="$root/${module#"$root"/}" TEST="$test_file" ENV_VAR="$env_var" WORK="$work"

base="$(env "$env_var=$MODULE" timeout 300 bun test "$test_file" 2>&1 | gawk '/ pass$/{p=$1} / fail$/{f=$1} END{printf "%s pass, %s fail", p+0, f+0}')"
printf 'base\t%s\t—\n' "$base"
gawk -F'\t' 'NF>=2{print NR"\t"$1"\t"$2}' "$variants" \
  | parallel --colsep '\t' --keep-order -j "$(nproc)" run_variant {1} {2} {3} \
  | tee "$work/result.tsv"
if gawk -F'\t' '$2=="NO-CAMBIO"{bad=1} END{exit !bad}' "$work/result.tsv"; then exit 2; fi
