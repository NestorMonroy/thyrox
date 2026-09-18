# Referencia de sintaxis interna de awk

Hoja de referencia standalone — no depende de ningún ejemplo previo. Cubre las variables y estructuras internas de `awk` que aparecen una y otra vez en cualquier one-liner o script.

## Variables internas más usadas

| Variable | Qué contiene | Ejemplo de uso |
|---|---|---|
| `$0` | La línea completa actual, sin procesar | `awk '{print $0}'` (equivalente a `cat`) |
| `$1`, `$2`, ... `$N` | El campo N de la línea actual, según el separador definido | `awk '{print $3}'` (imprime la tercera columna) |
| `NF` | Número de campos (columnas) de la línea actual | `awk '{print NF}'` (cuenta columnas por línea) |
| `NR` | Número de línea actual, contando desde el inicio del archivo (o de todos los archivos si son varios) | `awk '{print NR, $0}'` (numera líneas) |
| `FNR` | Número de línea actual, mismo comportamiento que `NR` pero reinicia en cada archivo nuevo si procesas varios | `awk 'FNR==1{print FILENAME}' *.txt` |
| `FILENAME` | Nombre del archivo que se está procesando actualmente | Útil junto con `FNR` cuando procesas múltiples archivos a la vez |
| `FS` | Separador de campos de ENTRADA (Field Separator) | `awk 'BEGIN{FS=","}'` o `awk -F','` |
| `OFS` | Separador de campos de SALIDA (Output Field Separator) | `awk 'BEGIN{OFS="\t"}{$1=$1; print}'` |
| `RS` | Separador de registros de entrada (por defecto, salto de línea) | `awk 'BEGIN{RS=""}'` trata párrafos separados por línea en blanco como un solo registro |
| `ORS` | Separador de registros de salida (por defecto, salto de línea) | `awk 'BEGIN{ORS=" "}'` imprime todo en una sola línea separado por espacios |
| `SUBSEP` | Separador interno usado en índices de arreglos multidimensionales simulados | Rara vez se cambia manualmente |

## Estructura básica de un programa awk

```awk
BEGIN { /* se ejecuta UNA VEZ, antes de leer cualquier línea */ }
patron1 { acción1 }          /* se ejecuta en cada línea que matchee patron1 */
patron2 { acción2 }
{ accion_para_toda_linea }   /* sin patrón = se ejecuta en TODAS las líneas */
END { /* se ejecuta UNA VEZ, después de procesar todas las líneas */ }
```

Cualquiera de los cuatro bloques (`BEGIN`, patrón+acción, acción sin patrón, `END`) es opcional — un programa awk válido puede tener solo uno de ellos.

## Operadores de patrón

| Patrón | Qué selecciona |
|---|---|
| `/regex/` | Líneas que matchean la expresión regular (ERE nativo, sin necesitar flags) |
| `$3 == "valor"` | Líneas donde el campo 3 es exactamente igual a un valor |
| `$3 ~ /regex/` | Líneas donde el campo 3 matchea una regex (no toda la línea, solo ese campo) |
| `$3 !~ /regex/` | Líneas donde el campo 3 NO matchea |
| `NR > 1` | Líneas después de la primera (saltar encabezado) |
| `condicion1 && condicion2` | Ambas condiciones deben cumplirse |
| `condicion1 \|\| condicion2` | Al menos una condición debe cumplirse |
| `!condicion` | Negación de la condición |

## Arreglos asociativos (el "diccionario" de awk)

```awk
# Contar cuántas veces aparece cada valor del campo 2
{ contador[$2]++ }
END {
  for (clave in contador) print clave, contador[clave]
}
```

Los arreglos de awk son siempre asociativos (indexados por string, aunque uses un número como índice se convierte a string internamente) — no hay arreglos indexados por posición numérica secuencial como en otros lenguajes, aunque puedes simular esa numeración usando `NR` como índice.

**Recorrer un arreglo NO garantiza orden:** `for (clave in arreglo)` recorre las claves en un orden no especificado por el estándar (varía según la implementación de awk). Si necesitas orden, hay que volcar las claves a una lista aparte y ordenarlas explícitamente (por ejemplo, canalizando la salida a `sort` fuera de awk).

## Funciones incorporadas más usadas

| Función | Qué hace |
|---|---|
| `length(s)` | Longitud de un string (o número de elementos si `s` es un arreglo) |
| `substr(s, inicio, largo)` | Extrae una subcadena, `largo` es opcional (hasta el final si se omite) |
| `split(s, arreglo, sep)` | Divide un string en un arreglo, usando `sep` como separador |
| `gsub(regex, reemplazo, s)` | Sustituye TODAS las coincidencias de `regex` dentro de `s` (o de `$0` si se omite `s`) |
| `sub(regex, reemplazo, s)` | Sustituye SOLO la primera coincidencia |
| `sprintf(formato, args...)` | Igual que `printf` pero devuelve el string en vez de imprimirlo |
| `toupper(s)` / `tolower(s)` | Convierte a mayúsculas / minúsculas |
| `index(s, buscado)` | Posición (1-indexada) de la primera aparición de `buscado` dentro de `s`, o 0 si no está |
| `match(s, regex)` | Busca `regex` en `s`; deja la posición en `RSTART` y el largo del match en `RLENGTH` |

## `print` vs `printf` — cuándo usar cada uno

```awk
print $1, $2          # separa automáticamente con OFS, agrega salto de línea al final
printf "%s %s\n", $1, $2   # control total del formato, tú decides el separador y si hay salto de línea
```

`printf` es preferible en cualquier caso donde necesites alinear columnas, controlar decimales (`%.2f`), o formatear números con ancho fijo (`%-10s` para texto alineado a la izquierda en 10 espacios) — `print` no ofrece ese control.

## Diferencia clave entre `next` y `exit`

```awk
{ if ($1 == "saltar") next }   # deja de procesar ESTA línea, sigue con la siguiente
{ if ($1 == "detener") exit }  # deja de procesar TODO el archivo, salta directo al bloque END (si existe)
```
