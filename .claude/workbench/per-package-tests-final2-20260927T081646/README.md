# Diagnóstico final por paquete — tras las fases 1, 2 y 3

Comando: un trabajo `bun test <dirs __tests__>` por paquete, lanzado con
`run-task-pool` y recogido con `wait-jobs wait` (EXIT=0).

Resultado: **48 de 48 paquetes PASS, 13 607 tests, 0 fallos, exit 0 en
todos** (`results/<paquete>.tsv`, columnas: paquete, dirs, comando, exit,
tests, veredicto).

Métrica: exit de `bun test` y su conteo `pass` por paquete.
Ciega a: el aislamiento entre archivos que no comparten proceso — cada
paquete corre en su propio proceso, así que una fuga de `mock.module` entre
paquetes no aparece aquí (se midió aparte, `test-isolation-leaks-*`).
