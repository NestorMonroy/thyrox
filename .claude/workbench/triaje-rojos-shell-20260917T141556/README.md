# triaje-rojos-shell

TASK-THYROX-0081 — «Separar “rojo del sujeto” de “rojo de la premisa rancia”».

## Qué se pregunta

`tests/run.sh --shell-only` publica **89 suites, 17 en rojo, 0 sin medir**. Un
rojo no dice de quién es: puede ser un defecto del sujeto que la suite mide, o
una premisa del propio instrumento que caducó — una ruta del árbol
pre-mudanza, un banco de evidencia que se movió al consumidor, un hogar que
cambió. Las dos formas se ven idénticas desde el corredor.

## Qué se midió

`run_reds.sh` corre las 17 una por una con `timeout 300` y captura exit y
salida completa en `salidas/`. `veredictos.txt` lleva el `EXIT=` por suite.
**Las 17 salieron 1**: ninguna murió por timeout ni por falta de intérprete.

## El reparto, por lectura de cada salida

### Premisa rancia del instrumento — reparadas en este pase

| Suite | Premisa que caducó |
|---|---|
| `tests/agents/test-agent-store-compara-antes-de-escribir.sh` | su control de anulación construía el espejo del mutante en `.claude/scripts/agents/` y copiaba `document_types.py` a un `src/corpus/` que nunca creaba — el árbol PRE-mudanza. El mutante moría en el import y el caso 5 pasaba a rojo **sin ejercitar el guard** |
| `tests/session/test-evidencia-varada.sh` | su control positivo buscaba el censo de artefactos varados bajo `thyrox_root`, y los once bancos de evidencia se mudaron al árbol del CONSUMIDOR (TASK-THYROX-0019) |
| `tests/verify/test-gitattributes.sh` | transcribía `.claude/agent-results/agent_store.sqlite3` como ruta del store; el store vive hoy en `agent-results/` del proveedor, así que `git check-attr` respondía `unspecified` sobre una ruta que ya no se versiona |

Las tres comparten forma: **el sujeto está sano y el instrumento apunta a un
árbol que ya no existe**. Ninguna de las tres publicaba esa distinción — su
rojo se leía como defecto de producto.

### El arreglo, y por qué no es transcribir la ruta nueva

En las tres, la ruta se **deriva** en vez de escribirse:

- el espejo enlaza `agents_paths.py` por **symlink**, y `resolve()` lo sigue
  hasta el archivo real, así que el mutante hereda la raíz de thyrox sin
  replicar `src/paths/`, `src/corpus/` ni `src/lib/`;
- el censo se busca desde `thyrox_tree_root()` —el árbol que hospeda a los
  clones— y, si no aparece, el caso queda **SIN MEDIR** y lo dice, no en verde;
- la ruta del store sale de `agents_paths.agent_store_path()` relativa a
  `THYROX_ROOT`.

Sustituir una ruta transcrita por otra habría repetido el defecto en la
siguiente mudanza.

## Los controles de anulación

| Arreglo | Qué se retiró | Qué cayó |
|---|---|---|
| espejo por symlink | la línea `ln -s …/agents_paths.py` | **exactamente 1**: «SIN guard, el pase idéntico SÍ mueve updated_at» (12 ok, 1 fallo) |
| ruta derivada del store | se repuso la ruta transcrita `.claude/agent-results/…` | **exactamente 1**: «5c. git resuelve el atributo declarado» (20 de 21) |

Restaurados, las dos vuelven a verde — 13 de 13 y 21 de 21. El tercero no
tiene anulación de línea: su control **es** que la aserción nombre el archivo
real que el censo aporta (`account_init_backup.py` en esta corrida), y sin
censo el caso se declara sin medir en vez de pasar.

## Lo que este tramo NO cierra

Los otros **14** rojos siguen en pie y su clase está leída, no arreglada. El
detalle por suite vive en `salidas/`. Sucesores registrados: ver el `progreso`
de la iniciativa.

*Métrica:* exit y aserciones falladas por suite, sobre las 17 que el corredor
reporta en rojo con `--shell-only`.
*Ciega a:* las 72 verdes, que este banco no re-mide, y a un verde que no
discrimine — el corredor no distingue «el sujeto funciona» de «el caso no
pregunta».
