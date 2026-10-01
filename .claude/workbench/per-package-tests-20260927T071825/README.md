# Diagnostico de pruebas por paquete (sin tocar codigo productivo)

Un `bun test` propio por paquete, lanzado desde la RAIZ de thyrox y apuntando
solo a sus carpetas `__tests__`: desde la raiz del paquete no carga el preload
del `bunfig.toml` raiz (medido: sin `TMPDIR` ni `THYROX_STORE` propios), y las
pruebas escribirian en el `/tmp` y el store reales.

- `run-one.sh`: un paquete -> `results/<paquete>.tsv` y `.log`.
- `jobs.txt`: 48 trabajos para `bin/run-task-pool --width 2`.
- `aggregate.sh`: tabla y codigo global (2 si falta `__tests__`, con
  prioridad sobre 1 por pruebas fallidas).
- `report.md`: la tabla. `missing-context.txt`: si los paquetes sin
  `__tests__` tienen pruebas en `tests/<paquete>`. `stray-tests.txt`: pruebas
  fuera de `__tests__`.

*Metrica:* carpetas llamadas exactamente `__tests__` bajo cada paquete, y el
exit y la linea `Ran N tests` de su `bun test`.
*Ciega a:* pruebas del paquete que viven fuera de el (`thyrox/tests/<paquete>`)
y archivos `*.test.*` fuera de `__tests__`, que se reportan aparte y no se
ejecutan aqui.
