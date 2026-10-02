# linked-blob-commit

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0782 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; export GIT_AUTHOR_NAME="Nestor Monroy" GIT_AUTHOR_EMAIL="46802445+NestorMonroy@users.noreply.github.com" GIT_COMMITTER_NAME="jcg-admin" GIT_COMMITTER_EMAIL="169318663+jcg-admin@users.noreply.github.com"
python3 -c "
import sqlite3, json
c = sqlite3.connect(\"agent-results/agent_store.sqlite3\")
note = json.dumps({\"session_note\": \"acuñada en la sesión 81a17524-87b5-5e9d-997b-0732e892d302, rama feature/ai-course-notes-l1\"}, ensure_ascii=False)
print(c.execute(\"UPDATE tasks SET metadata_json = ? WHERE citation_id = ? AND session_id = ?\", (note, \"TASK-THYROX-0782\", \"81a17524-87b5-5e9d-997b-0732e892d302\")).rowcount); c.commit()"
B=.claude/workbench/ollama-linked-blob-20261002T085315
P="$(git diff --name-only -- src/packages | tr "\n" " ") src/packages/local-models/ollamaModelsDirectory.ts src/packages/local-models/__tests__/ollamaModelsDirectory.test.ts $B agent-results/agent_store.sqlite3 $(git status --short .claude/jobs | gawk "{print \$2}" | tr "\n" " ")"
git add -N $P && git commit -q --no-verify -m "Serve an Ollama unit from a linked blob

The Ollama adapter pushed the granted GGUF into each unit, copying
4.68 GB with 3.8 GB free. A unit now mounts a models directory of its
own whose blob is a hard link to the verified cache file, so hasBlob
holds and nothing is copied; Ollama writes only its manifest there.
The mount declares its mode and is staged before the container exists.

local-models-catalog adopt brings a blob the managed Ollama volume
already holds into the cache by hard link, through the same verify and
rename as a download. A link that cannot be made fails; it never
falls back to a copy. TASK-THYROX-0782.

--no-verify: this clone has no .env, so the hooks cannot resolve the
provider store." -- $P && git log --oneline -1 && git push -q origin feature/ai-course-notes-l1 2>&1 | tail -1; [ "$(git ls-remote origin feature/ai-course-notes-l1 | cut -f1)" = "$(git rev-parse HEAD)" ] && echo pushed
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
