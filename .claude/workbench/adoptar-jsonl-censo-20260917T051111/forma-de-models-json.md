# La forma JSONL de `models.json` — decidida antes de tocar nada

Fecha: 2026-09-17T05:47:57 · TASK-THYROX-0066 · sujeto: `src/packages/agent/models.json`

## Por que esta decision no es mecanica

Los otros cuatro nombres del bucket C son **colecciones**: el baseline de
premise-drift es un dict de 84 fichas (una linea por ficha) y la fila del store
es un registro (una linea). `models.json` no lo es — es un **documento con
nueve claves de raiz**, y `models` es una sola de ellas:

```
fuente            str              models            list   19
schema_version    int              pricing_tiers     dict    8
best              str              aliases           dict    4
defaults          dict  0          latest_per_family dict    4
alias_migration   dict  0
```

Sobre un documento asi, «convertir a JSONL» no tiene una sola lectura. Hay dos
formas candidatas y hay que elegir con un criterio, no por gusto.

## El discriminador: una linea se clasifica por lo que DICE, no por donde esta

| Forma | Como sabe el lector que una linea es la meta |
|---|---|
| **linea de cabecera** | «la linea 1 es la meta» — por **posicion** |
| **registros etiquetados** | la linea trae `"kind":"meta"` — por **contenido** |

La primera repite un nivel mas abajo el defecto que `H-THYROX-37` acaba de
registrar: **clasificar por donde esta en vez de por lo que dice**. Ahi el censo
clasificaba por basename y por directorio; aqui clasificaria por numero de
linea. El mismo error, otra superficie.

Y no es teorico: un lector que concatene dos catalogos, o que reordene lineas
por cualquier motivo, pierde la meta sin que nada lo delate. Con `kind` cada
linea se defiende sola.

**Decision: registros etiquetados.**

## Que se expande a linea propia, y con que criterio

Una clave de raiz se expande a una linea por elemento **cuando cada elemento es
un registro con sentido propio**; se queda dentro de `meta` cuando es una tabla
de consulta que solo significa entera.

| Clave | Veredicto | Por que |
|---|---|---|
| `models` (19) | **expande** — `kind: model` | cada modelo se cita por su `id` y se lee solo |
| `pricing_tiers` (8) | **expande** — `kind: tier` | un modelo lo cita por nombre (`pricing_tier`); el tier existe sin el modelo |
| `aliases` (4) | `meta` | es un mapa proveedor -> alias -> id; una entrada suelta no dice a que proveedor pertenece sin su clave |
| `latest_per_family` (4) | `meta` | idem: tabla de consulta |
| `fuente`, `schema_version`, `best` | `meta` | escalares |
| `defaults`, `alias_migration` | `meta` | dicts vacios hoy; su forma la decide su primer contenido |

Resultado: **28 lineas** — 1 meta + 8 tier + 19 model. Sobre 28 lineas
`json.load` del archivo entero **falla**, que es la asercion que hace de esto
una conversion medible y no un renombre de extension (lo mismo que
`tests/verify/test-premise-drift.sh` ya exige de su baseline).

`kind` es **nuestro sobre**, no una clave del registro de la fuente. El
docstring del extractor tiene que declararlo asi: un lector que busque `kind`
en el volcado del binario no lo encontrara.

## `schema_version` BUMPEA a 2

La forma de serializacion es parte de lo que un lector declara que espera. Un
lector escrito contra la v1 hace `json.load` del archivo entero y **falla** ante
el archivo nuevo. Si `schema_version` no cambia, la clave no puede discriminar
las dos formas — y una version que no distingue lo que cambio es el verde que
no discrimina aplicado al propio contrato.

## El radio real: el modulo, no solo el extractor

```
src/packages/agent/models.ts:17
  import registry from './models.json' with { type: 'json' }
```

Es un **import estatico** con el cargador JSON de bun. Un `.jsonl` lo rompe: la
conversion obliga a llevar `models.ts` a `readFileSync` + lector de lineas.
Esto NO estaba en el encuadre de partida, que hablaba de «el extractor y sus
ocho lectores» como si el modulo fuera uno mas de los ocho.

Piezas que cambian:

1. `bin/extract_model_registry.py` — `--stdout` emite JSONL; el modo de
   escritura tambien.
2. `models.ts` — de import estatico a lectura por lineas, reconstruyendo el
   objeto `registry` de nueve claves.
3. `__tests__/models.test.ts` — la igualdad byte a byte sigue siendo el control,
   contra la extraccion fresca en su forma nueva. **Es la mitad roja**: cambiar
   el test primero lo pone en rojo contra el `.json` actual.

## La propiedad que la conversion no puede romper

`registry` reconstruido desde las 28 lineas tiene que ser **igual** al objeto
que hoy produce el import estatico: mismas nueve claves, mismos 19 modelos en
el mismo orden, mismos 8 tiers. El control es esa igualdad, no «el archivo
parsea».

*Metrica:* claves de raiz y tipo de cada una, leidas del archivo; y la linea
del import en `models.ts`.
*Ciega a:* si algun consumidor fuera de los ocho medidos lee el `.json` por una
ruta compuesta en tiempo de ejecucion, que `grep` del basename no ve.
