#!/usr/bin/env bash
# Validación del ítem 2 integrado: typecheck estricto y suites que tocan fastMode o surfaceCapabilities, en serie.
cd "$(dirname "$0")/../../.." || exit 2
B=.claude/workbench/fast-mode-dt-ea-20260929T022508
bash bin/check_package_typecheck --strict provider app-host; tc=$?
bash bin/run_ts_isolated < "$B/suite2.txt"; su=$?
echo "typecheck=$tc suite=$su"
[ $tc -eq 0 ] && [ $su -eq 0 ]
