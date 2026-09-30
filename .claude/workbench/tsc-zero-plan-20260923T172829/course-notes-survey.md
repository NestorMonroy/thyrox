# Revisión de `ai-course-notes` para el plan tsc cero

Fuente: `NestorMonroy/ai-course-notes` @ `717e2df`, clon de sólo lectura en
`/home/user/nestormonroy/ai-course-notes`. Apuntes en chino, en LaTeX
(`*-notes.tex`), de cursos y charlas: CS25, CS224n/r, CS231n, CS329A, CS336,
Berkeley LLM Agents, entre otros. `tools/` sólo trae scripts de producción de
apuntes (transcripción, PDF, sitio): nada reutilizable como código para el lazo.

## Método (GNU Parallel + gawk)

- universo: `git ls-files '*-notes.tex'` → `course-notes-files.txt` (el apunte
  fuente; se excluyen transcripciones para no contar dos veces);
- términos: `course-terms.tsv` (nombre, regex);
- `parallel --colsep '\t' -j4 --tag` corre un `grep -c -i -E` por término
  sobre el universo → `course-term-hits.tsv`;
- `gawk` agrega por término → `course-term-summary.tsv` (archivos, menciones,
  archivo con más menciones);
- las subsecciones relevantes se extraen con un `gawk` por
  (archivo, título de subsección), también con `parallel`.

Un primer agregado publicó «menciones = 0» en todos los términos: `--tag`
separa sus argumentos con espacio, y `file:count` es el ÚLTIMO campo, no el
tercero. Se corrigió leyendo la salida real con `cat -A`.

Métrica: archivos y líneas con coincidencia por término.
Ciega a: el concepto nombrado con otras palabras (los apuntes mezclan chino e
inglés), así que los conteos acotan dónde leer; no miden cobertura.

## Lo que se adopta, y a qué pieza del plan

| Idea (fuente) | Pieza del plan |
|---|---|
| Thompson sampling con posterior Beta (CS224R L14) | `tsc_schedule`: elegir proponente muestreando α̃ ~ Beta(aceptadas + ε·α₀, rechazadas + ε·(1-α₀)). La α̂ suavizada del plan es la MEDIA de esa misma posterior; Thompson añade la exploración de proponentes con pocas pruebas. La semilla va al manifiesto. |
| Verificadores por capas: rápido para podar, determinista y caro al final (Berkeley SP25 L12) | `tsc_zero_step`: primer filtro con el servicio de lenguaje sobre los archivos tocados (barato, incremental); `tsc --noEmit` completo sólo sobre lo que pasa. |
| *Margin collapse*: si la aceptación cae en todo el frente, no agrandar el lote; revisar deriva (SP25 L12) | condición de parada: una caída global de α detiene el lazo y publica el diagnóstico en vez de insistir. |
| *Failure taxonomy* y *failure transition matrix*; separar fallo de infraestructura de fallo del participante (Berkeley F25 L04) | registro de cada lote: qué diagnósticos salen y cuáles entran, por código; y el fallo de infraestructura (un proveedor que lanza, un job muerto) no cuenta como rechazo de la propuesta. |
| *Metric contract* versionado; comparación pareada sobre el mismo snapshot (F25 L04) | la clave del diagnóstico (archivo, código, mensaje, sin línea), el universo (`tsconfig` raíz) y la agregación se congelan y versionan; cambiar la clave es cambio mayor. |
| Plan-Act-Verify: declarar antes qué archivos se tocan y qué pruebas corren (Berkeley F24 L07) | cada propuesta declara sus archivos y sus diagnósticos objetivo antes de aplicarse (ya en el plan). |
