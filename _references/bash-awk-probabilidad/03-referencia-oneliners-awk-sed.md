# Referencia de one-liners: awk y sed (uso general)

Extraído y generalizado del documento anexado — se omiten los ejemplos específicos de bioinformática (FASTA/FASTQ/BAM/GFF3/BLAST), que aplican a un dominio muy particular. Si los necesitas, están en el archivo original que subiste.

## awk — filtrado y transformación por columnas

```bash
# Extraer columnas 2, 4 y 5
awk '{print $2,$4,$5}' archivo.txt

# Líneas donde la columna 5 es igual a un valor
awk '$5 == "valor"' archivo.txt

# Líneas donde la columna 5 NO es igual a un valor
awk '$5 != "valor"' archivo.txt

# Líneas cuya columna 7 matchea una regex (ERE nativo en awk)
awk '$7 ~ /^[a-f]/' archivo.txt
awk '$7 !~ /^[a-f]/' archivo.txt

# Entradas únicas según la columna 2 (conserva solo la primera aparición)
awk '!arr[$2]++' archivo.txt

# Filas donde la columna 3 es mayor que la columna 5
awk '$3 > $5' archivo.txt

# Suma de la columna 1
awk '{sum += $1} END {print sum}' archivo.txt

# Promedio de la columna 2
awk '{x += $2} END {print x/NR}' archivo.txt

# Eliminar duplicados de línea completa, preservando el orden original
awk '!visited[$0]++' archivo.txt

# Imprimir todo excepto la primera línea (útil para saltar encabezado)
awk 'NR > 1' archivo.txt

# Imprimir un rango de filas (20 a 80)
awk 'NR >= 20 && NR <= 80' archivo.txt

# Agregar una columna calculada al final (suma de col 2 y 3)
awk '{print $0, $2+$3}' archivo.txt

# Número de campos de cada línea, seguido de la línea
awk '{print NF ":" $0}' archivo.txt

# Último campo de cada línea
awk '{print $NF}' archivo.txt

# Líneas con más de N campos
awk 'NF > n' archivo.txt

# Invertir el orden de dos primeras columnas
awk '{print $2, $1}' archivo.txt

# Imprimir todos los campos en orden inverso
awk '{ for (i=NF; i>0; i--) printf("%s ", $i); printf("\n") }' archivo.txt

# Eliminar la columna 2 (la deja vacía, no la remueve del todo)
awk '{ $2 = ""; print }' archivo.txt

# Sustituir "foo" por "bar" solo en líneas que contienen "baz"
awk '/baz/ { gsub(/foo/, "bar") }; { print }' archivo.txt

# Contar líneas totales que contienen un patrón
awk '/patron/ { n++ } END { print n+0 }' archivo.txt

# Contar el total de palabras (campos) del archivo
awk '{ total += NF } END { print total+0 }' archivo.txt

# Agregación: sumar columna 2, agrupado por el valor de columna 1
awk '{array[$1] += $2} END { for (i in array) print i, array[i] }' archivo.tsv

# Explotar un archivo en varios, uno por cada valor distinto del primer campo
awk '{print > $1}' archivo.txt

# Doble espaciado de un archivo
awk '1; { print "" }' archivo.txt
```

## sed — edición de flujo, rangos y reemplazos

```bash
# Reemplazar todas las ocurrencias de "foo" por "bar"
sed 's/foo/bar/g' archivo.txt

# Quitar espacios/tabs al inicio de línea
sed 's/^[ \t]*//' archivo.txt

# Quitar espacios/tabs al final de línea
sed 's/[ \t]*$//' archivo.txt

# Quitar espacios al inicio Y al final
sed 's/^[ \t]*//;s/[ \t]*$//' archivo.txt

# Eliminar líneas en blanco
sed '/^$/d' archivo.txt

# Imprimir solo la línea N (ej. la línea 42)
sed -n '42p' archivo.txt

# Imprimir un rango de líneas (8 a 12 inclusive)
sed -n '8,12p' archivo.txt

# Imprimir las primeras N líneas
sed '10q' archivo.txt

# Imprimir solo las líneas que matchean un patrón
sed -n '/regexp/p' archivo.txt

# Eliminar las líneas que matchean un patrón
sed '/regexp/d' archivo.txt

# Imprimir las líneas que NO matchean
sed -n '/regexp/!p' archivo.txt

# Eliminar las líneas que NO matchean
sed '/regexp/!d' archivo.txt

# Imprimir todo desde un patrón hasta el final del archivo
sed -n '/regexp/,$p' archivo.txt

# Eliminar todo lo que está entre dos patrones (inclusive)
sed '/patron1/,/patron2/d' archivo.txt

# Eliminar todo DESPUÉS de (e incluyendo) una línea con cierto texto
sed -n '/TextoDeCorte/,$!p' archivo.txt

# Imprimir líneas más largas que 65 caracteres
sed -n '/^.\{65\}/p' archivo.txt

# Insertar texto en una posición fija de cada línea (ej. posición 6)
sed 's/^\(.\{6\}\)/\1TEXTO_A_INSERTAR/' archivo.txt

# Insertar un espacio cada 3 caracteres
sed 's/\(.\{3\}\)/\1 /g' archivo.txt

# Convertir fin de línea DOS -> Unix
sed 's/\r$//' archivo.txt

# Convertir fin de línea Unix -> DOS
sed 's/$/\r/' archivo.txt
```

## Notas de portabilidad

- Todo lo anterior en `awk` usa ERE nativo — no hace falta ninguna flag especial, a diferencia de `grep`/`sed` donde ERE requiere `-E`.
- Los ejemplos de `sed` con `\{n\}` (repetición) son sintaxis BRE (con las llaves escapadas). En modo `sed -E` se escribirían sin la barra invertida: `{6}` en vez de `\{6\}`.
- `gsub`, `sub`, arreglos asociativos (`arr[$2]`) y variables como `NR`/`NF` son parte del estándar POSIX de `awk`, no extensiones GNU — funcionan igual en `mawk`, `gawk`, `busybox awk`, etc.
