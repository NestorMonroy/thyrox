#!/usr/bin/env bash
# Perfil de candidatos para Search Existing: responsabilidad (docstring),
# entradas (opciones de CLI y parámetros), salidas y persistencia (escrituras),
# consumidores y pruebas. Sólo lectura.
# Uso: profile_candidates.sh <salida>
set -uo pipefail
ROOT=/home/user/thyrox O="$1"
mkdir -p "$O"
cd "$ROOT" || exit 2
EXCLUDES=(':(exclude)_references' ':(exclude)_archived' ':(exclude).claude' ':(exclude)agent-results' ':(exclude)**/dist/**')

# Resuelve un nombre de bin/ a la fuente que su línea `exec` ejecuta.
source_of_bin() {
    gawk '/^ *exec / {if (match($0, /src\/[A-Za-z0-9_.\/-]+\.(sh|py|ts)/)) {print substr($0, RSTART, RLENGTH); exit}}' "bin/$1"
}

profile() {
    local group="$1" file="$2" base
    [[ -f "$file" ]] || { printf '== [%s] %s — AUSENTE\n\n' "$group" "$file"; return; }
    base="$(basename "$file")"; base="${base%.*}"
    printf '== [%s] %s\n' "$group" "$file"
    printf -- '-- responsabilidad:\n'
    gawk 'NR <= 60' "$file" | grep -E '^ *(#|"""|\*|//|/\*\*)|^[A-Za-z].*"""' | grep -vE '^#!|^# *=+$' | head -6 | cut -c1-160
    printf -- '-- entradas:\n'
    grep -nE 'add_argument\(|^\s+--[a-z][a-z-]*\)|export (async )?function [A-Za-z]+\(|^def [a-z_]+\(' "$file" | head -8 | cut -c1-160
    printf -- '-- salidas/persistencia:\n'
    grep -nE 'write_text|json\.dump|open\(.*["\x27][wa]|sqlite3\.connect|INSERT|writeFile|appendFile|> *"\$|>> *"\$' "$file" | head -5 | cut -c1-160
    printf -- '-- consumidores: %s · pruebas: %s\n' \
        "$(git grep -lIF "$base" -- . "${EXCLUDES[@]}" | grep -vxF "$file" | grep -vcE '(^tests/|__tests__)')" \
        "$(git grep -lIF "$base" -- tests '**/__tests__/**' 2>/dev/null | wc -l)"
    git grep -lIF "$base" -- . "${EXCLUDES[@]}" | grep -vxF "$file" | grep -vE '(^tests/|__tests__)' | head -4 | sed 's/^/   consumer: /'
    echo
}

# Q4 — mecanismos de evaluación y medición.
{
    for f in $(git ls-files src/learning src/measurement src/testing src/workbench | grep -E '\.py$' | grep -v __init__); do profile eval "$f"; done
    for b in batch_verification rejection_sampling annulment_control bie_series measure_delta step_report runner manifest; do
        if [[ -e "bin/$b" ]]; then profile "eval:bin/$b" "$(source_of_bin "$b")"; else printf '== [eval:bin/%s] AUSENTE en bin/\n\n' "$b"; fi
    done
    for f in src/packages/local-models/qualifyModel.ts src/packages/local-models/taskSuite.ts src/packages/local-models/qualifyCommand.ts \
             $(git ls-files 'src/packages/local-models/*mbedding*Suite*.ts' 'src/packages/local-models/*suite*.ts' | grep -v __tests__); do
        profile eval:qualification "$f"
    done
    printf '== suites versionadas\n'; git ls-files 'src/packages/**/suites/*.json' '**/suites/*.json' | sort -u; echo
    printf '== src/verify con vocabulario de evaluación (suite|score|verdict|case|held)\n'
    git grep -cIE 'suite|score|verdict|held[-_ ]out|cases?\b' -- 'src/verify/*.py' | sort -t: -k2,2nr | head -15
} > "$O/Q4-evaluation-candidates.txt"

# Q1 — quién adjunta la entrada estándar a un trabajo.
{
    for b in thyrox-bg background adopt_background run-task-pool run-task-pool-job runner command-runtime source_copy_step; do
        src="$(source_of_bin "$b")"; printf '== [stdin:bin/%s] %s\n' "$b" "${src:-<sin fuente>}"
        [[ -n "$src" && -f "$src" ]] && grep -nE 'stdin|< */dev/null|DEVNULL|PIPE|input[-_ ]?source|::::|mapfile|read -r' "$src" | head -8 | cut -c1-170
        echo
    done
    printf '== [stdin] src/packages/stdin-napi\n'; sed -n 1,25p src/packages/stdin-napi/README.md | cut -c1-170; echo
    printf '== quién lanza bg.sh (consumidores de thyrox-bg start)\n'
    git grep -nIE 'thyrox-bg"? start|bg\.sh"? start' -- src bin tests ':(exclude)**/dist/**' | gawk -F: '{print $1}' | sort | uniq -c | sort -rn | head -15
} > "$O/Q1-stdin-candidates.txt"

# Q8 — gates existentes que podrían alojar la regla de Search Existing.
{
    for g in check_premise_drift check_consumer_anchor check_durable_path_ownership check_role_abstraction check_rule_divergence \
             check_absence_claim check_stand_ins check_unreachable_rules implementation_order mechanism_registry mechanisms; do
        src=""; [[ -e "bin/$g" ]] && src="$(source_of_bin "$g")"
        [[ -z "$src" ]] && src="$(git ls-files "src/**/$g.py" "src/**/$g.ts" "src/**/$g.sh" | head -1)"
        if [[ -n "$src" ]]; then profile "gate:$g" "$src"; else printf '== [gate:%s] AUSENTE\n\n' "$g"; fi
    done
    printf '== otros candidatos por nombre (registry|catalog|discover|existing|absence|reuse)\n'
    git ls-files 'src/**' 'bin/*' | grep -iE 'registry|catalog|discover|existing|absence|reuse|mechanism' | grep -vE '__tests__|/dist/|/testing/' | head -30
} > "$O/Q8-gate-candidates.txt"
wc -l "$O"/*.txt
