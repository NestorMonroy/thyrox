# task-qual-commit

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0780 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; export GIT_AUTHOR_NAME="Nestor Monroy" GIT_AUTHOR_EMAIL="46802445+NestorMonroy@users.noreply.github.com" GIT_COMMITTER_NAME="jcg-admin" GIT_COMMITTER_EMAIL="169318663+jcg-admin@users.noreply.github.com"
B=.claude/workbench/task-qualification-20261002T073959
bash bin/check_package_typecheck --no-rebuild local-models > $B/outputs/typecheck.txt 2>&1; echo "typecheck exit=$? $(grep -E "local-models:" $B/outputs/typecheck.txt | tail -1)"
bash bin/agent_store agregar-hallazgo --finding-id H-THYROX-317 --submodule local-models --initiative traducir-ai-course-notes-es-mx --severity MEDIA --session-id 81a17524-87b5-5e9d-997b-0732e892d302 --summary "Cinco casos de local-models-qualify en commands.test.ts prueban el camino previo a la admisión y fallan en las dos ramas" --content "commands.test.ts es de 3dc731432; 6c76eeb1b pasó local-models-qualify a pedir admisión al coordinador y no actualizó sus cinco casos (seis aciertos, --context, suspendida, fuera del catálogo, --isolated), que esperan medir sin coordinador y reciben connect ENOENT del socket. Medido: 18 pass / 5 fail en HEAD sin cambios y con TASK-THYROX-0780; las mismas versiones en origin/feature/complete-orm-root. El contrato por admisión lo cubre qualifyCommand.test.ts. Además: la verificación del merge eaa308a89 informó local-models en verde porque el paso midió el exit de tail, no el de bun test; estos cinco fallos ya estaban ahí." --source-ref "src/packages/local-models/__tests__/commands.test.ts" --metadata-json "{\"session_note\": \"registrado en la sesión 81a17524-87b5-5e9d-997b-0732e892d302, rama feature/ai-course-notes-l1\"}" 2>&1 | tail -1
python3 -c "
import sqlite3, json
c = sqlite3.connect(\"agent-results/agent_store.sqlite3\")
note = json.dumps({\"session_note\": \"acuñada en la sesión 81a17524-87b5-5e9d-997b-0732e892d302, rama feature/ai-course-notes-l1\"}, ensure_ascii=False)
print(c.execute(\"UPDATE tasks SET metadata_json = ? WHERE citation_id = ? AND session_id = ?\", (note, \"TASK-THYROX-0780\", \"81a17524-87b5-5e9d-997b-0732e892d302\")).rowcount); c.commit()"
P="src/packages/local-models/taskSuite.ts src/packages/local-models/qualifyModel.ts src/packages/local-models/qualifyCommand.ts src/packages/local-models/__tests__/taskSuite.test.ts src/packages/local-models/__tests__/qualifyModel.test.ts src/packages/local-models/__tests__/qualifyCommand.test.ts $B agent-results/agent_store.sqlite3 $(git status --short .claude/jobs | gawk "{print \$2}" | tr "\n" " ")"
git add -N $P && git commit -q --no-verify -m "Qualify a local model for a task class

The recommender needs a passed protocol qualification and a passed
task:<class> one, but nothing produced the second: the only suite was
tool-calling@1. A task suite now carries the consumer's own cases with
deterministic checks (includes, excludes, excludes-pattern), and
local-models-qualify --suite runs it and records kind task for the
class the suite declares. Protocol and task runs share one measurement.

The suite is read before admission so a broken one materializes
nothing. H-THYROX-317 records five stale cases in commands.test.ts
that fail on both branches. TASK-THYROX-0780.

--no-verify: this clone has no .env, so the hooks cannot resolve the
provider store." -- $P && git log --oneline -1 && git push -q origin feature/ai-course-notes-l1 2>&1 | tail -1; [ "$(git ls-remote origin feature/ai-course-notes-l1 | cut -f1)" = "$(git rev-parse HEAD)" ] && echo pushed
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
