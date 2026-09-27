# final-suite

## Qué se lanzó

```
bash -c bash tests/run.sh > .claude/workbench/sustitutos-20260927T025549/final/suite.out 2>&1; echo EXIT=$? >> .claude/workbench/sustitutos-20260927T025549/final/suite.out; (bunx tsc --noEmit -p tsconfig.json > .claude/workbench/sustitutos-20260927T025549/final/root-tsc.out 2>&1; echo EXIT=$? >> .claude/workbench/sustitutos-20260927T025549/final/root-tsc.out); (PYTHONPATH=src .venv/bin/python src/verify/check_package_typecheck.py --strict > .claude/workbench/sustitutos-20260927T025549/final/pkg.out 2>&1; echo EXIT=$? >> .claude/workbench/sustitutos-20260927T025549/final/pkg.out); (bash bin/check_lint_zero > .claude/workbench/sustitutos-20260927T025549/final/lint.out 2>&1; echo EXIT=$? >> .claude/workbench/sustitutos-20260927T025549/final/lint.out)
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
