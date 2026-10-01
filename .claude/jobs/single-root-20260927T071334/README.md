# single-root

## Qué se lanzó

```
bash -c 
bun install --frozen-lockfile 2>&1 | tail -1
bun test tests/cli tests/task/extraction.test.ts tests/reference/home.test.ts tests/package 2>&1 | tail -3
for t in tests/verify/test_single_workspace_root.py tests/verify/test_package_typecheck.py tests/verify/test_provider_refresh.py tests/typescript/test_emit_declarations.py tests/typescript/test_declaration_freshness.py tests/verify/test_check_exports_types.py tests/verify/test_package_boundary.py tests/lib/test_pyproject_declares_imports.py; do PYTHONPATH=src uv run --frozen python $t 2>&1 | tail -1; done
bash bin/check_exports_types 2>&1 | tail -1
bash bin/check_package_typecheck 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
