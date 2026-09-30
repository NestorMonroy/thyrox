# ant-flat

## Qué se lanzó

```
bash -c 
bash bin/check_package_typecheck 2>&1 | tail -8
bun test tests/package/package_identity.test.ts 2>&1 | tail -3
uv run --frozen python tests/lib/test_pyproject_declares_imports.py 2>&1 | tail -2
uv run --frozen python tests/verify/test_package_boundary.py 2>&1 | tail -2
uv run --frozen python tests/verify/test_check_exports_types.py 2>&1 | tail -2
bash bin/check_exports_types 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
