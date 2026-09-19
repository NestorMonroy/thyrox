# `sys.path` es del PROCESO: no viaja al subproceso

`TASK-THYROX-0216`. El hook real del consumidor deja **cero filas** en el
hogar, con **exit 0, sin stdout y sin stderr**. Lo destapó la sonda de
conducta del caso 8 de `tests/agents/test_store_home.py`, que sólo pudo
ejecutarse desde que `TASK-THYROX-0214` reparó su bootstrap: hasta entonces el
archivo moría con `NameError` y **ninguna** de sus ocho aserciones corría.

## La cadena, medida paso a paso

| Paso | Qué pasa |
|---|---|
| 1 | el stub del consumidor importa `hook_error_log`, que pone `<thyrox>/src` en el `sys.path` **del proceso** |
| 2 | `runpy.run_path` corre `register_session.py`, que importa sin problema — el `sys.path` del paso 1 lo cubre |
| 3 | `main()` compone `cmd = [sys.executable, str(AGENT_STORE), ...]` y lo lanza como **subproceso** |
| 4 | el hijo **no hereda `sys.path`** —eso es estado del proceso, no del entorno— y `agent_store.py` muere con `ModuleNotFoundError: No module named 'agents'` |
| 5 | `run_and_log(..., spool=True)` encola el evento y **no lanza**; el hook cierra con exit 0 |

Reproducido en aislamiento: importando `hook_error_log` primero, `runpy`
**no** lanza excepción y la fila no aparece. Sin importarlo, la excepción es
`ModuleNotFoundError: No module named 'hooks'`. Los dos caminos acaban en
cero filas; sólo uno de ellos emite algo, y no es el que el hook toma.

*Evidencia:* dos entradas en `carrete-store.jsonl` con `detail` vacío, una por
invocación. Y el mismo comando con `PYTHONPATH=src` en el entorno **sí**
escribe la fila.

## Por qué es el peor modo de fallo, y no sólo un bug

Un fallo que no emite un byte no se descubre por su síntoma: se descubre por
la **ausencia de datos**, semanas después, cuando alguien pregunta por qué el
store está vacío. Es el nivel 4 de `niveles-de-retencion.md` —completitud
percibida sin persistencia— aplicado a una fila en vez de a un agente.

## El mecanismo: `reach.child_env()`

La única vía que cruza la frontera del proceso es el **entorno**, y su nombre
ya estaba decidido: `PYTHONPATH` es lo que los envoltorios de `bin/` exportan
(`generate_bin.py`). Por eso se compone y no se inventa otro mecanismo.

Es **idempotente** a propósito: un hijo que lanza a su vez otro hijo heredaría
la raíz repetida una vez por nivel, y esa lista crece sin que nadie la vea.

Dos consumidores, no uno: `register_session.py` (el emisor) y `drain_spool.py`
(el que reenvía lo encolado). Sin el segundo, cada evento del carrete falla en
cada reintento y se abandona al tercero.

## Controles

**De anulación, sobre el sujeto real.** Retirado `env=reach.child_env()` de
`register_session.py`, cae **exactamente 1 de 8** casos de
`test_store_home.py` — la sonda de conducta — y ninguno más. Restaurado,
`diff -q` contra la copia da idéntico y vuelve a 8/8.

**De escritura, por conducta y no por docstring.** `assert_no_writes` sobre
`import reach; reach.child_env()` da **0 escrituras** sobre 396 líneas de
traza; el control positivo —un comando que escribe un archivo— da **1**. El
instrumento discrimina, así que el cero es una medición y no un silencio.

## Lo que el arreglo cerró además

Tres suites que estaban rojas por la misma causa pasaron a verde sin tocarlas:

| Suite | Antes | Después |
|---|---|---|
| `tests/agents/test_final_message_closing.py` | `ModuleNotFoundError: hooks` | 14 ok, 0 fallos |
| `tests/hooks/test_error_log.py` | 30 de 32 | 32 de 32 |
| `tests/session/test_user_wiring.py` | 69 ok, 5 fallos | 74 ok, 0 fallos |

*Métrica:* exit code y última línea de cada suite, corridas en el pool con
`cd` propio y entorno limpio.
*Ciega a:* si alguna de las tres tenía además otra causa que esta corrida no
ejercita — el verde dice que hoy pasan, no que sólo dependieran de esto.

## Lo que este banco NO cierra

