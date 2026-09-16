# awk y sed sobre datos reales del repositorio clonado

Continuación de la referencia de one-liners ya entregada, aplicada esta vez a los dos archivos `.csv` reales que trae el repositorio (`scripts/bridgeCond.csv`, una matriz numérica 37×37, y `data/prLabor.csv`, una serie de probabilidad por día). Todas las salidas son reales.

## 1. Detectar y limpiar un BOM (Byte Order Mark) antes de procesar un CSV

Antes de aplicar cualquier `awk -F','`, vale la pena verificar si el archivo trae BOM UTF-8 al inicio — es una causa común de que la primera columna del encabezado "no matchee" aunque se vea idéntica a simple vista:

```bash
head -c 6 data/prLabor.csv | od -An -tx1
```

Salida real:

```
 ef bb bf 64 61 79
```

`ef bb bf` es exactamente la firma del BOM UTF-8, seguida de `64 61 79` (`day` en ASCII). Es decir: el encabezado real del archivo es `\xEF\xBB\xBFday`, no `day` — cualquier comparación exacta de texto contra `"day"` fallaría silenciosamente.

**Limpieza con `sed`, solo en la primera línea:**

```bash
sed '1s/^\xef\xbb\xbf//' data/prLabor.csv | head -1
```

Salida real:

```
day,probability,,
```

El `1s/.../.../ ` limita el reemplazo a la línea 1 (el resto del archivo no tiene BOM, solo aparece una vez al inicio del archivo completo).

## 2. Verificar consistencia de columnas de una matriz numérica

```bash
head -1 scripts/bridgeCond.csv | awk -F' ' '{print NF" columnas"}'
wc -l scripts/bridgeCond.csv
```

Salida real: `37 columnas` y `37` líneas — confirma que la matriz es cuadrada antes de asumir cualquier operación que dependa de esa forma (ej. multiplicación matricial, normalización por fila).

## 3. Sumar una columna completa

```bash
awk '{sum+=$1} END {print sum}' scripts/bridgeCond.csv
```

Salida real: `43425` — la suma de la primera columna de la matriz.

## 4. Promedio de una columna en un CSV delimitado por comas, saltando encabezado

```bash
tail -n +2 data/prLabor.csv | awk -F',' '{sum+=$2; n++} END {print sum/n}'
```

Salida real: `0.004329` — promedio de la columna de probabilidad, sobre 230 filas de datos (excluyendo el encabezado con `tail -n +2`).

**Por qué `tail -n +2` en vez de `NR>1` dentro del propio `awk`:** ambas funcionan igual aquí; `tail -n +2` es más legible cuando quieres reutilizar el mismo pipeline con distintas herramientas después del corte de encabezado, mientras que `awk 'NR>1 {...}'` es preferible si todo el procesamiento va a quedarse dentro de un solo `awk`.

## 5. Rango (mínimo y máximo) de una columna, en una sola pasada

```bash
tail -n +2 data/prLabor.csv | awk -F',' 'NR==1{min=$1;max=$1} {if($1<min)min=$1; if($1>max)max=$1} END{print "min="min, "max="max}'
```

Salida real: `min=-158 max=72` — el rango de la columna `day`. Nota que `NR==1` aquí se refiere a la primera fila *después* de haber quitado el encabezado con `tail`, no a la primera fila del archivo original.

## 6. Extraer solo una columna de una matriz separada por espacios (no por comas)

Cuando el delimitador es espacio simple o múltiple, `-F' '` puede fallar si hay espacios repetidos entre valores — `awk` con el separador por defecto (cualquier cantidad de espacios/tabs) es más robusto que forzar `-F' '`:

```bash
awk '{print $5}' scripts/bridgeCond.csv | head -3
```

Esto extrae la quinta columna de cada fila sin necesitar `-F`, porque el separador de campos por defecto de `awk` ya colapsa espacios consecutivos — a diferencia de `cut -d' ' -f5`, que trataría cada espacio individual como un separador y devolvería columnas incorrectas si hay espacios dobles.

## 7. Diferencia práctica entre `cut` y `awk` para el mismo archivo

| Situación | Herramienta recomendada |
|---|---|
| Delimitador fijo de un solo carácter (`,`, `\t`) y sin espacios repetidos | `cut -d',' -f2` — más rápido, no necesita intérprete de awk |
| Delimitador de espacios variables (columnas alineadas visualmente con espacios extra) | `awk '{print $N}'` — colapsa espacios automáticamente |
| Necesitas cálculo (suma, promedio, condición) además de extraer | `awk`, siempre — `cut` no calcula, solo extrae |

Este último punto se confirma con los ejemplos 3, 4 y 5 de este archivo: en los tres casos se necesitó una operación numérica, no solo extracción, por lo que `awk` era la única opción de las dos.
