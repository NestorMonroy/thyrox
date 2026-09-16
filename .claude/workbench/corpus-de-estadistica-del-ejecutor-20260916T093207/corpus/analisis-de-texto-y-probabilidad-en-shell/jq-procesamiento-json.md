# jq: procesar JSON desde la terminal (más allá de grep/sed/awk)

Artefacto abstracto adicional, motivado por algo que quedó señalado pero sin resolver en el análisis del repositorio: `grep`/`sed`/`awk` funcionan por líneas, y un JSON real casi nunca respeta una estructura de una-línea-por-registro. Cuando el archivo `.json` es grande o anidado, `jq` es la herramienta correcta — este archivo cubre lo esencial para usarlo bien.

## Por qué `grep`/`awk` no alcanzan aquí

```bash
# Esto NO es confiable sobre JSON real: no entiende anidamiento,
# y un valor puede estar en la misma línea que su clave o no, según cómo se generó el archivo
grep '"nombre"' archivo.json
```
Funciona por casualidad si el JSON está "bonito" (una clave por línea), pero se rompe apenas el archivo está minificado en una sola línea gigante — que es exactamente lo que suele pasar con JSON generado por herramientas (índices de búsqueda, exports de datos, APIs).

## Instalación

```bash
# Debian/Ubuntu
sudo apt-get install jq

# macOS con Homebrew
brew install jq
```

## Sintaxis básica: el filtro `.`

```bash
echo '{"a":1,"b":[1,2,3],"c":{"d":"x"}}' | jq '.'
```
`.` es el filtro identidad — imprime el JSON completo, pero **formateado y coloreado** (pretty-print), lo cual ya es útil por sí solo para inspeccionar un JSON minificado.

## Acceder a campos y elementos

```bash
echo '{"a":1,"b":[1,2,3],"c":{"d":"x"}}' | jq '.c.d'      # "x"  — acceso anidado con puntos
echo '{"a":1,"b":[1,2,3],"c":{"d":"x"}}' | jq '.b[1]'      # 2    — indexar un array (base 0)
echo '{"a":1,"b":[1,2,3],"c":{"d":"x"}}' | jq '.b[-1]'     # 3    — índice negativo = desde el final
```

## Inspeccionar la forma de un JSON desconocido, antes de escribir el filtro final

```bash
jq 'keys' archivo.json      # lista las claves del objeto raíz
jq 'length' archivo.json    # cuántos elementos tiene (claves si es objeto, elementos si es array)
jq 'type' archivo.json      # "object", "array", "string", "number", etc.
```

Esto es el equivalente en JSON de lo que hacíamos con `head`/`wc -l` sobre un CSV desconocido: perfilar la estructura antes de procesar a ciegas.

## Filtrar arrays de objetos — el caso más común

```bash
echo '{"nombre":"a","valor":10}
{"nombre":"b","valor":25}' | jq -s 'map(select(.valor > 15))'
```

Salida real:
```json
[
  {
    "nombre": "b",
    "valor": 25
  }
]
```

**Qué hace cada pieza:**
- `-s` (slurp) junta múltiples JSON de líneas separadas en un solo array antes de aplicar el filtro — necesario aquí porque la entrada son dos objetos JSON independientes, no ya un array.
- `map(...)` aplica el filtro interno a cada elemento del array.
- `select(condicion)` deja pasar solo los elementos que cumplen la condición — el equivalente de `awk '$3 > n'` pero para JSON.

## Extraer solo ciertos campos, reformando el JSON (proyección)

```bash
echo '[{"nombre":"a","valor":10,"extra":"x"},{"nombre":"b","valor":25,"extra":"y"}]' \
  | jq '.[] | {nombre, valor}'
```

`.[]` desempaqueta cada elemento del array por separado (uno por línea de salida), y `{nombre, valor}` construye un nuevo objeto quedándose solo con esos dos campos — análogo a `cut -f1,2` pero preservando la estructura JSON en vez de aplanar a texto.

## Convertir JSON a texto plano, para combinarlo con grep/awk/sed

```bash
jq -r '.[] | [.nombre, .valor] | @csv' archivo.json
```

`-r` (raw output) quita las comillas que jq pondría alrededor de strings, y `@csv` formatea cada línea como CSV — el punto de salida donde JSON deja de ser el formato de trabajo y vuelves al mundo de líneas de texto donde `awk`/`cut`/`sort` sí aplican directamente.

## Manejar valores que podrían no existir, sin que el programa falle

```bash
echo '{"a":1}' | jq '.b'              # null (jq no falla, solo devuelve null)
echo '{"a":1}' | jq '.b // "default"' # "default" — operador // da un valor por defecto si es null
echo '{"a":1}' | jq '.b?'             # variante que además suprime errores de tipo, no solo de ausencia
```

## Resumen: cuándo usar jq en vez de grep/awk sobre un archivo de datos

| Situación | Herramienta |
|---|---|
| Archivo de texto plano, una línea = un registro | `grep`/`sed`/`awk` |
| CSV/TSV con columnas fijas | `awk`/`cut` |
| JSON, sin importar si está minificado o anidado | `jq` |
| JSON gigante donde ni siquiera quieres cargarlo completo en memoria | `jq --stream` (procesa el JSON como una secuencia de eventos, sin construir el árbol completo en memoria) |
