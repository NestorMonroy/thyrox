# wait-jobs: la espera se ve viva

Episodio 2026-09-23: `wait-jobs wait --timeout 540 | tail -25` pasó minutos
sin salida mientras la suite de partida terminaba. No estaba colgado: el bucle
de `wait` sólo imprimía al asentar todos o al vencer el plazo.

| Archivo | Qué es |
|---|---|
| `rojo.txt` | `tests/session/test-wait-jobs.sh` con los 5 casos nuevos y sin implementación: 40 ok, 4 fallos (`--heartbeat` no existía, exit 64) |
| `verde.txt` | con `--heartbeat`: 44 ok, 0 fallos |
| `anulado-latido.txt` | sin la línea `esperando:` cae sólo «stderr late mientras uno sigue vivo» (43/1) |
| `anulado-asentado.txt` | sin la línea `asentado:` cae sólo «stderr anuncia el primero que asienta» (43/1) |
| `derivadas.txt`, `comandos.txt` | subconjunto derivado con `tests/run.sh --changed-list`, más `test_env_contract_keys.py` |
| `pool.txt` | las 13 suites por `bin/run-task-pool --width 2`: 13 OK, pool rc=0 |
