# particion-de-recorrido-por-raiz

## El encargo

<!-- verbatim, sin parafrasear -->

> El detector de recorrido sin cota es ciego al guion invocado por ruta.
>
> Cerrarla exige otro instrumento: un gate ESTATICO sobre los `.py` y `.sh` del
> arbol que marque un recorrido recursivo sin poda ni cota, con la deuda
> heredada congelada en baseline.
>
> Metrica del gate propuesto: archivos con `glob(**, recursive=True)` /
> `os.walk` sin poda in situ / `rglob`, bajo las raices del arbol.

(TASK-THYROX-0058, descripcion del store.)

## La premisa, si se corrigio al primer comando

**Se corrigio, y en los dos sentidos.**

La ceguera declarada por el detector **es real** —su propio docstring la
nombra: *«Ciega a: un guion invocado por ruta, cuyo cuerpo no viaja en el
comando»*—. Lo que la medicion invierte es el **instrumento** que la tarea
propone para cerrarla: ese gate mediria el fenomeno equivocado.

El detector exige DOS condiciones —forma sin cota **y** raiz pesada— y el
gate propuesto conserva solo la primera. La medicion muestra que **ninguna de
las dos es el discriminador**.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/partition_by_root.py` | v1 — particiona los recorridos por la expresion de su raiz. Resuelve el receptor **un solo nodo**, asi que 90 de 104 caian en «opaca» |
| `probes/partition_v2.py` | v2 — `Bindings(ast.NodeVisitor)` resuelve constantes de modulo, asignaciones locales y blancos de `for` a profundidad 2 |

**Mi propia sonda cometio el sub-patron A.** La v1 ponia `walk` desnudo en
`TRAVERSAL_CALLS`, asi que contaba `ast.walk(tree)` —recorrido de AST— bajo el
mismo rotulo que `os.walk` —recorrido de filesystem—. Anclado el receptor a
`os.`, el conteo cae de 104 a **76**.

## Los resultados

### 1. La particion — y por que NO decide nada

```text
recorridos: 76 · .py medidos: 396

opaca                    47
estrechada-ligera        14
estrechada-por-variable   9
raiz-desnuda              6
```

Ninguno de los 76 poda, y **todos cuestan ~0.2 s**. Un gate que los marcara
emitiria 76 avisos sobre trabajo sano — y un aviso que sale siempre se aprende
a ignorar.

### 2. El control que invierte la premisa: la API, no la raiz

Misma raiz, mismo patron, dos APIs:

```text
Path.rglob('*.py')                       sobre src/:  211 hits en 0.09 s
glob.glob('**/*.py', recursive=True)     sobre src/:  NO TERMINA en 45 s
```

Y el caso que cierra la discusion — **la raiz mas ligera del arbol**:

```text
src/packages/agent:  369 entradas  ·  rglob en 0.01 s  ·  glob NO TERMINA en 30 s
/home/user/odoo-tools:  861 555 entradas  ·  rglob en 15.51 s  ·  termina
```

Una raiz de **369 entradas** gira sin final; una de **861 555** termina en 15 s.
El peso de la raiz —la segunda condicion del detector, y su lista
`HEAVY_ROOTS`— **no discrimina el fenomeno**.

### 3. El mecanismo: no es infinito, es combinatorio acotado por ELOOP

La causa es un **grafo de symlinks con abanico**, y `glob` lo sigue mientras
`rglob` no:

```text
symlinks bajo src/:            844  (815 apuntan a directorio)
paquetes con node_modules/@thyrox:  21
enlaces @thyrox:              137   ·  abanico maximo: 18 (tool-registry)
forma:  src/packages/server/node_modules/@thyrox/agent -> ../../../agent
        src/packages/agent/node_modules/@thyrox/config -> ../../../config
```

Control sintetico — ciclo mutuo minimo de dos nodos, dos archivos:

```text
Path.rglob : 2 hits en 0.00 s     (no sigue el enlace)
glob.glob  : 82 hits en 0.01 s    (lo sigue, y TERMINA)
```

Termina porque el kernel corta la resolucion de ruta:

```text
ELOOP a los 41 saltos: Too many levels of symbolic links
```

Asi que no es un bucle infinito: es **explosion combinatoria acotada a
profundidad ~40**. Con abanico 2 son 82 rutas; con abanico hasta 18 sobre 21
paquetes, el conteo no termina en el plazo de una sesion.

### 4. Lo que esto hace con la poblacion del gate propuesto

La forma patologica —`glob.glob/iglob(..., recursive=True)`— en thyrox:

```text
archivos con la forma: 3
  src/hooks/detect_unbounded_traversal.py:8      (el episodio, citado en su docstring)
  src/session/bounded_scan.py:6                  (idem)
  tests/hooks/test_detect_unbounded_traversal.py:9,55,72,76
```

**Cero positivos reales en el arbol.** Las tres apariciones son el episodio
*citado* dentro del propio detector y su suite. Es exactamente la condicion que
`hallazgo-abierto-genera-sucesor.md` advierte: un control escrito por el autor
del patron, validado contra un incumplidor que el mismo fabrico.

*Metrica:* llamadas de recorrido de **filesystem** (`os.walk`, `Path.rglob`,
`glob.glob/iglob`) declaradas por AST en los 396 `.py` de thyrox, con su raiz
resuelta a profundidad 2; mas reloj de pared de las dos APIs sobre la misma
raiz y el mismo patron, en Python 3.11.15.

*Ciega a:* un recorrido que llegue por `subprocess` o por un binario externo
—el AST solo ve la llamada de Python—; a la raiz que se resuelve en tiempo de
ejecucion desde `argv`, que es exactamente el cubo «opaca» de 47; y a si el
`glob` sobre `src/` terminaria con un plazo mucho mayor, que no se midio: lo
medido es que no termina en 45 s.
