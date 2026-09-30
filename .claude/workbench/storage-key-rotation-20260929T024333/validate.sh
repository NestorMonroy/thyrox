#!/usr/bin/env bash
# Typecheck estricto de provider y las suites del cifrador, en serie.
cd "$(dirname "$0")/../../.." || exit 2
B="$(dirname "$0")"
bash bin/check_package_typecheck --strict provider; tc=$?
bash bin/run_ts_isolated < "$B/suite.txt"; su=$?
echo "typecheck=$tc suite=$su"
[ $tc -eq 0 ] && [ $su -eq 0 ]
