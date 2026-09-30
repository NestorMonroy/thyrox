# provider-tsc-baseline

## Qué se lanzó

```
bash -c bunx tsc -p tsconfig.test.json --noEmit 2>&1 | gawk -F'(' '/error TS/{print $1}' | sort | uniq -c; echo ---; git stash list >/dev/null; W=$(mktemp -d); git -C /home/user/thyrox worktree add -q --detach $W HEAD && cd $W && bun install --frozen-lockfile >/dev/null 2>&1; cd $W/src/packages/provider && bunx tsc -p tsconfig.test.json --noEmit 2>&1 | gawk -F'(' '/error TS/{print $1}' | sort | uniq -c; cd /home/user/thyrox && git worktree remove --force $W
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
