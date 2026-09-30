# emit-tests

## Qué se lanzó

```
bash -c for t in tests/typescript/test_emit_declarations.py tests/package/test_packages_home.py tests/verify/test_package_typecheck.py tests/verify/test_provider_refresh.py; do python3 $t >/dev/null 2>&1; echo "$t exit=$?"; done; bash tests/verify/test_package_root_resolution.sh >/dev/null 2>&1; echo "root_resolution exit=$?"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
