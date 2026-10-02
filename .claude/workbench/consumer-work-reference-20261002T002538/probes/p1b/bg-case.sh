
: > "$WORK/runner.log"
bash "$BG" start de-consumidor --grace 10 --work ai-course-notes:cs224r/n/001 --kind test -- true >/dev/null 2>&1; rc=$?
thyrox_check "caso 7: --work se acepta en lugar de --task" "0" "$rc"
if grep -q -- "^run --work ai-course-notes:cs224r/n/001 --kind test -- true$" "$WORK/runner.log" 2>/dev/null; then
  ok "caso 7: el runner recibe la referencia de trabajo del consumidor, no una TASK"
else
  bad "caso 7: el runner no recibió --work: [$(cat "$WORK/runner.log" 2>/dev/null)]"
fi
out="$(bash "$BG" start ambas --grace 5 --task TASK-THYROX-0001 --work a:b --kind test -- true 2>&1)"; rc=$?
thyrox_check "caso 8: --task y --work juntos se rehúsan con 2" "2" "$rc"
