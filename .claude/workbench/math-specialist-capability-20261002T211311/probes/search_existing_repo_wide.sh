#!/usr/bin/env bash
# Search Existing repo-wide, cuatro pasadas, sólo lectura. Desde THYROX_ROOT
# sobre el índice de git; excluye _references, _archived, *.lock y la evidencia
# (.claude/jobs, .claude/workbench, agent-results), que se mide aparte en D.
# Uso: search_existing_repo_wide.sh <salida>
set -uo pipefail
ROOT=/home/user/thyrox O="$1"
mkdir -p "$O"
cd "$ROOT" || exit 2
EXCLUDES=(':(exclude)_references' ':(exclude)_archived' ':(exclude)*.lock' ':(exclude).claude/jobs'
          ':(exclude).claude/workbench' ':(exclude)agent-results' ':(exclude).claude/cache' ':(exclude).claude/build-logs' ':(exclude).claude/baselines' ':(exclude)**/dist/**')

declare -A TERMS
TERMS[stdin]='stdin|standard input|input source|input[-_ ]file|items?[-_ ]file|item[-_ ]source|payload[-_ ]source|\bfeed|\bpipe\b|descriptor|\bfd\b|read[-_ ]items|mapfile|redirect|< */dev/null|background input'
TERMS[math]='\bmath|mathematical|reasoning|numeric|algebra|probabilit|statistic|\bSTEM\b|benchmark|evaluation|qualif|capabilit|\bskill|task[-_ ]?class|\bsuite\b|\bscore|eligib|model[-_ ]selection|held[-_ ]out|reward|verifier'
TERMS[runtime]='contextLength|context[-_ ]length|num_ctx|OLLAMA_CONTEXT_LENGTH|kvCacheType|kv[-_ ]cache|runtime[-_ ]config|grant[-_ ]?environment|execution[-_ ]environment|unit[-_ ]environment|fingerprint|residency|runtime[-_ ]identity|ExecutionAuthorization|RuntimeContainerProfile'

# A — comportamiento: un término por consulta, para puntuar coincidencia.
: > "$O/A-hits.tsv"
for concept in stdin math runtime; do
    IFS='|' read -ra list <<< "${TERMS[$concept]}"
    for term in "${list[@]}"; do
        git grep -lIiE "$term" -- . "${EXCLUDES[@]}" 2>/dev/null \
            | gawk -v c="$concept" -v t="$term" '{print c "\t" t "\t" $0}' >> "$O/A-hits.tsv"
    done
done
# Puntuación: términos distintos por archivo y concepto; los de más arriba son candidatos.
gawk -F'\t' '!seen[$1 FS $2 FS $3]++ {n[$1 FS $3]++} END {for (k in n) print n[k] "\t" k}' "$O/A-hits.tsv" \
    | sort -t$'\t' -k2,2 -k1,1nr | gawk -F'\t' '++r[$2] <= 40' > "$O/A-candidates.tsv"
gawk -F'\t' '{split($3,p,"/"); s=p[1] (p[2] ? "/" p[2] : ""); c[$1 "\t" s]++} END {for (k in c) print c[k] "\t" k}' \
    "$O/A-hits.tsv" | sort -t$'\t' -k2,2 -k1,1nr > "$O/A-surfaces.tsv"

# B — autoridad: definiciones en los candidatos (TS, Python, shell).
: > "$O/B-definitions.tsv"
cut -f2,3 "$O/A-candidates.tsv" | while IFS=$'\t' read -r concept file; do
    [[ -f "$file" ]] || continue
    grep -nE '^export (async )?(function|class|type|interface|const) |^(async )?def [a-z_]+|^class [A-Z]|^[a-z_]+\(\) *\{' "$file" \
        | gawk -v c="$concept" -v f="$file" '{print c "\t" f "\t" substr($0,1,140)}' >> "$O/B-definitions.tsv"
done

# C — consumidores y pruebas: quién nombra cada candidato, por su nombre base.
: > "$O/C-consumers.tsv"
cut -f2,3 "$O/A-candidates.tsv" | while IFS=$'\t' read -r concept file; do
    base="$(basename "$file")"; base="${base%.*}"
    [[ ${#base} -ge 4 ]] || continue
    total="$(git grep -lIF "$base" -- . "${EXCLUDES[@]}" | grep -vxF "$file" | wc -l)"
    tests="$(git grep -lIF "$base" -- tests '**/__tests__/**' 2>/dev/null | wc -l)"
    printf '%s\t%s\t%s\t%s\n' "$concept" "$file" "$total" "$tests" >> "$O/C-consumers.tsv"
done

# Candidatos obligatorios por nombre: a qué fuente apunta cada envoltorio y su cabecera.
: > "$O/named-candidates.txt"
for b in background adopt_background thyrox-bg headless-pool run-task-pool run-task-pool-job pool_pipeline \
         parallel parallel_map inbox runner command-runtime source_copy_step stdin_probe task_continuation \
         marker_wait batch_verification rejection_sampling bie_series measure_delta step_report manifest \
         podman-execution-execute managed_execution_containment check_execution_authorization; do
    target="$(gawk '/^ *exec / {if (match($0, /src\/[A-Za-z0-9_.\/-]+\.(sh|py|ts)/)) {print substr($0, RSTART, RLENGTH); exit}}' "bin/$b")"
    { printf '== %s -> %s\n' "$b" "${target:-<sin fuente declarada>}"
      [[ -n "$target" && -f "$target" ]] && gawk 'NF && NR <= 40' "$target" | grep -E '^ *(#|"""|\*|//|/\*\*)' | head -12
      echo; } >> "$O/named-candidates.txt"
done
for d in src/learning src/testing src/workbench src/measurement src/packages/stdin-napi src/packages/command-runtime; do
    printf '== %s (%s archivos)\n' "$d" "$(git ls-files "$d" | wc -l)"
    git ls-files "$d" | gawk -F/ '{print $NF}' | head -30 | paste -sd' '
    echo
done > "$O/named-directories.txt"

# D — evidencia durable: tareas, hallazgos y bancos.
: > "$O/D-stores.txt"
for q in stdin "items" math reasoning qualification capability "context length" residency "kv cache" fingerprint runtime; do
    printf '== tareas: %s\n' "$q" >> "$O/D-stores.txt"
    bash bin/agent_store buscar-tareas --query "$q" 2>&1 | head -15 >> "$O/D-stores.txt"
    printf '== hallazgos: %s\n' "$q" >> "$O/D-stores.txt"
    bash bin/agent_store buscar-hallazgos --query "$q" 2>&1 | head -15 >> "$O/D-stores.txt"
done
ls .claude/workbench | grep -iE 'stdin|item|math|reason|qualif|capab|context|residen|grant|runtime|kv|bench|eval' > "$O/D-workbenches.txt"
wc -l "$O"/*.tsv "$O"/*.txt
