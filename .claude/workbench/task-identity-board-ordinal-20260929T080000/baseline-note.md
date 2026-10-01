
Estado de partida medido (antes de tu cambio): `python3 tests/task/test_task_ids.py` sale 1 con 14
`FALLA` y `python3 tests/task/test_board_sync.py` sale 1 con 9 `FALLA`. Son TODOS los casos que
invocan `src/task/task_ids.py` como programa: al correr por ruta muere con
`ModuleNotFoundError: No module named 'paths'`, porque el archivo importa `paths` sin el bootstrap
de `sys.path` que otros programas de `src/` llevan (sólo funciona a través de `bin/task_ids`, que
fija `PYTHONPATH`). El archivo es tuyo en este ítem: dale ese bootstrap con la misma forma que usan
sus hermanos de `src/` (busca cómo lo hacen, no inventes una nueva), y deja las dos suites en verde.
Dilo en tu respuesta como arreglo aparte de la identidad.
