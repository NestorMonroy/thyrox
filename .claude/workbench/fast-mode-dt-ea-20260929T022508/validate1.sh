#!/usr/bin/env bash
# Validación del ítem 1 integrado: typecheck estricto y luego la suite de app-host, en serie.
cd "$(dirname "$0")/../../.." || exit 2
bash bin/check_package_typecheck --strict app-host; tc=$?
git ls-files -co --exclude-standard src/packages/app-host | grep -E '\.test\.tsx?$' | bash bin/run_ts_isolated; su=$?
echo "typecheck=$tc suite=$su"
[ $tc -eq 0 ] && [ $su -eq 0 ]
