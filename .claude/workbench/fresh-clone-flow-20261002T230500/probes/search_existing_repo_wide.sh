#!/usr/bin/env bash
# Search Existing repo-wide, cuatro pasadas, sólo lectura. Adaptado de
# .claude/workbench/math-specialist-capability-20261002T211311/probes/search_existing_repo_wide.sh
# con los conceptos de este banco: identidad del commit, clon nuevo, preflight.
# Uso: search_existing_repo_wide.sh <salida> [<conceptos.tsv>]
#   conceptos.tsv: una línea por concepto, `nombre<TAB>regex`; sin él, los tres de este banco.
set -uo pipefail
ROOT="${THYROX_ROOT:-/home/user/thyrox}" O="$1"
mkdir -p "$O"
cd "$ROOT" || exit 2
EXCLUDES=(':(exclude)_references' ':(exclude)_archived' ':(exclude)*.lock' ':(exclude).claude/jobs'
          ':(exclude).claude/workbench' ':(exclude)agent-results' ':(exclude).claude/cache' ':(exclude).claude/build-logs' ':(exclude).claude/baselines' ':(exclude)**/dist/**')

declare -A TERMS
CONCEPTS=()
if [[ -n "${2:-}" ]]; then
  while IFS=$'\t' read -r concept regex; do
    [[ -z "$concept" || "$concept" == \#* ]] && continue
    TERMS[$concept]="$regex"; CONCEPTS+=("$concept")
  done < "$2"
else
  TERMS[identity]='commit[-_ ]?identity|GIT_COMMITTER|GIT_AUTHOR|noreply@anthropic|user\.email|user\.name|\bcommitter\b|AGENT_EMAILS|Co-Authored-By|THYROX_COMMIT_|gitAuthorIdentity'
  TERMS[bootstrap]='fresh[-_ ]clone|clon nuevo|clon reci[eé]n|bootstrap|onboarding|first[-_ ]run|install-hooks|hooksPath|githooks_activos|ensure_homes|write-env'
  TERMS[preflight]='preflight|toolchain_require|PROBES=|check-toolchain-ready|SIN MEDIR'
  CONCEPTS=(identity bootstrap preflight)
fi

# A — comportamiento: un término por consulta, para puntuar coincidencia.
: > "$O/A-hits.tsv"
for concept in "${CONCEPTS[@]}"; do
    IFS='|' read -ra list <<< "${TERMS[$concept]}"
    for term in "${list[@]}"; do
        git grep -lIiE "$term" -- . "${EXCLUDES[@]}" 2>/dev/null \
            | gawk -v c="$concept" -v t="$term" '{print c "\t" t "\t" $0}' >> "$O/A-hits.tsv"
    done
done
gawk -F'\t' '!seen[$1 FS $2 FS $3]++ {n[$1 FS $3]++} END {for (k in n) print n[k] "\t" k}' "$O/A-hits.tsv" \
    | sort -t$'\t' -k2,2 -k1,1nr | gawk -F'\t' '++r[$2] <= 25' > "$O/A-candidates.tsv"

# B — autoridad: definiciones en los candidatos.
: > "$O/B-definitions.tsv"
cut -f2,3 "$O/A-candidates.tsv" | while IFS=$'\t' read -r concept file; do
    [[ -f "$file" ]] || continue
    grep -nE '^export (async )?(function|class|type|interface|const) |^(async )?def [a-z_]+|^class [A-Z]|^(function )?[a-z_]+\(\) *\{' "$file" \
        | gawk -v c="$concept" -v f="$file" '{print c "\t" f "\t" substr($0,1,140)}' >> "$O/B-definitions.tsv"
done

# C — consumidores y pruebas, por nombre base.
: > "$O/C-consumers.tsv"
cut -f2,3 "$O/A-candidates.tsv" | while IFS=$'\t' read -r concept file; do
    base="$(basename "$file")"; base="${base%.*}"
    [[ ${#base} -ge 4 ]] || continue
    total="$(git grep -lIF "$base" -- . "${EXCLUDES[@]}" | grep -vxF "$file" | wc -l)"
    tests="$(git grep -lIF "$base" -- tests '**/__tests__/**' 2>/dev/null | wc -l)"
    printf '%s\t%s\t%s\t%s\n' "$concept" "$file" "$total" "$tests" >> "$O/C-consumers.tsv"
done

# D — evidencia durable: tareas, hallazgos y bancos.
: > "$O/D-stores.txt"
QUERIES=("commit identity" committer "agent identity" "fresh clone" "clon nuevo" bootstrap hooksPath preflight "generate_bin" gawk)
[[ -n "${2:-}" ]] && { QUERIES=(); for c in "${CONCEPTS[@]}"; do QUERIES+=("${c//-/ }"); done; }
for q in "${QUERIES[@]}"; do
    printf '== tareas: %s\n' "$q" >> "$O/D-stores.txt"
    bash bin/agent_store buscar-tareas --query "$q" 2>&1 | head -15 >> "$O/D-stores.txt"
    printf '== hallazgos: %s\n' "$q" >> "$O/D-stores.txt"
    bash bin/agent_store buscar-hallazgos --query "$q" 2>&1 | head -15 >> "$O/D-stores.txt"
done
WB_PATTERN="identity|identidad|committer|clone|clon|bootstrap|onboard|preflight|toolchain|githook|install"
[[ -n "${2:-}" ]] && WB_PATTERN="$(printf '%s|' "${CONCEPTS[@]}" | sed 's/|$//')"
ls .claude/workbench | grep -iE "$WB_PATTERN" > "$O/D-workbenches.txt"
wc -l "$O"/*.tsv "$O"/*.txt
