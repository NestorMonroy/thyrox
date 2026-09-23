# Tres gates en disco sin registrar

`tests/verify/test_runner.py::test_every_gate_on_disk_is_registered` fallaba
(fila 21 del triaje de l6): `check_bench_untracked.py`,
`check_meta_timestamps.py` y `check_rst_toctree.py` existían sin fila en
`src/verify/registry.py`, así que el auditor no los corría. Invocados como los
invoca el corredor —sin argumentos, con el consumidor por cwd— los tres salen
0 en modo reporte; `check_rst_toctree` publica 3 entradas rotas y 387
huérfanos en `kaupamex-docs`, deuda que ahora el auditor muestra.

| Archivo | Qué es |
|---|---|
| `derivadas.txt`, `comandos.txt`, `resultado.txt` | 9 suites derivadas por `thyrox-bg` + `run-task-pool --memfree`: 8 en verde; `models.test.ts` falla igual que en l6 (`src/models.jsonl` contra el volcado 2.1.258) |
