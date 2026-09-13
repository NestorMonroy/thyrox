# Las operaciones de archivo van por Bash, no por herramienta dedicada

Leer, buscar y editar se hace con `cat`, `sed -n`, `grep`, `find`, heredocs y
guiones cortos. `Read`, `Edit` y `Write` quedan para lo que Bash genuinamente no
puede hacer.

## No es sólo capacidad — es costo, y está medido

> Directiva del ejecutor 2026-09-12: *«realmente es solo cuando bash no puede
> hacer cosas, analiza bien porque usar Read/Edit/Write tiene mas costo en
> tokens que Bash, se tiene prioridad usar Bash que usar Read/Edit/Write»*.

La redacción de arriba da **una sola** razón para el fallback a herramienta
dedicada: capacidad. Hay una segunda, independiente, y ya está medida —no
asumida— contra el transcript real de una sesión
(`.claude/workbench/costo-bash-vs-herramienta-dedicada-20260912T185943/`):

- **`Read` agrega +7.6 % de bytes sobre el contenido crudo**, en dos
  lecturas reales de tamaños y archivos distintos, con el mismo porcentaje
  exacto en las dos — no es ruido de una muestra, es la firma del formato
  fijo que el propio tool declara (`cat -n`: número de línea + tab por
  cada línea, que `cat`/`sed -n` no pagan).
- **`Edit` puede costar varias veces más que su equivalente Bash** cuando
  `old_string` necesita contexto para ser único. Caso real medido:
  resolver un conflicto de merge quitando tres marcadores costó 548 bytes
  de payload en `Edit` (`old_string`+`new_string`, reproduciendo un
  párrafo que no cambiaba, sólo para anclar el punto) contra 121 bytes del
  `sed -i` equivalente — **4.5×**.

**Consecuencia para la prioridad, no sólo para la excepción:** el criterio
no es «Bash, salvo que genuinamente no alcance» — es «Bash primero, porque
además de alcanzar casi siempre, sale más barato cuando alcanza». La
capacidad sigue siendo la única excepción **objetiva** (binario, imagen,
notebook); el costo es la razón por la que, incluso fuera de esa excepción,
Bash **se prioriza** y no es sólo «una opción tan válida como la otra».

*Métrica:* bytes exactos del `tool_result`/`tool_use` real contra el
equivalente Bash del mismo archivo o rango, leído del disco.
*Ciega a:* la conversión a tokens (4 char/token) es una heurística pública,
no el tokenizer real de Anthropic — no hay uno offline en este contenedor;
el caso de `Write` queda sin medir; el 4.5× de `Edit` es de un caso real,
no una constante universal (un `old_string` ya único costaría menos).

## Por qué esta regla vive aquí y no en la inyección de la sesión

Medido (ERR-063): la directiva existía **sólo** en la inyección de auto mode al
prompt de sistema del orquestador, y **cero** de las reglas y los `CLAUDE.md`
del árbol la mencionaban. Un subagente hereda `CLAUDE.md` y `.claude/rules/`;
no hereda esa inyección. Así que la pregunta *«¿por qué los agentes no respetan
esto?»* tenía respuesta medible y no era «desobedecieron»: nunca les llegó.

THYROX es el **proveedor**, así que la regla vive aquí y los consumidores la
heredan. Ponerla en uno de ellos la volvería a hacer local.

## Escribir un archivo entero es reemplazarlo — se mira antes

`cat > archivo` y `Write(archivo)` son la misma operación: ninguna necesita
saber qué había. La defensa no es elegir la otra herramienta, es mirar
(ERR-064, que borró cinco aserciones ajenas):

```bash
test -e "$F" && { echo "YA EXISTE — leer antes de escribir"; sed -n 1,40p "$F"; }
```

Para un cambio parcial, `sed -i` sobre un patrón único, o un guion Python que
sustituya una cadena declarada — nunca reescribir el archivo entero «porque es
más rápido».

## Invocar un módulo para probarlo no es leerlo

Antes de ejecutar un módulo por su camino por defecto, se comprueba si escribe
(ERR-066, que reescribió un registro de 469 líneas al «verificar que corría»):

```bash
grep -nE "write_text|open\(.*['\"]w|\.write\(|mkdir|unlink" "$M" | head
```

Si escribe, se ejercita por su superficie inerte —`--help`, `--dry-run`— o
importando sus símbolos.

