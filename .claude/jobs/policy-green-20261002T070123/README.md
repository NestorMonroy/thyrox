# policy-green

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0763 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; python3 .claude/workbench/policy-source-selector-20261002T070024/probes/impl.py && (cd src/packages/provider && bun test __tests__/recommendExecution.test.ts 2>&1 | tail -4; bunx tsc --noEmit -p . 2>&1 | grep -E 'executionPolicy|cost/policy' | head -5; echo tsc-done) | tee .claude/workbench/policy-source-selector-20261002T070024/outputs/green.txt; for t in tests/session/test-headless-pool-model-policy.sh tests/session/test-headless-pool-local-model-e2e.sh; do bash $t > .claude/workbench/policy-source-selector-20261002T070024/outputs/regress-$(basename $t .sh).txt 2>&1; echo "$t exit=$?"; tail -2 .claude/workbench/policy-source-selector-20261002T070024/outputs/regress-$(basename $t .sh).txt; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
