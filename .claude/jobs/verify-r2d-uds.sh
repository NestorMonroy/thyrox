set -u
cd /home/user/thyrox
(cd src/packages/app-host && bun test src/runtime/__tests__/bootstrapRefusalFallbackRestore.test.ts src/runtime/__tests__/installCliBindingsRefusalFallbackRestore.test.ts src/runtime/__tests__/refusalFallbackRestoreWiring.test.ts src/state/__tests__/refusalFallbackRestoreDeps.test.ts 2>&1 | tail -4; echo app-host exit=$?)
(cd src/packages/local-observability && bun test src/uds 2>&1 | tail -4; echo lobs exit=$?)
python3 src/verify/check_package_typecheck.py --strict app-host local-observability 2>&1 | tail -4; echo tc exit=$?
python3 src/verify/check_env_example_coverage.py 2>&1 | tail -2
python3 src/verify/check_product_word.py 2>&1 | tail -2
