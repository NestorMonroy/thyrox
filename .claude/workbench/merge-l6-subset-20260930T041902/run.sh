cd /home/user/thyrox
export OUT=/home/user/thyrox/.claude/workbench/merge-l6-subset-20260930T041902
run() { echo "== $*"; timeout 1200 bash -c "$*" > /dev/null 2>"$OUT/err-$N.txt"; echo "RESULT $N exit=$?"; N=$((N+1)); }
N=1
run "cd src/packages/swarm && bun test"
run "cd src/packages/local-observability && bun test"
run "cd src/packages/swarm && ../../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json"
run "cd src/packages/local-observability && ../../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json"
run "PATH=/home/user/thyrox/.venv/bin:\$PATH bash tests/lib/test-toolchain-index-refresh.sh"