## El catálogo era cuatro herramientas; el problema es de extracción y transformación

`cat`, `sed -n`, `grep`, `find` cubren leer y buscar. No cubren **extraer
columnas**, **filtrar por condición numérica**, **operaciones de conjunto**
entre dos listados, ni **lotes**  — y sin esas, la tentación de resolverlo con
Python o con una herramienta dedicada vuelve por la puerta de atrás.

**Medido en este entorno, no supuesto:** `awk`, `sort`, `uniq`, `comm`, `cut`,
`paste`, `xargs`, `shuf`, `tar` están instalados; `parallel` (GNU) **no**, por
defecto — `which parallel` falla. Ya existe su instalador idempotente,
opt-in y con re-verificación del binario (no del exit code del `apt`):
`src/lib/toolchain.sh::thyrox_toolchain_require_parallel` (`THYROX_INSTALL_PARALLEL=1`).
Hoy **0 gates** lo invocan fuera de su propia suite
(`tests/lib/test-toolchain-parallel.sh`) — el mecanismo de lotes de este
árbol sigue siendo `src/session/run-task-pool.sh`
(`trabajo-en-segundo-plano.md`), no `parallel`; instalarlo no lo reemplaza.

| Necesidad | Idioma |
|---|---|
| columnas 2, 4 y 5 de un TSV | `awk '{print $2,$4,$5}' archivo` |
| filas donde la columna 5 sea exactamente `X` | `awk '$5 == "X"' archivo` |
| filas donde la columna 7 matchee un patrón | `awk '$7 ~ /^[a-f]/' archivo` |
| únicos por columna 2, primera ocurrencia | `awk '!arr[$2]++' archivo` |
| suma / media de una columna | `awk '{s+=$1} END{print s}'` / `awk '{s+=$2} END{print s/NR}'` |
| reemplazo global | `sed 's/foo/bar/g' archivo` |
| recortar espacios al inicio/final | `sed 's/^[ \t]*//;s/[ \t]*$//' archivo` |
| borrar líneas en blanco | `sed '/^$/d' archivo` |
| líneas compartidas entre dos listados ya ordenados | `comm -12 a b` |
| conteo de valores más frecuentes en una columna | `cut -f2 archivo \| sort \| uniq -c \| sort -k1nr \| head` |
| aplicar un comando a cada resultado de `find`, N a la vez | `find . -name '*.log' \| xargs -P4 -I{} <comando> {}` |
| muestreo aleatorio de N líneas | `shuf archivo \| head -n N` |
| numerar líneas | `cat -n archivo` |

No es la lista completa de POSIX — es la que cubre lo que hasta ahora tentaba
a abrir Python para una tarea de una línea. Se amplía cuando aparezca un caso
nuevo, no por completitud.

## El gate — porque una regla sin script es prosa

`src/hooks/detect_dedicated_tool_usage.py`, sexto detector de
`pretooluse_dispatch.py`. Dispara sobre `Write`/`Edit`/`Read` cuando el
`file_path` no es binario/medio y el contenido no colisiona con el
delimitador de heredoc, y sugiere el equivalente Bash exacto.

```bash
python3 tests/hooks/test_detect_dedicated_tool_usage.py -q
```

**Avisa, no bloquea**, misma razón que sus cinco hermanos: un patrón por
extensión no distingue "esto era más simple en Bash" de "esto exigía la
herramienta" — bloquear con un instrumento que no discrimina sería el
sub-patrón D de `metrica-decide-la-conclusion.md` con el propio gate como
sujeto.

**Sus dos mitades de juicio se probaron por anulación.** Retirada la
excepción binaria caen exactamente 3 de los 13 casos; retirada la de
colisión de heredoc, las otras 3 — ni una más en ninguno de los dos, medido
en el mismo pase que las escribió.

**Lo que NO cierra, declarado:** un `Write`/`Edit` de texto genuinamente
necesario por tamaño o por estructura (JSON con orden de claves estable,
RST con tablas complejas) no tiene aquí excepción objetiva — el aviso sale
igual, y el criterio de ignorarlo queda en quien lo recibe. Cierra ERR-063.

Origen: directiva del ejecutor 2026-09-12, tras confirmar que la regla
llevaba dos meses sin script (ERR-063, 2026-09-09) y que su sucesor citado
por ordinal (`#287`) había colisionado con otros dos sujetos en el store.
Sucesor con cita durable: **TASK-THYROX-0016**.
