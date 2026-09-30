#!/usr/bin/env bash
# Versiona el corpus extraído de 2.1.284 y lo publica en la rama de trabajo.
cd "$(git rev-parse --show-toplevel)" || exit 2
D=_references/claude-code-bin/2.1.284
git add -N "$D" || exit 1
git commit -q -F - -- "$D" <<'MSG' || exit 1
Keep the extracted 2.1.284 corpus as a reference

bin/binary extract wrote it by accident (extract takes no --help and
defaults to _references/claude-code-bin); the executor decided to keep
it, since the live binary is 2.1.284 and the ListAgents inventory
already reads from it. Same layout as 2.1.283: bunfs-root, MANIFEST,
PROVENANCE, README and the strings dump.

Refs: TASK-THYROX-0600
MSG
git log -1 --format='%h %s'
git push -q origin feature/thyrox-l6 && echo PUSHED
