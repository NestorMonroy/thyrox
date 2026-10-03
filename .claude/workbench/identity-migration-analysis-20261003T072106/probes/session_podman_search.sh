#!/usr/bin/env bash
# EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
# no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
# Search Existing por comportamiento: reinicio de sesión / de la VM y ciclo de
# vida de Podman. Recorre bin/, src/, tests/, .githooks/, .claude/rules y el
# store de hallazgos y tareas. Sólo lee.
set -u
cd "${1:?raíz}"; OUT="${2:?salida}"
SESSION='restart|reboot|reinici|resume|session[-_]start|sessionstart|startup|recover|rehydrat|reconcil|stale|orphan|alive|epoch'
PODMAN='podman|lock[-_ ]?(balance|recovery)|renumber|infrastructure[-_]ensure|materializ|primitive|runroot|tmp_dir|libpod'
# 1. los ejecutables de bin/ por nombre y por la pieza a la que apuntan
for f in bin/*; do
  t="$(grep -oE 'src/[^" ]+' "$f" 2>/dev/null | head -1)"
  printf '%s\t%s\n' "${f#bin/}" "${t:-<sin destino>}"
done > "$OUT/bin-targets.tsv"
grep -iE "$SESSION" "$OUT/bin-targets.tsv" > "$OUT/bin-session.tsv"
grep -iE "$PODMAN|infra|ollama|postgres|redis" "$OUT/bin-targets.tsv" > "$OUT/bin-podman.tsv"
# 2. código y pruebas por comportamiento (versionado)
git grep -lEi "$SESSION" -- src bin .githooks ':(exclude)src/packages/*/node_modules/*' > "$OUT/code-session-files.txt"
git grep -lEi "$PODMAN" -- src bin .githooks ':(exclude)src/packages/*/node_modules/*' > "$OUT/code-podman-files.txt"
git grep -lEi "$SESSION" -- tests > "$OUT/tests-session-files.txt"
git grep -lEi "$PODMAN" -- tests > "$OUT/tests-podman-files.txt"
comm -12 <(sort "$OUT/code-session-files.txt") <(sort "$OUT/code-podman-files.txt") > "$OUT/code-session-x-podman.txt"
# 3. reglas
git grep -nEi "$SESSION|$PODMAN" -- .claude/rules > "$OUT/rules-hits.txt"
# 4. cableado declarado de la sesión
git grep -nE "SessionStart|startup|session-start|session_restart|reconcile|sweep-orphans|infrastructure_ensure" -- src/session/user_wiring.py src/session/session-start.sh > "$OUT/wiring-hits.txt"
# 5. store
for q in reinicio reboot "session restart" "podman lock" "infrastructure_ensure" "running sin proceso" "stale runtime"; do
  printf '== %s\n' "$q"; bash bin/agent_store buscar-hallazgos --query "$q" 2>&1 | head -8 | cut -c1-200
done > "$OUT/store-findings.txt"
for q in restart reboot podman lock recovery; do
  printf '== %s\n' "$q"; bash bin/agent_store buscar-tareas --query "$q" 2>&1 | head -8 | cut -c1-200
done > "$OUT/store-tasks.txt"
wc -l "$OUT"/*
