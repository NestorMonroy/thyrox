#!/usr/bin/env bash
# Integra en el árbol principal los parches de un headless-pool con
# --isolation worktree, en el orden de sus ítems.
#
# Uso: pool_integrate.sh OUT [--repo REPO] [--unverified]
#
# Aplica los ítems `verificado` (y `sin-verificar` con --unverified). Un
# `con-stash` nunca se aplica —el ítem intentó `git stash`—, y tampoco un
# ítem con `<n>.shared-stash-anomaly`: su intervalo se solapó con una
# mutación de refs/stash que no se le puede atribuir, y queda anotado como
# `anomalia-stash-compartido: <hashes>` para revisión humana. Un parche que
# toca un archivo que otro ítem ya cambió es `conflicto: <archivo>` y no se
# aplica; uno que `git apply --check` rechaza es `no-aplica`. No commitea:
# los archivos aplicados quedan en el árbol para que quien integra los
# commitee por pathspec. Escribe OUT/integration.tsv (ítem, resultado) y una
# línea `aplicados=A conflictos=C no-aplicables=X`. Sale 0 si todo lo
# aplicable se aplicó, 1 si hubo conflicto o no-aplica, 2 si no pudo medir.
set -uo pipefail
out="${1:?falta OUT}"; shift
repo="$PWD"; unverified=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo) repo="$2"; shift 2 ;;
        --unverified) unverified=1; shift ;;
        *) echo "pool_integrate: REHUSA — opción desconocida: $1" >&2; exit 2 ;;
    esac
done
[[ -f "$out/index.tsv" ]] || { echo "pool_integrate: REHUSA — no hay $out/index.tsv" >&2; exit 2; }
git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "pool_integrate: REHUSA — $repo no es un árbol de git" >&2; exit 2; }

declare -A touched=()
applied=0; conflicts=0; unapplicable=0
: > "$out/integration.tsv"
while IFS=$'\t' read -r n _; do
    verdict="$(cat "$out/$n.verdict" 2>/dev/null || echo sin-veredicto)"
    case "$verdict" in
        verificado) ;;
        sin-verificar) [[ -n "$unverified" ]] || { printf '%s\t%s\n' "$n" "$verdict" >> "$out/integration.tsv"; continue; } ;;
        *) printf '%s\t%s\n' "$n" "$verdict" >> "$out/integration.tsv"; continue ;;
    esac
    # Un item cuyo intervalo se solapó con una mutación de refs/stash que no
    # se le puede atribuir no se integra solo: queda para revisión humana,
    # con los hashes que la originaron.
    if [[ -s "$out/$n.shared-stash-anomaly" ]]; then
        hashes="$(paste -sd, "$out/$n.shared-stash-anomaly")"
        printf '%s\tanomalia-stash-compartido: %s\n' "$n" "$hashes" >> "$out/integration.tsv"
        continue
    fi
    clash=""
    while read -r file; do
        [[ -n "$file" && -n "${touched[$file]:-}" ]] && { clash="$file"; break; }
    done < "$out/$n.files"
    if [[ -n "$clash" ]]; then
        printf '%s\tconflicto: %s\n' "$n" "$clash" >> "$out/integration.tsv"; conflicts=$((conflicts + 1)); continue
    fi
    if git -C "$repo" apply --check "$out/$n.patch" 2>/dev/null && git -C "$repo" apply "$out/$n.patch"; then
        while read -r file; do [[ -n "$file" ]] && touched[$file]=$n; done < "$out/$n.files"
        printf '%s\taplicado\n' "$n" >> "$out/integration.tsv"; applied=$((applied + 1))
    else
        printf '%s\tno-aplica\n' "$n" >> "$out/integration.tsv"; unapplicable=$((unapplicable + 1))
    fi
done < "$out/index.tsv"
echo "aplicados=$applied conflictos=$conflicts no-aplicables=$unapplicable"
[[ $((conflicts + unapplicable)) -eq 0 ]]
