# pool-context-commit

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0781 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; export GIT_AUTHOR_NAME="Nestor Monroy" GIT_AUTHOR_EMAIL="46802445+NestorMonroy@users.noreply.github.com" GIT_COMMITTER_NAME="jcg-admin" GIT_COMMITTER_EMAIL="169318663+jcg-admin@users.noreply.github.com"
bash bin/agent_store agregar-hallazgo --finding-id H-THYROX-318 --submodule session --initiative traducir-ai-course-notes-es-mx --severity BAJA --session-id 81a17524-87b5-5e9d-997b-0732e892d302 --summary "test-headless-pool.sh falla una aserción de admisión de VRAM en HEAD, sin relación con el contexto" --content "La aserción «admision: la reserva ajena sigue en el registro» (esperado 900) falla 147/148 en un worktree de HEAD, en dos corridas, y con TASK-THYROX-0781 aplicado. Medido al verificar TASK-THYROX-0781; no se corrigió dentro de esa tarea." --source-ref "tests/session/test-headless-pool.sh" --metadata-json "{\"session_note\": \"registrado en la sesión 81a17524-87b5-5e9d-997b-0732e892d302, rama feature/ai-course-notes-l1\"}" 2>&1 | tail -1
python3 -c "
import sqlite3, json
c = sqlite3.connect(\"agent-results/agent_store.sqlite3\")
note = json.dumps({\"session_note\": \"acuñada en la sesión 81a17524-87b5-5e9d-997b-0732e892d302, rama feature/ai-course-notes-l1\"}, ensure_ascii=False)
print(c.execute(\"UPDATE tasks SET metadata_json = ? WHERE citation_id = ? AND session_id = ?\", (note, \"TASK-THYROX-0781\", \"81a17524-87b5-5e9d-997b-0732e892d302\")).rowcount); c.commit()"
B=.claude/workbench/pool-context-tokens-20261002T074707
P="src/session/headless-pool.sh tests/session/test-headless-pool-model-policy.sh $B agent-results/agent_store.sqlite3 $(git status --short .claude/jobs | gawk "{print \$2}" | tr "\n" " ")"
git add -N $P && git commit -q --no-verify -m "Let headless-pool declare its items' context

The pool asked the recommender with no context, so it required the
126029-token subagent floor, which no 32k local model reaches even
when qualified. Translation items measured p90 13406 tokens per turn
over 400 earlier items. --context-tokens N now reaches the recommender
as --context N; without it the default is unchanged. TASK-THYROX-0781.

--no-verify: this clone has no .env, so the hooks cannot resolve the
provider store." -- $P && git log --oneline -1 && git push -q origin feature/ai-course-notes-l1 2>&1 | tail -1; [ "$(git ls-remote origin feature/ai-course-notes-l1 | cut -f1)" = "$(git rev-parse HEAD)" ] && echo pushed
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
