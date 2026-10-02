W=.claude/workbench/pool-execution-unit-20261002T003523/outputs
cp src/session/headless-pool.sh /tmp/pool.mine
git show HEAD:src/session/headless-pool.sh > src/session/headless-pool.sh
printf '%s\n' tests/session/test-headless-pool.sh tests/session/test-headless-pool-worktree.sh \
  | parallel -j2 -k --tag "bash {} > $W/baseline-\$(basename {} .sh).txt 2>&1; echo exit=\$?"
cp /tmp/pool.mine src/session/headless-pool.sh
for f in $W/baseline-test-headless-pool.txt $W/baseline-test-headless-pool-worktree.txt; do echo "== $f"; grep -E "FALLA|FAIL" $f | cut -c1-110; done
