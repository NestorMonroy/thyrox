cd /home/user/thyrox
B=/home/user/thyrox/.claude/workbench/ink-typecheck-before-after-20260930T042500
W=$B/wt-before
git worktree add -q --detach "$W" 6dd8cf71c
ln -s /home/user/thyrox/node_modules "$W/node_modules"
for side in before after; do
  root=/home/user/thyrox; [ $side = before ] && root="$W"
  for p in swarm local-observability; do
    for cfg in tsconfig.test.json tsconfig.build.json; do
      [ -f "$root/src/packages/$p/$cfg" ] || { echo "$side $p $cfg absent"; continue; }
      (cd "$root/src/packages/$p" && timeout 900 /home/user/thyrox/node_modules/.bin/tsc --noEmit -p $cfg) > "$B/$side-$p-$cfg.txt" 2>&1
      echo "$side $p $cfg exit=$? errores=$(grep -c 'error TS' "$B/$side-$p-$cfg.txt")"
    done
  done
done
git worktree remove --force "$W"; git worktree prune
