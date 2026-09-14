# costo-bash-vs-herramienta-dedicada

## El encargo

> «realmente es solo cuando bash no puede hacer cosas, analiza bien porque
> usar Read/Edit/Write tiene mas costo en tokens que Bash, se tiene
> prioridad usar Bash que usar Read/Edit/Write»

`operaciones-de-archivo-con-bash.md` (THYROX, la regla que los cinco
consumidores heredan) dice: *"Read, Edit y Write quedan para lo que Bash
genuinamente no puede hacer"* — una razón sola, de **capacidad**. El
ejecutor señala que hay una segunda razón, de **costo**, y pide medirla
en vez de asumirla — antes de tocar la regla se busco si ya existia el
analisis (no existia en ningún workbench de thyrox ni docs) y se generó
este.

## Lo medido

**1. Read agrega +7.6% de bytes sobre el contenido crudo, y no es
casualidad de una sola muestra.** El propio system prompt de Read lo
declara: *"Results are returned using cat -n format, with line numbers
starting at 1"* — cada línea lleva su número + tab que un `cat`/`sed -n`
normal no agrega. Medido en DOS lecturas reales de esta sesión, sobre
archivos distintos, en momentos distintos del transcript:

| Lectura | Bash (bytes) | Read (bytes) | delta |
|---|---|---|---|
| completa, 201 líneas (`test_write_env.py`) | 9 251 | 9 951 | +700 (+7.6%) |
| parcial, 45 líneas (`job_runs.py`, offset 95) | 2 291 | 2 465 | +174 (+7.6%) |

El mismo porcentaje en los dos casos — independientes, de tamaños
distintos — es la firma de un formato **fijo**, no de una variación
estadística: cada línea paga su prefijo, sin excepción.

**2. Edit puede costar varias veces más que su Bash equivalente, cuando
`old_string` necesita contexto para ser único.** Caso real de esta misma
sesión: resolver el conflicto de merge en `generate_bin.py` quitando tres
marcadores (`<<<<<<<`, `=======`, `>>>>>>>`).

| | bytes |
|---|---|
| Edit real (`old_string` + `new_string`) | 548 |
| `sed -i` equivalente (mismo resultado, sin reproducir el párrafo) | 121 |
| **factor** | **4.5×** |

El motivo estructural: `Edit` exige que `old_string` sea único en el
archivo, y con solo `=======` como ancla eso no alcanza (aparece más de
una vez en un archivo con más de un conflicto, o simplemente no es
suficientemente específico) — así que hubo que incluir el párrafo entero
alrededor, que NO cambiaba, solo para anclar el punto de edición. `sed`
puede anclar por el patrón exacto de la línea (`^<<<<<<< HEAD$`) sin
tocar ni citar el cuerpo.

## Por qué esto SÍ cambia la regla, y no es solo una confirmación

La regla actual da **una** razón (capacidad) para el fallback a
Read/Edit/Write. Lo medido aquí establece una **segunda**, independiente:
incluso cuando Read/Edit/Write SÍ pueden hacer el trabajo, cuestan más —
de forma estructural y reproducible, no ocasional. Eso invierte el peso
de la decisión por defecto: no es "Bash primero, salvo que no alcance"
sino "Bash primero, porque además de alcanzar casi siempre, sale más
barato cuando alcanza".

## Lo que esto NO prueba (`blind_to`, ver `manifest.json`)

- La conversión a tokens (4 char/token) es una heurística pública de la
  industria, **no** el tokenizer real de Anthropic — no hay uno offline
  en este contenedor. Los bytes sí son exactos; los tokens son
  **INFERRED**, no PROVEN.
- No hay caso medido de `Write` en esta sesión con alternativa Bash
  verificada byte a byte — queda sin medir, declarado como tal.
- El 4.5× de Edit es de **un** caso real, no una constante universal: un
  `old_string` corto y ya único costaría mucho menos. Lo que se prueba es
  que el caso EXISTE y con esa magnitud, no que todo uso de Edit lo tenga.

## Piezas

| archivo | qué hace |
|---|---|
| `probes/medir_costo_herramientas.py` | parsea el transcript JSONL real de esta sesión, empareja tool_use/tool_result por id, compara contra el disco (`cat`/`sed -n`) y contra el comando Bash real alternativo |
| `outputs/medicion-cruda.txt` | la salida completa del guion, con las dos mediciones Read y el caso Edit |

## Destino

- `thyrox: .claude/rules/operaciones-de-archivo-con-bash.md` — se añade
  esta medición como segunda razón, con fecha y cita a este directorio.
- `kaupamex-docs` — hallazgo bajo la iniciativa
  `agregar-entrypoints-cortos-thyrox` (la misma donde `H-THYROX-1` ya
  vive), por ser donde el gate `detect_dedicated_tool_usage.py` se cerró
  esta sesión.
