cd /home/user/thyrox
parallel -j2 -k --colsep '\t' 'echo "== {1}"; cd {1} && bun test {=2 uq() =} 2>&1 | tail -4' :::: .claude/workbench/step-overlap-20260925T235228/ttl-subset.tsv
