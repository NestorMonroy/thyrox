# porte-manifest-a-python

## El encargo

> «el problema no era eliminarlo, era ponerlo en una ruta donde se pueda guardar
> y consumir de manera regular ya que se podría decir que es azúcar sintáctica,
> cosas que hace vvv, analiza, documenta e implementa»

> «Si `workbench_dir` está hecho para que se maneje todo, está mal, porque es
> solo una parte más […] todavía existe alguien más arriba que él, como lo hacen
> en vvv, analiza, documenta e implementa, quizá nos falta implementar ese algo»

## La premisa, corregida al medir

El redirect era correcto y su conclusión operativa, no. **`workbench_dir` no
gobierna nada** — es 1 de las 28 claves de `.env.example`. Pero «alguien más
arriba» **ya existe**, y no había que construirlo:

| VVV | thyrox |
|---|---|
| `vvv-custom.yml` | `.env` — 28 claves declaradas en `.env.example`, 6 con valor |
| `VVV_CONFIG=/vagrant/vvv-custom.yml` (`provision.sh:22`) | `THYROX_ENV_FILE` |
| `provision-helpers.sh` | `src/paths/reach.py` · `src/lib/reach.sh` |
| `vvv_get_sites()` (`:943`) + `export -f` (`:948`) | `thyrox_config_value` + `export -f` |
| — (VVV no lleva registro de sus defaults) | `src/paths/declarations.py` |

`python3 src/paths/declarations.py` publica hoy: **13 hogares · 2 declarados ·
11 que resuelve THYROX**. Ése es el gobernador, con el contrato DEC-04 de dos
entradas —el valor y la ruta al archivo que lo declara— y `write-env.sh` como
su emisor.

**El hueco real estaba DEBAJO, no encima.** El ciclo de vida de un *run* existía
sólo en TypeScript:

| Superficie | acuñar | resolver | archivo de trabajo |
|---|---|---|---|
| TypeScript | `runIdFor` | `runsFor` / `latestRun` | — |
| Python | **ausente** | **ausente** | — |
| shell | **ausente** | **ausente** | `thyrox_work_file` (recibe el run, no lo resuelve) |

El trabajo de sesión —hooks, gates, guiones— es Python y bash. Sin resolutor,
quien creaba un run tenía que llevarse el ISO a alguna parte, y esa parte fue
`/dev/shm/iso_evento`. **El defecto no era el puntero: era que el mecanismo no
ofrecía alternativa.**

## Las piezas

| archivo | qué hace |
|---|---|
| `src/workbench/manifest.py` | gemelo Python: `run_id_for`, `run_id_date`, `runs_for`, `latest_run`, `scaffold_workbench` + el contrato (`REQUIRED_KEYS`, `WORKBENCH_FORMS`, `MANIFEST_FILE_NAME`) |
| `src/workbench/manifest.py` `__main__` | `run-id` · `runs` · `latest` · `scaffold`, con `--base` que cae a `paths.workbench_dir()` |
| `src/lib/workbench.sh` | `thyrox_run_id`, `thyrox_runs_for`, `thyrox_latest_run`, `thyrox_scaffold_run` — delegan a la mitad Python, `export -f` por función |
| `src/workbench/paths.py` | `ConsumerUnknownError` que escapaba, envuelta en `WorkbenchHomeError` con el remedio (`write-env.sh`) NOMBRADO |

**Este run se creó con la herramienta**, no a mano:
`python3 -m src.workbench.manifest scaffold porte-manifest-a-python`. Es el
último cuya existencia había que demostrar.

## Lo que NO se porta, declarado

`checkWorkbench`. El gate está cableado una sola vez, en
`src/packages/cli/src/commands/workbench.ts:6,14,20`. Un segundo verificador en
Python sería una segunda fuente de verdad sobre qué hace conforme a un run.

## Los resultados

```
tests/workbench/test_manifest.py    26 ok, 0 fallos
tests/lib/test-workbench-sh.sh      16 casos: 16 ok, 0 fallos
bun test tests/workbench/*.test.ts  46 pass, 0 fail
```

Subconjunto derivado (`grep -rlE '<símbolos>' tests/`): `tests/lib`,
`tests/paths`, `tests/session`, `tests/workbench` — los 7 en verde.

### Anulación 1 — el orden por `mtime` en vez de por nombre

Sustituyendo `key=lambda entry: entry.name` por `entry.stat().st_mtime` caen
**exactamente 4** de las 26: las dos de orden y las dos del control de `mtime`
invertido. El caso «los dos criterios DISCREPAN» existe para que el bloque no
pueda pasar por coincidencia: con creación cronológica, orden por nombre y por
`mtime` dan lo mismo y el verde no discriminaría.

### Anulación 2 — la delegación a Python, rota

Apuntando `_thyrox_workbench_delegate` a un módulo inexistente caen **3 de los
8** casos del ciclo, no los 8 que declaré antes de medir. Los 5 que sobreviven
miden **rehúse**, y un módulo roto también rehúsa: su verde bajo la anulación no
dice que el mecanismo funcione. La declaración del test se corrigió a lo medido.

*Métrica:* aserciones que caen al retirar una causa declarada, sobre el
subconjunto derivado de los símbolos tocados.
*Ciega a:* el caso multi-clon —un consumidor `kaupamex-*` resolviendo su propio
`THYROX_WORKBENCH_<CLON>`—, que no se ejercita aquí; y a la conformidad del
manifiesto, que mide el gate de TypeScript y no este porte.
