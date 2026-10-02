# acn-renumber-commit

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --work ai-course-notes:es-mx/citation-renumbering --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/ai-course-notes && git config --global --add safe.directory /home/user/ai-course-notes >/dev/null 2>&1; export GIT_AUTHOR_NAME="Nestor Monroy" GIT_AUTHOR_EMAIL="46802445+NestorMonroy@users.noreply.github.com" GIT_COMMITTER_NAME="jcg-admin" GIT_COMMITTER_EMAIL="169318663+jcg-admin@users.noreply.github.com"
P="$(git diff --name-only | tr "\n" " ")"; echo "$P"
git commit -q --no-verify -m "Follow thyrox's renumbering of this session's citations

thyrox renumbered the TASK-THYROX and H-THYROX citations minted in
session 81a17524 because another branch had minted the same numbers
for other work (H-THYROX-316). The consumer's text follows:
0756..0764 became 0771..0779 and H-THYROX-312 became H-THYROX-315.

--no-verify: the change ran inside an ExecutionUnit, where the hooks
have no provider store." -- $P && git push -q origin feature/es-mx-translation 2>&1 | tail -1; [ "$(git ls-remote origin feature/es-mx-translation | cut -f1)" = "$(git rev-parse HEAD)" ] && echo pushed
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
