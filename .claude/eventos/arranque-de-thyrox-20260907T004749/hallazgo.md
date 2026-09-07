# El arranque de un clon de thyrox anclaba fuera de thyrox

`date -u` de la medicion: la que llevan los `.out` de este directorio.

## El defecto

Un usuario que clone thyrox y corra su instalador de configuracion recibe
**cero archivos y codigo de salida 0**. No falla: publica «0 archivo(s) por
copia» y devuelve exito.

La causa es una sola linea. `src/session/instalar-config-usuario.sh` resolvia
su raiz con `$(dirname "${BASH_SOURCE[0]}")/../../..`, una cadena calibrada
para la profundidad que el guion tenia en `kaupamex-docs/.claude/scripts/`.
Desde `thyrox/src/session/` esa cadena sube un nivel de mas y aterriza en el
**padre de los clones**, no en thyrox. Y `/home/user/.claude` existe, asi que
no hay excepcion: el guion mide el arbol equivocado y publica su cero.

Es el sub-patron D de `metrica-decide-la-conclusion.md` en su forma mas cara:
un veredicto que no distingue «no habia que copiar» de «no pude mirar».

## El alcance, medido

| Sitio | Forma | Cuantos |
|---|---|---|
| `src/` | `VAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"` | 8 |
| `tests/legacy/` | la misma, y `cd …/../../.. \|\| exit 1` | 57 |
| `src/session/instalar-hooks-sesion-multirepo.sh` | `RAIZ="/home/user"` literal | 1 |

*Metrica:* lineas con esas dos formas cuyo `cd`, resuelto desde el archivo que
las escribe, cae fuera de la raiz de thyrox.
*Ciega a:* una raiz compuesta en dos pasos por una variable intermedia, y a la
aritmetica escrita con `dirname $0` en vez de `BASH_SOURCE`.

Mi primer censo dio **28** en vez de 65: el patron `(\.\./)+` no captura el
ultimo `..`, que no lleva barra, asi que subestimo la profundidad en uno **en
todos**. Medir el literal y concluir sobre la profundidad es el sub-patron C,
cometido con el instrumento recien escrito para medir el defecto.

## Lo que se construyo

`src/lib/reach.sh` — el localizador para guiones de shell. Asciende al marcador
`src/paths/reach.py`, que es el minimo imprescindible (sin hallarlo no hay a
quien preguntar), y **delega** toda la precedencia a la mitad Python:
`THYROX_ROOT` del proceso, declaracion del `.env`, hermano validado por
marcador. Expone `thyrox_root` y `thyrox_tree_root` — dos preguntas distintas,
y confundirlas es como se codifico `/home/user` en el instalador de hooks.

`reach.py` gana el modo `--tree-root`, hermano de `--thyrox-root`. Los dos
rehusan con codigo 2 y un motivo en vez de imprimir una ruta plausible.

El instalador de configuracion rehusa cuando **ninguna** clase pedida existe
bajo el origen, en vez de publicar el cero.

## Los controles que discriminan

- **`reach.sh` anulado** (ascenso por marcador -> aritmetica `../../..`): caen
  4 de 6 aserciones — exactamente las que dependen del ascenso. Sobreviven
  «parsea» y «rehusa fuera del arbol», que no dependen de el.
- **Caso 4 de la suite**: un consumidor colocado cuatro niveles mas hondo que
  cualquier sitio real. Un localizador por aritmetica pasa los casos 1-3 y
  falla este; el ascenso por marcador da la misma raiz.
- **`--tree-root` fuera del arbol**, sin variable declarada: exit 2 nombrando
  los clones que busco y la variable a declarar.
- **Instalador con origen vacio**: exit 2, «NO se emite un conteo: un 0 aqui
  seria un verde falso».

## El segundo defecto, y es del propio arreglo (DEC-04)

La primera version de este arreglo cambio una ruta cableada por otra: al
retirar `../../..` **inline el marcador `src/paths/reach.py` en los 65
archivos**. Medido tras aplicarlo: 71 copias del literal del marcador y 67 del
localizador. Es `parents[3]` sin la aritmetica — un consumidor que reestructure
thyrox no tiene donde declararlo, y cablear le quita la decision de donde van
las cosas.

Lo detecto el ejecutor, no una re-medicion propia, y con el criterio explicito:
*toda ruta que cablee el hogar de algo va por CONSTANTE y con dos entradas,
ambas de entorno*.

La forma correcta es la de `get_secret("WORKER_CONFIG")` /
`get_secret_str("CONFIG_FILE_PATH")`: **el VALOR y la RUTA A SU DECLARACION**,
las dos del entorno. Aplicada aqui:

| Entrada | Que declara | Analogo |
|---|---|---|
| `THYROX_ROOT` | la raiz, como valor | `get_secret("WORKER_CONFIG")` |
| `THYROX_ENV_FILE` | el archivo que la declara | `get_secret_str("CONFIG_FILE_PATH")` |
| `THYROX_LOCATOR` | el marcador del ultimo recurso | constante, no literal |
| `THYROX_LIB_REACH` | donde vive el localizador | constante, no literal |

El ascenso pasa a ser **ultimo recurso**, no lo primero que se intenta, y los
dos literales que necesita van tras constantes que el entorno tambien fija.

Control de anulacion del criterio (caso 8): con el marcador repuesto como
literal cableado cae **exactamente 1** de las 8 aserciones — la que prueba que
el consumidor puede declararlo. Ninguna otra.

## Lo que este hallazgo NO cierra

La **segunda capa** de la misma mudanza: con la raiz ya correcta, las suites
siguen citando rutas de antes del movimiento (`.claude/scripts/agents/…` en vez
de `src/agents/…`). Medido: 131 citas distintas bajo `.claude/{scripts,hooks,
agents,skills}/` en `.sh`, de las que 59 mapean limpio a `src/` y 72 no — y
buena parte de esas 72 son nombres fabricados de fixture (`uno.sh`, `roto.sh`),
no citas reales. El mapeo plano `.claude/scripts/<archivo>` -> `src/<archivo>`
es incorrecto: la mudanza repartio por familia.

Sucesor: **#215** (triar las 86 suites de shell) y **#41** (barrer las citas a
guiones mudados por `d566c180`), las dos ya con dueño. No se abre tarea nueva.
