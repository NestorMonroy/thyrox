# #129 — barrido de errores antes del Empaquetado

`sweep.sh` corre los dos gates del árbol:

- `bin/check_lint_zero`: shellcheck 0 hallazgos en 216 archivos; ruff y
  pyright, 0 hallazgos en 594 archivos.
- `bin/check_package_typecheck --no-rebuild`: 0 errores propios en 50 de 50
  paquetes.

La salida completa está en `static-sweep.txt`. La suite entera
(`tests/run.sh`) corre aparte, en `.claude/jobs/suite-129-*`.

*Métrica:* hallazgos de cada herramienta sobre los archivos que su gate
recorre.
*Ciega a:* errores en tiempo de ejecución, que sólo la suite ve, y a los
archivos que cada gate excluye por su alcance.
