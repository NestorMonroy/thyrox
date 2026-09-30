# subpaths-sin-declarar-el-resto

`TASK-THYROX-0227` (board #535). Sucesora directa de `TASK-THYROX-0226`, que
declaró los ocho subpaths que el manifiesto de `config` no exportaba. Aquí, los
**otros 27 paquetes**.

## El instrumento, y el defecto que traía

La sonda de `TASK-THYROX-0226` filtra por **comillas** para separar un
`'@thyrox/x/y'` que el resolver lee de una cita en prosa que no resuelve nada.
Ese filtro cierra un eje y **deja otro abierto**: un literal entrecomillado
puede ser **dato**, no specifier.

Medido aquí: dos de los 35 «sin resolver» son argumentos de un test de truncado
de rutas —`truncatePathMiddle('@thyrox/repl/components/foo.ts', 4)`— y uno de
`@thyrox/agent/context.ts` es prosa en un docstring. El instrumento los contaba
como imports de módulos ausentes.

**El ancla que lo cierra:** un literal es specifier cuando ocupa **posición de
import** — `import`, `from`, `require`, `mock.module` en los 60 caracteres
anteriores. Sólo hacia atrás, y basta: las cuatro formas preceden al literal en
todas sus variantes, incluida la lista multilínea que cierra con `} from '...'`.

**Su control de anulación** (`CLASSIFY_NO_ANCHOR=1`, salidas `con-ancla.txt` y
`sin-ancla-control.txt`):

| | specifiers | sin resolver | MANIFIESTO | PUERTO |
|---|---|---|---|---|
| con ancla | 1156 | **33** | 26 | **7** |
| sin ancla | 1158 | 35 | 26 | 9 |

El diff nombra **exactamente** lo que el ancla retira: los dos literales de
test, y dos de las tres ocurrencias de `agent/context.ts`. Ni una más. Las
cinco ocurrencias de ese último se clasificaron a mano para comprobarlo: cuatro
son prosa en docstrings y **una** es el `require()` vivo de
`costTracker.ts:110` — que es la que el ancla conserva.

*Ciega a:* un specifier que llegue por una forma que el ancla no enumera, como
`Bun.resolveSync('@thyrox/x')` en código vivo. Medido: **0** casos de esa forma
en el árbol, así que hoy no hay falso negativo — pero es ausencia medida, no
imposibilidad.

## La clasificación: el censo dice QUÉ, esto dice POR QUÉ

Un «no resuelve» tiene dos arreglos opuestos, y colapsarlos sería tratar un
hueco de porte como un defecto de manifiesto:

| Clase | Qué significa | n |
|---|---|---|
| **MANIFIESTO** | el módulo **existe** en disco; falta la entrada que lo alcanza | **26** |
| **PUERTO** | el módulo **no existe** en ninguna forma | **7** |
| DESCONOCIDO | ninguna de las dos es decidible con este instrumento | 0 |

## La forma del arreglo la fija la referencia, no una preferencia

`TASK-THYROX-0226` resolvió esto para `config` **midiendo** el manifiesto de la
fuente: 133 entradas explícitas y un comodín estrecho. Aquí se repitió la
medición sobre los siete paquetes portados, y la referencia **enumera** igual —
57 entradas en `tool-registry`, 26 en `output`, 22 en `cli`, 11 en `swarm`,
6 en `bridge`.

Y declara **las 25**, con su par clave→destino exacto. El aplicador
(`probes/apply_reference_entries.py`) las copia verbatim; un subpath que la
referencia no declare **no se toca**. Nada se inventó: ni un arreglo de
respaldo, ni un comodín `.tsx` nuevo.

Dos que parecían un porte mal ubicado **no lo son**, y sólo leer la referencia
lo decide: `bridge/commands/bridge-kick.ts` y `swarm/commands/*/index.ts` viven
**fuera de `src/`**, y la referencia los declara exactamente ahí
(`'./commands/bridge-kick.js': './commands/bridge-kick.ts'`). El comodín de esos
paquetes apunta a `./src/*.ts` y por eso no los alcanzaba; la entrada explícita
sí. Añadir una entrada que apunte a `src/` habría **cementado una ubicación
equivocada** (segunda cláusula de `atributos-de-clase-de-modelo.md`).

## El vigésimo sexto no es de manifiesto: es del importador

`@thyrox/agent/context.ts` es el único sin contraparte — `agent` es **nuestro**
paquete, no un puerto, así que no hay referencia que espejar. Y la decisión ya
estaba tomada y escrita en el árbol, en el docstring de
`provider/src/fastMode.ts:53-59`:

> `Bun.resolveSync('@thyrox/agent/context.ts', …)` fallaba,
> `Bun.resolveSync('@thyrox/agent/context', …)` resuelve. Se corrigió quitando
> el sufijo (mismo target); 0 ocurrencias fuera de `provider/src/`

El `require()` de `costTracker.ts:110` es un superviviente de aquel barrido, no
una clase nueva. Se le quitó el sufijo, como manda el precedente. **Las cuatro
citas en prosa no se tocan**: una cita de archivo en un docstring no resuelve
nada, y degradarla empobrece una referencia correcta — que es el defecto exacto
que `H-THYROX-126` registra.

## Resultado

| | antes | después |
|---|---|---|
| specifiers sin resolver | **33** | **7** |
| de clase MANIFIESTO | 26 | **0** |
| de clase PUERTO | 7 | 7 |

*Métrica:* specifiers `@thyrox/<pkg>/<sub>` distintos, en posición de import,
resueltos contra el `exports` de su paquete y comprobado que el destino exista
en disco.
*Ciega a:* un módulo que exista con otro nombre (un renombre en el puerto); y a
si el import debería existir siquiera — el instrumento supone que el importador
tiene razón, que es lo que `TASK-THYROX-0226` midió decisivamente para `config`
y **no** está medido para los demás.

## El costo, medido en los dos ejes

**Typecheck del árbol entero: 5681 → 5624** (`outputs/atribucion-typecheck.txt`,
job `tssub-20260919T101535`). 85 desaparecieron, 28 aparecieron.

Lo que cae es la clase esperada: **69 TS2307** más **11 TS7006** y 5 más que
dependían de ellos — al resolver el módulo, los parámetros dejan de ser `any`
implícito.

**Lo que aparece no es regresión, y hay una cifra que lo discrimina: 0 TS2307
nuevos.** Ningún módulo dejó de resolver. Los 28 son errores de forma de tipo
que estaban enmascarados mientras un lado era `any`. Medido: de los 16 archivos
con error nuevo, 9 tenían un TS2307 resuelto en ese mismo archivo, y los otros
7 lo reciben por vía transitiva — sus mensajes ya nombran el tipo concreto en
vez de colapsarlo (`BackgroundTaskStatus.tsx(56,28)`: *«Argument of type
`TaskState` is not assignable…»*).

**Suite: idéntica en las dos direcciones.** El subconjunto derivado de los
consumidores de estos subpaths —`src/packages/agent/__tests__`,
`src/packages/provider/src/__tests__`, `tests/unit/plugin`— da **3356 pass /
44 fail / 4 errors** tanto en HEAD (con el cambio en `git stash`) como con el
cambio aplicado. Los 44 son pre-existentes.

## Lo que este banco NO cierra

- **Los 7 de clase PUERTO**, que son módulos genuinamente ausentes:

  | Subpath | imports | Dónde vive su cierre |
  |---|---|---|
  | `tool-registry/tools/{REPLTool,SleepTool,SnipTool,TerminalCaptureTool,WebBrowserTool}` | 6 | **`TASK-THYROX-0234`**, el porte de `tool-registry`, en curso |
  | `agent/file-history` | **14** | DESCONOCIDO — ver abajo |
  | `agent/query-engine` | 1 | ídem |

- **`agent/file-history` y `agent/query-engine` quedan DESCONOCIDO con su
  condición de cierre declarada.** `agent` es nuestro paquete, así que no hay
  porte que los traiga; o los módulos se escriben, o los 15 imports que los
  nombran están apuntando a un diseño que no llegó. Cuál de las dos **no se
  puede decidir con este instrumento**: exige leer qué esperan sus
  consumidores. Condición de cierre: medir los 15 importadores y ver si sus
  símbolos ya viven en otro módulo de `agent`.

- **El ancla no se llevó al instrumento del banco de `TASK-THYROX-0226`.**
  Aquél es evidencia fechada de su episodio; éste es el instrumento vigente.
