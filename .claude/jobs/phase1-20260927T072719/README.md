# phase1

## Qué se lanzó

```
bash -c 
for p in coordination paths store task workbench shell tool-registry; do bash .claude/workbench/per-package-tests-20260927T071825/run-one.sh src/packages/$p .claude/workbench/per-package-tests-phase1-20260927T072719/results; cat .claude/workbench/per-package-tests-phase1-20260927T072719/results/$p.tsv | cut -f1,4,5,6; done
bun test tests/reference/home.test.ts tests/package 2>&1 | tail -3
bash bin/check_package_typecheck --no-rebuild coordination paths store task workbench shell tool-registry 2>&1 | tail -9
python3 src/verify/check_package_boundary.py 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
