# cont-T2-integrate-1790901187193789

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0754 --kind maintenance --network host -- bash -c set -uo pipefail
git -C /home/user/thyrox/.thyrox/runtime/continuation/worktrees/wb/T2-1790901120038865 add -A
git -C /home/user/thyrox/.thyrox/runtime/continuation/worktrees/wb/T2-1790901120038865 diff --cached --binary HEAD > /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/wb/outputs/T2.patch
git -C /home/user/thyrox/.thyrox/runtime/continuation/worktrees/wb/T2-1790901120038865 diff --cached --name-only HEAD > /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/wb/outputs/T2.files
owned="T2.txt"
if [ -n "$owned" ]; then
  while read -r f; do
    inside=0; for o in $owned; do case "$f" in "$o"|"$o"/*) inside=1 ;; esac; done
    [ "$inside" = 1 ] || { echo "fuera de lo declarado: $f"; exit 11; }
  done < /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/wb/outputs/T2.files
fi
cd /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/repo
if [ -s /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/wb/outputs/T2.patch ]; then
  git apply --check /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/wb/outputs/T2.patch || { echo "conflicto de integración: el parche no aplica sobre el destino"; exit 10; }
  git apply /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/wb/outputs/T2.patch
fi
paths="$(tr '\n' ' ' < /home/user/thyrox/.thyrox/runtime/continuation-frontier-e2e/20261002T003155-26006/dag/wb/outputs/T2.files) "
git add -N -- $paths 2>/dev/null || true
changed="$(git status --porcelain -- $paths | wc -l)"
[ "$changed" -gt 0 ] || { echo "sin cambios que commitear"; exit 0; }
git commit -q -m "Accept T2 of TASK-THYROX-0754 from the continuation controller" \
  -m "Delegated to fake-worker; accepted by its declared verification." -- $paths || exit 1
git worktree remove --force /home/user/thyrox/.thyrox/runtime/continuation/worktrees/wb/T2-1790901120038865
git remote get-url origin >/dev/null 2>&1 || { echo "sin origin: commit local"; exit 0; }
for i in 1 2 3 4; do git push -q origin HEAD && exit 0; sleep $((2**i)); done
exit 1

```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
