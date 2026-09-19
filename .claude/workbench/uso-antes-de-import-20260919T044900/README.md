# Uso antes de su import — los 9 rojos que d1ba7514 dejó

`TASK-THYROX-0214`. El barrido de aritmética de ruta (`d1ba7514`,
`TASK-THYROX-0087`) tocó 33 archivos de `tests/` y dejó **9** con un nombre
**cargado a nivel de módulo antes del `import` que lo liga**. Los 9 mueren con
`NameError` al importar, o sea que **no ejecutan ninguna aserción**.

## Las dos formas, que son la misma

| Forma | Archivos | Lo que quedó escrito |
|---|---|---|
| `reach` antes de su import | 6 | `HERE = reach.thyrox_root()` puesto **encima** del `sys.path.insert` y del `from paths import reach` que lo hace alcanzable |
| `sys` antes de su import | 3 | `sys.path.insert(...)` en la línea 16-22, con `import sys` recién en la 112-117 |

El barrido insertó el reemplazo **encima** de la cosa que reemplazaba.
`tests/agents/test_store_home.py` lo enseña entero: la llamada a `reach` en
`:24` y el one-liner que todavía la habilitaba en `:32`.

## Por qué ningún gate lo vio, y es el punto

`check_path_arithmetic.py` publica **0 incumplidores nuevos sobre 464
archivos** con los 9 rotos en el árbol. No falla: mide la **forma** de
`parents[N]` —si la aritmética viaja dentro de un `sys.path.insert`— y es
ciego al **orden** de los statements. Un verde suyo no distingue «el archivo
resuelve su raíz bien» de «el archivo no llega a ejecutarse».

Es el sub-patrón D con el gate del propio barrido como sujeto. El gate que
habría discriminado lo declara `src/paths/reach.py:588` —
`check_python_bootstrap`— y **no existe**: su literal aparece sólo ahí.
Registrado como `TASK-THYROX-0215`.

## El instrumento

`census_use_before_import.py`, por AST. Un grep literal de `reach\.` da **95
archivos** entre `src/` y `tests/` —cuenta docstrings y cuerpos de función— y
el AST da **9**, que son **exactamente** los 9 rojos del corredor: ni uno más,
ni uno menos. Ésa coincidencia es la que lo valida como discriminador.

*Métrica:* por archivo, todo `ast.Name` en contexto `Load` que aparezca en el
**cuerpo del módulo** (fuera de `def`/`class`) en una línea anterior a la del
`import` que liga ese nombre.
*Ciega a:* nombres ligados por asignación o por `for`/`with`; builtins; y el
uso dentro de un cuerpo de función, que se ejecuta después del módulo entero.

## El arreglo, y su control

Los 9 reciben el **bootstrap canónico** —`paths.reach.BOOTSTRAP`, ascenso con
detección del marcador— en vez del one-liner `parents[N]`. El bloque **no se
transcribió**: el guion que lo aplica lo lee de la constante, porque una copia
en prosa sería la segunda fuente de verdad que nadie sincroniza.

El control es inherente y no hay que fabricarlo: devolver el orden produce el
mismo `NameError`. Lo que sí es medición es el censo, que pasa de **9 a 0**.

## Lo que el arreglo DESTAPA, y no cierra

Dos de los 9 ahora **corren** y fallan por sus propias aserciones — que
llevaban rojas todo el tiempo, invisibles detrás del `NameError`:

- `tests/agents/test_store_home.py` — 7 de 8 verdes; cae la **sonda de
  conducta** (caso 8): invoca el hook real del consumidor y el `agent_id` no
  aparece en el hogar.
- `tests/session/test_user_wiring.py` — 69 ok, 5 fallos.

Los dos son defectos distintos de éste y tienen su propia tarea. No se
arreglan aquí: mezclarlos haría que un commit de un barrido mecánico cargara
dos diagnósticos de conducta.
