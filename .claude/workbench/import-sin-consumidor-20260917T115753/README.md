# import-sin-consumidor

## Que se pregunta

Dos de los diez rojos de Python que `python-reds-20260917T110108` destapo son
del mismo modulo de fallo: `drain_spool.py` y `anonymize_transcript.py` de
`src/agents/` **revientan al importarse** con `reach.ConsumerUnknownError`,
porque resuelven un hogar del CONSUMIDOR en una constante de nivel de modulo y
el corredor corre con cwd en el PROVEEDOR.

## Que se midio ANTES de arreglar, y cambio el arreglo

La lectura facil era reapuntar `drain_spool` al puerto que ya existe en el
proveedor —`src/hooks/error_log.py`, que es lo que TASK-THYROX-0060 pide—.
**Medido, eso habria dejado el drenador drenando un carrete que nadie
escribe:**

| modulo | `spool_path()` |
|---|---|
| consumidor, `hook_error_log` | `/home/user/kaupamex-docs/.claude/agent-results/carrete-store.jsonl` |
| proveedor, `hooks.error_log` | **rehusa** — `ResultsDirError`: `THYROX_RESULTS_DIR` no la declara nadie fuera de `.env.example` (vacia) y de su propia suite |

Y el carrete del consumidor **tiene un evento pendiente** hoy (`drain --dry-run`
→ `{'medidos': 1, 'pendientes': 1}`). Los tres hooks que lo escriben
—`inject_auto_recall.py`, `measure_subagent_delta.py`,
`register_agent_session.py`— siguen importando su propia copia.

Mismo nombre, otro referente. El puerto se adopta cuando los hooks del
consumidor tambien lo importen; hasta entonces el drenador apunta al del
consumidor, y lo dice en su docstring.

La segunda mitad de la premisa de TASK-THYROX-0060 tambien resulto falsa:
`agent_store.py` **no importa** `hook_error_log` — su unica mencion es un
comentario en la linea 137.

## El arreglo

Diferir la resolucion a la primera llamada que la necesita. Ninguno de los dos
modulos exige un consumidor para ser importado; los dos lo exigian por la forma
de la constante, no por su mecanismo. `drain_spool` gana `error_log()` y
`anonymize_transcript` cambia la constante `HOOK` por `hook_path()`.

No se usa `__getattr__` de modulo (PEP 562): medido, nadie sustituye
`anonymize_transcript.HOOK` ni `drain_spool.HOOKS` desde fuera, asi que una
funcion basta y no introduce la trampa de ERR-065 al reves.

## Que se recogio

- **rojo**: 2 de 3 aserciones fallan, exit 1.
- **verde**: 3 de 3, exit 0.
- **anulacion A** (solo `drain_spool` vuelve a pristine): reaparecen
  **exactamente** sus dos lineas, una por asercion, y **cero** menciones de
  `anonymize_transcript`.
- **anulacion B** (solo `anonymize_transcript`): **4** menciones suyas y
  **cero** de `drain_spool`.
- **conducta**: importar sin consumidor es inerte; drenar sin consumidor rehusa
  nombrando la causa; con `THYROX_CONSUMER` declarado resuelve el carrete real.

*Metrica:* aserciones en verde del control de import, mas la conducta de
`drain_spool` medida en los tres casos por separado.
*Ciega a:* si el evento pendiente del carrete se reenvia de verdad — el
`--dry-run` cuenta sin reenviar, y reenviar escribiria en el store del
consumidor, que no es sujeto de este pase.

## Lo que este banco NO cierra

`tests/session/test_installed_hooks_resolve.py` sigue en rojo. Pregunta otra
cosa —si los hooks del consumidor existen y resuelven— y es de TASK-THYROX-0076.
