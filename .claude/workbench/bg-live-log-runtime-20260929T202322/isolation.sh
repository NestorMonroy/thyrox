#!/usr/bin/env bash
# Las suites de bg.sh aíslan también el runtime: ninguna deja su log vivo en el
# runtime real del árbol. Se corre cada suite y se cuenta lo que quedó.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
runtime=.thyrox/runtime/jobs
before="$(ls -A "$runtime" 2>/dev/null | sort)"
rc=0
for suite in tests/session/test-bg-familia.sh tests/session/test-bg-grace-window.sh \
             tests/session/test-bg-memfree.sh tests/session/test-bg-name-flag.sh \
             tests/session/test-gnu-time-launchers.sh tests/session/test-process-group.sh \
             tests/session/test-bg-live-log.sh; do
  output="$(bash "$suite" 2>&1)" || rc=1
  echo "$suite :: $(tail -1 <<< "$output")"
done
output="$(PYTHONPATH=src python3 tests/verify/test_step_report.py 2>&1)" || rc=1
echo "tests/verify/test_step_report.py :: $(tail -1 <<< "$output")"
after="$(ls -A "$runtime" 2>/dev/null | sort)"
leaked="$(comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after") | grep -v '^$' | grep -cv '^isolation-check-')"
echo "directorios nuevos en el runtime real (sin contar este trabajo): $leaked"
[[ "$leaked" -eq 0 ]] || rc=1
exit "$rc"