- `tests/session/test_generate_bin.py` — 2 fallos: `bin/` está desactualizado
  (faltan `check-toolchain-ready` y `detect_self_matching_pgrep`). **Bloqueado
  por directiva**: no se toca `bin/` ni `generate_bin.py` hasta que las tres
  lenguas estén en verde, y TypeScript sigue en rojo.
- `tests/verify/test_package_root_resolution.sh` — 4 ok, 1 falla.
- `tests/verify/test-script-naming.sh` — 29 ok, 2 fallas. Es `TASK-THYROX-0145`.

## gawk, GNU Parallel y el pool propio — medidos, no supuestos

Los tres están instalados: `gawk` 5.2.1 (y `awk` **es** gawk aquí),
`/usr/bin/parallel`. Las dos guardas del toolchain
—`thyrox_toolchain_require_gawk` y `require_parallel`— se invocaron de
verdad en este pase; hasta hoy tenían **0 consumidores** fuera de su propia
suite, que es lo que `TASK-THYROX-0179` registró.

El censo del bootstrap se hizo con **un solo pase de gawk** que publica
universo **y** hits a la vez, que es la forma que el corpus de eventos ya
usa:

```
universo: 407 archivo(s), 85401 linea(s)
  sys.path.insert : 231
  ascenso canonico: 26
  parents[N]      : 181
```

### Y el reparto NO gana siempre — con la misma carga

| Modo | Reloj |
|---|---|
| `parallel -j4` | **38.94 s** |
| serie | 40.95 s |
| `run-task-pool --width 4` | 43.06 s |

**La serie le gana al pool.** La causa no es el pool: es la forma de la
carga. Medido trabajo a trabajo, uno solo se lleva el reloj entero —
`test_package_root_resolution.sh` tarda **38.58 s** de **41.56 s** totales,
el **92.8 %**. Con un palo así, el suelo de cualquier reparto es
`max(tᵢ) = 38.58 s` y el techo de ganancia es **1.08×**: `parallel` está en
ese suelo (+0.36 s), y el pool paga **+4.48 s** de sobrecoste.

Ese sobrecoste no es desperdicio: es lo que cuesta **registrar cada trabajo
en el ledger** para poder recogerlo. `parallel` corre más rápido y no deja
nada que recoger — si el turno muere, su resultado se pierde y nadie se
entera. De ahí el criterio, que ahora es medido y no estético:

- carga **equilibrada** y resultado que hay que **recoger** → el pool;
- carga equilibrada y salida que se consume en el acto → `parallel`;
- carga con **un palo dominante** → ninguno de los dos compra nada; lo que
  compra es acortar el palo.

*Métrica:* reloj de pared (`date +%s.%N`) sobre la misma lista de seis
comandos, salida a `/dev/null`, y el reloj de cada trabajo por separado.
*Ciega a:* la correcciónde cada trabajo —este eje mide reloj, no veredicto—;
la memoria y la contención de disco; y una segunda corrida que diera otra
cifra, porque cada modo se midió **una vez**.

## Atribución: mencionar el símbolo no es cambiar de veredicto

El subconjunto derivado da **17 rojos** y sólo **tres** mencionan los símbolos
tocados. Mencionarlos es el *significante*; cambiar de veredicto es el
*significado*. Medido reponiendo el contenido de `HEAD` en los tres archivos de
fuente y volviendo a correr:

| Suite | HEAD | con `child_env` |
|---|---|---|
| `tests/paths/test_child_env.py` | **ROJO** | **7 ok, 0 fallos** |
| `tests/agents/test_final_message_closing.py` | ROJO | ROJO |
| `tests/hooks/test_error_log.py` | ROJO (30/32) | ROJO (30/32) |
| `tests/session/test_user_wiring.py` | ROJO (69/5) | ROJO (69/5) |

Cambia de veredicto **exactamente una**, y es la del sujeto. Las otras tres son
pre-existentes y no se atribuyen a este cambio.

**Y el control destapó un décimo archivo de la familia de TASK-THYROX-0214.**
`test_final_message_closing.py` muere con `ModuleNotFoundError: No module named
'hooks'` al cargar `register_session.py` con `spec_from_file_location` sin poner
`src/` en `sys.path`. El censo AST de aquel pase era **ciego a esta forma por
construcción**: mide uso-antes-de-import *dentro* del módulo, y un cargador
dinámico no importa el árbol en ninguna línea.

*Métrica:* veredicto de cada suite con el contenido de `HEAD` y con el del
árbol, mismo intérprete, `__pycache__` borrado entre las dos.
*Ciega a:* un rojo intermitente — cada suite se corrió una vez por lado.
