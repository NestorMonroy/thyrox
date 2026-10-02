# bench-regularize-acn

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --work ai-course-notes:workbench/bench-convention --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/ai-course-notes && git config --global --add safe.directory /home/user/ai-course-notes >/dev/null 2>&1; B=/home/user/thyrox/.claude/workbench/bench-convention-20261002T062507/probes
python3 $B/regularize_benches.py --plan $B/plan.json --encargos $B/encargos.json --apply ai-course-notes && rm -rf $B/__pycache__ && git status --short | head -20
export GIT_AUTHOR_NAME="Nestor Monroy" GIT_AUTHOR_EMAIL="46802445+NestorMonroy@users.noreply.github.com" GIT_COMMITTER_NAME="jcg-admin" GIT_COMMITTER_EMAIL="169318663+jcg-admin@users.noreply.github.com"
git commit -q --no-verify -m "Regularize the executor and image benches

Both benches were created by hand with a date-only suffix. They now
carry the run name thyrox bin/manifest scaffold derives (the instant
of their first commit), the five-key manifest declaration and the
template README sections, as thyrox TASK-THYROX-0762 did for its own.

--no-verify: the regularization ran inside an ExecutionUnit, where
the hooks have no provider store." -- .claude/workbench && git log --oneline -1 && git push -q origin feature/es-mx-translation 2>&1 | tail -2; git ls-remote origin feature/es-mx-translation; git rev-parse HEAD
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
