#!/usr/bin/env bash
# Search Existing repo-wide para la distribución de container images: cuatro
# pasadas (comportamiento, autoridad, consumidores, evidencia durable). Sólo
# lectura. Uso: search_existing_images.sh <salida>
set -uo pipefail
ROOT=/home/user/thyrox O="$1"
mkdir -p "$O"; cd "$ROOT" || exit 2
EXCLUDES=(':(exclude)_references' ':(exclude)_archived' ':(exclude)*.lock' ':(exclude)**/dist/**' ':(exclude).claude/cache'
          ':(exclude).claude/build-logs' ':(exclude).claude/baselines' ':(exclude).claude/jobs' ':(exclude).claude/workbench' ':(exclude)agent-results')
declare -A TERMS
TERMS[registry]='image[-_ ]?registry|container image|OCI image|OCI registry|publish(Image| image)|push(Image| image)|registry[-_ ]?mirror|pull[-_ ]?through|\bmirror'
TERMS[cache]='image cache|build[-_ ]?cache|cache[-_ ]?(from|to|import|export)|layer cache|warm cache|prefetch|preload'
TERMS[lifecycle]='image lifecycle|io\.thyrox\.image\.lifecycle|lifecycle[-_ ]?(cache|permanent)|permanent image|cache image|\bGC\b|garbage|orphan|prune|retention'
TERMS[identity]='image identity|image digest|manifest digest|repoDigest|PinnedImageReference|digest pin|immutable reference|canonicalReference'
TERMS[provenance]='provenance|source image|derivative image|upstream image|base image|derivedFrom|org\.opencontainers\.image\.(source|base)'
TERMS[install]='ensure[-_ ]?image|ensureImage|install profile|installation manifest|runtime manifest|dependency closure|bootstrap|preload|clone_bootstrap|install\.sh'
TERMS[build]='Containerfile|Dockerfile|podma[n] build|buildah|buildImage|build-image'
TERMS[archive]='podma[n] (save|load)|image (save|load)|\bOCI layout\b|oci-archive|docker-archive|export image|import image|skopeo'
TERMS[security]='secret scan|scan(ning)? (the )?image|credential (file|leak)|run_secret_scanning|detect[-_ ]?secret|sensitivity'
TERMS[semantic]='semantic[-_ ]?search[-_ ]?ingest|SemanticSearchStore|experience ingestion|\bIntent\b.*\bMechanism\b|ingest[-_ ]?(document|record)'
: > "$O/A-hits.tsv"
for concept in "${!TERMS[@]}"; do
    IFS='|' read -ra list <<< "${TERMS[$concept]}"
    for term in "${list[@]}"; do
        git grep -lIiE "$term" -- . "${EXCLUDES[@]}" 2>/dev/null | gawk -v c="$concept" -v t="$term" '{print c "\t" t "\t" $0}' >> "$O/A-hits.tsv"
    done
done
gawk -F'\t' '!seen[$1 FS $2 FS $3]++ {n[$1 FS $3]++} END {for (k in n) print n[k] "\t" k}' "$O/A-hits.tsv" \
    | sort -t$'\t' -k2,2 -k1,1nr | gawk -F'\t' '++r[$2] <= 25' > "$O/A-candidates.tsv"

source_of_bin() { gawk '/^ *exec / {if (match($0, /src\/[A-Za-z0-9_.\/-]+\.(sh|py|ts)/)) {print substr($0, RSTART, RLENGTH); exit}}' "bin/$1"; }
profile_dir() {
    local d="$1"; printf '== %s (%s archivos versionados)\n' "$d" "$(git ls-files "$d" | wc -l)"
    [[ -f "$d/README.md" ]] && gawk 'NF' "$d/README.md" | head -8 | cut -c1-170
    git ls-files "$d" | grep -vE '__tests__|/testing/|\.json$|bunfig|tsconfig' | grep -E '\.(ts|py|sh)$' | head -40 | while read -r f; do
        printf '  %s :: %s\n' "$f" "$(grep -hE '^export (async )?(function|class|interface|type|const) [A-Za-z]+' "$f" | sed -E 's/^export (async )?(function|class|interface|type|const) ([A-Za-z0-9_]+).*/\3/' | head -8 | paste -sd, -)"
    done; echo
}
{
    for d in src/packages/image-registry src/packages/artifact-registry src/packages/podman-execution src/packages/infrastructure \
             src/packages/registry-credentials src/packages/local-models src/packages/model-artifacts src/packages/daemon \
             src/packages/storage src/packages/semantic-search src/packages/store; do
        if git ls-files "$d" | grep -q .; then profile_dir "$d"; else printf '== %s — AUSENTE\n\n' "$d"; fi
    done
    for b in artifact-registry-publish-artifact podman-execution-execute podman_capabilities infrastructure-bootstrap infrastructure_ensure \
             clone_bootstrap packaging-reachability container_measure storage; do
        if [[ -e "bin/$b" ]]; then printf '== bin/%s -> %s\n' "$b" "$(source_of_bin "$b")"; else printf '== bin/%s — AUSENTE\n' "$b"; fi
    done
    printf '\n== bin/ con vocabulario de imagen, registry, cache, install\n'
    ls bin | grep -iE 'image|regist|cache|install|bootstrap|preload|ensure|oci|artifact|semantic|ingest|gc|prune|orphan'
} > "$O/B-candidates.txt"

: > "$O/D-stores.txt"
for q in image registry mirror "build cache" preload install provenance digest "Docker Hub" th3rox quantizer "task-runner" "semantic search" prune orphan "garbage"; do
    printf '== tareas: %s\n' "$q" >> "$O/D-stores.txt"; bash bin/agent_store buscar-tareas --query "$q" --limit 25 2>&1 >> "$O/D-stores.txt"
    printf '== hallazgos: %s\n' "$q" >> "$O/D-stores.txt"; bash bin/agent_store buscar-hallazgos --query "$q" 2>&1 | head -25 >> "$O/D-stores.txt"
done
ls .claude/workbench | grep -iE 'image|regist|oci|quantiz|runner|podman|artifact|preload|install|bootstrap|mirror|cache|semantic|corpus' > "$O/D-workbenches.txt"
wc -l "$O"/*
