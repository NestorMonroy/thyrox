#!/usr/bin/env bash
# Relanza cada archivo rojo de la suite entera, uno por uno, con su corredor.
cd /home/user/thyrox
run_one() {
  local f=$1 out
  case "$f" in
    src/packages/*) pkg=${f#src/packages/}; pkg=${pkg%%/*}; out=$(cd "src/packages/$pkg" && timeout 300 bun test "./${f#src/packages/$pkg/}" 2>&1) ;;
    *.ts) out=$(timeout 300 bun test "./$f" 2>&1) ;;
    *.py) out=$(timeout 300 .venv/bin/python "$f" 2>&1) ;;
    *.sh) out=$(timeout 300 bash "$f" 2>&1) ;;
  esac
  local code=$?
  printf '== %s exit=%s\n%s\n' "$f" "$code" "$(printf '%s\n' "$out" | grep -E '^\(fail\)|FAIL|Error|error:|not ok|AssertionError|FALLA' | head -12)"
}
export -f run_one
parallel -j3 -k run_one :::: .claude/workbench/error-sweep-129-20260928T162220/red-files.txt
