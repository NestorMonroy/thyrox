# La suite tras el porte del store — y por qué su salida se leyó como vacía

Medido 2026-09-06T21:08:38 sobre `thyrox@e747b61f`.

## 1. El resultado de la suite (que era la verificación pendiente)

`suite.txt` — **141 559 bytes**, `EXIT=1`. El rojo es **heredado**, no de los
dos portes de este pase:

| Lengua | Suites | En rojo | Quién las rastrea |
|---|---|---|---|
| shell | 92 | 86, **todas** bajo `tests/legacy/` | tarea #215 |
| Python | 49 | 9 | `tests/legacy/` (8) + `tests/agents/test_agents_module_paths.py` |
| TypeScript | 281 archivos | el control de `exports` | tarea #190 |

Las dos suites del pase salen **verdes**, y su bloque está en el archivo:

```
-- tests/agents/test_measure_delta.py      (10 ok)
-- tests/agents/test_register_session.py   (13 ok)
```

Y los 9 rojos de Python son **una sola forma**, ocho veces:

```
FileNotFoundError: '/home/user/thyrox/tests/agents/agent_store.py'
FileNotFoundError: '/home/user/thyrox/tests/task/task_ids.py'
FileNotFoundError: '/home/user/thyrox/tests/reach_roots.py'
```

Tests que componen la ruta de su mecanismo contra `tests/` cuando el mecanismo
vive en `src/`. Es exactamente la misma clase que el defecto de la sección 2.

## 2. El ERROR: «la suite salió vacía»

En el turno anterior se afirmó que la salida venía vacía **por AP-5** (el
`| tail` que bufferiza). Medido: **falso**.

```
$ cd /home/user/kaupamex-docs && cat .claude/eventos/suite-.../suite.txt
(nada)

$ wc -c /home/user/thyrox/.claude/eventos/suite-.../suite.txt
141559
```

El comando corrió con `…`, así que su ruta **relativa**
se resolvió contra *ese* cwd. La lectura usó la misma ruta relativa desde
`/home/user/kaupamex-docs`. Dos cwd, una ruta relativa, dos archivos distintos
— y uno de ellos no existe.

**Por qué el defecto sobrevivió a tener una `Observation`.** La salida vacía es
una lectura real; lo que no discrimina es la causa: «el comando no produjo
nada» y «estoy mirando otro archivo» se ven **idénticas**. Es el sub-patrón D
de `metrica-decide-la-conclusion.md` aplicado a un `cat`. Y el diagnóstico que
se emitió —AP-5— era una **hipótesis presentada como causa**, sin la medición
que la habría refutado en un comando.

## 3. El arreglo: el ledger ancla la ruta, no la prosa

El mecanismo que la regla ya prescribe para esto existe
(`src/session/job_ledger.py`, la barrera de `wait-jobs.sh`) y **guardaba la
ruta tal cual**:

```python
job = Job(label=label, log=Path(log), …)      # antes
job = Job(label=label, log=Path(os.path.abspath(log)), …)   # ahora
```

`abspath` y no `resolve()`: hace falta **anclar al cwd**, no seguir symlinks —
`resolve()` reescribiría `/tmp/x` a `/private/tmp/x` donde `/tmp` sea enlace y
el ledger dejaría de devolver la ruta que el llamador nombró.

Control de anulación (caso 17 de `tests/session/test_job_ledger.py`): con el
anclaje puesto, **38 ok, 0 fallos**; revertido a `Path(log)`, cae **sólo** el
17, con el `FileNotFoundError: 'salida.log'` del episodio real.

*Métrica:* bytes del archivo, sección por lengua del corredor, y el veredicto
de la suite del ledger con y sin el anclaje.
*Ciega a:* si los 86 rojos de shell son un defecto o un alcance recién
alcanzado — eso lo tría #215, no este evento; y a cualquier consumidor que
componga la ruta del log **sin** pasar por el ledger, que sigue pudiendo
divergir.
