#!/usr/bin/env bash
# Tres formas de responder «¿está este texto en el árbol de docs?», medidas
# sobre el mismo repo y el mismo patrón. Cada una con timeout 120: la que no
# termina declara su corte en vez de colgar.
set -u
REPO=/home/user/kaupamex-docs
PAT=require_pdf_text
t() { local s e; s=$(date +%s.%N); timeout 120 "$@" >/dev/null 2>&1; local rc=$?; e=$(date +%s.%N); printf '%s\t%s\t%.2f\n' "$*" "$rc" "$(echo "$e - $s" | bc)"; }
echo -e "comando\texit\tsegundos"
t grep -rl "$PAT" "$REPO/.claude"
t git -C "$REPO" grep -l "$PAT" -- .claude
t git -C "$REPO" grep -l "$PAT" HEAD -- .claude
t git -C "$REPO" log --all --oneline -S "$PAT"
echo "archivos en disco bajo .claude: $(find "$REPO/.claude" -type f | wc -l)"
echo "archivos versionados bajo .claude: $(git -C "$REPO" ls-files .claude | wc -l)"
echo "commits alcanzables (--all): $(git -C "$REPO" rev-list --all --count)"
