W=.claude/workbench/executor-qwen-20261002T010314/outputs
F="tools/scripts/translation_loop.py tools/scripts/translate_wave.sh tests/test_translation_loop.py"
mkdir -p /tmp/p7keep; for f in $F; do cp $f /tmp/p7keep/$(basename $f); git show HEAD:$f > $f; done
uv run --locked pytest -q -rf tests/test_translation_loop.py > $W/baseline-unit.txt 2>&1
for f in $F; do cp /tmp/p7keep/$(basename $f) $f; done
grep -E "^FAILED" $W/green-unit.txt | gawk '{print $2}' | sed 's/ .*//' | sort > /tmp/after
grep -E "^FAILED" $W/baseline-unit.txt | gawk '{print $2}' | sed 's/ .*//' | sort > /tmp/before
echo "línea base: $(wc -l < /tmp/before) fallos · con P7: $(wc -l < /tmp/after)"
echo "sólo con P7:"; comm -13 /tmp/before /tmp/after
echo "sólo en la línea base:"; comm -23 /tmp/before /tmp/after
grep -h -oE "falta [a-z]+|ERROR — [^;]{0,60}" $W/baseline-unit.txt | sort | uniq -c | sort -k1nr | head -4
git diff --stat -- $F | tail -1
