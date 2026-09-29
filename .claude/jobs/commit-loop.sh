#!/usr/bin/env bash
# Commit por pathspec reintentado: los pools vivos escriben archivos nuevos en sus bancos mientras corren los hooks.
set -u
msg="$1"; shift
for i in 1 2 3 4 5; do
  git add -N .claude/workbench .claude/jobs "$@" 2>/dev/null
  if git commit -q -F "$msg" -- .claude/workbench .claude/jobs "$@"; then
    git push -q -u origin "$(git branch --show-current)" && git log -1 --format='%h %s'
    exit $?
  fi
  echo "intento $i rechazado; reintento"
done
exit 1
