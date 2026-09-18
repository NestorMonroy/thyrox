# Diagnóstico de tipo de archivo y codificación antes de procesar texto

Artefacto abstracto adicional — expande algo que apareció solo de pasada en el análisis del repositorio: antes de aplicar `grep`/`sed`/`awk` a un archivo desconocido, vale la pena verificar qué es realmente (más allá de su extensión) y en qué codificación está.

## `file`: identificar contenido real, no confiar en la extensión

```bash
file archivo_desconocido
```

`file` inspecciona los primeros bytes (magic bytes/número mágico) y reporta el tipo real detectado, sin importar cómo se llame el archivo. Ejemplos de salidas típicas:

```
archivo.txt:   ASCII text
datos.bin:     data
imagen.png:    PNG image data, 800 x 600, 8-bit/color RGBA
reporte.pdf:   PDF document, version 1.4
config.json:   ASCII text, with very long lines (65536), with no line terminators
```

**Cuándo esto importa de verdad:** un archivo `.csv` que en realidad tiene codificación Latin-1 en vez de UTF-8 romperá comparaciones de texto exacto de forma silenciosa; un archivo `.txt` que en realidad es un binario renombrado hará que `grep` imprima `binary file matches` en vez de resultados útiles. `file` te avisa de ambos casos antes de perder tiempo depurando el script equivocado.

## Detectar BOM (Byte Order Mark) — causa silenciosa de fallos en comparaciones exactas

```bash
head -c 6 archivo.csv | od -An -tx1
```

Si los primeros bytes son `ef bb bf`, el archivo tiene BOM UTF-8 al inicio — invisible al ver el archivo en un editor de texto normal, pero presente a nivel de bytes. Esto rompe cualquier comparación exacta contra el encabezado esperado (`"nombre_columna" != "\xEF\xBB\xBFnombre_columna"`, aunque se vean idénticos).

**Limpieza, solo en la primera línea:**
```bash
sed '1s/^\xef\xbb\xbf//' archivo.csv > archivo_limpio.csv
```

## `iconv`: verificar y convertir codificación de texto

```bash
# Verificar si un archivo es UTF-8 válido, sin modificar nada
iconv -f utf-8 -t utf-8 archivo.txt > /dev/null && echo "UTF-8 valido" || echo "NO es UTF-8 valido"

# Convertir de una codificación conocida a UTF-8
iconv -f iso-8859-1 -t utf-8 archivo_latin1.txt > archivo_utf8.txt

# Detectar la codificación real cuando no la sabes (requiere el paquete 'file' con soporte de charset, o herramientas como 'chardet' en Python)
file -i archivo_desconocido.txt
```

**Patrón para validar en lote antes de procesar un árbol completo:**
```bash
for f in $(find . -name "*.txt"); do
  iconv -f utf-8 -t utf-8 "$f" > /dev/null 2>&1 || echo "NO VALIDO: $f"
done
```

## `od`/`hexdump`: ver los bytes crudos cuando algo "invisible" está rompiendo un patrón

```bash
printf "hola\r\n" | od -c
```
Salida típica: muestra explícitamente `\r` (retorno de carro) y `\n` (salto de línea) como caracteres separados — revela finales de línea estilo Windows (`\r\n`) que, procesados como si fueran Unix (`\n` solo), dejan un `\r` invisible pegado al final de cada valor, rompiendo comparaciones exactas o expresiones regulares ancladas con `$`.

**Arreglo típico, quitar retornos de carro:**
```bash
sed 's/\r$//' archivo_dos.txt > archivo_unix.txt
# o, equivalente y más explícito sobre qué hace:
tr -d '\r' < archivo_dos.txt > archivo_unix.txt
```

## Checklist de diagnóstico antes de procesar un archivo de texto desconocido

| Pregunta | Comando |
|---|---|
| ¿Es realmente texto, o un binario con extensión engañosa? | `file archivo` |
| ¿Tiene BOM al inicio? | `head -c 6 archivo \| od -An -tx1` (busca `ef bb bf`) |
| ¿Es UTF-8 válido en todo el archivo? | `iconv -f utf-8 -t utf-8 archivo > /dev/null` |
| ¿Tiene finales de línea estilo Windows (`\r\n`)? | `file archivo` (suele reportar "with CRLF line terminators") o `od -c archivo \| grep '\\\\r'` |
| ¿Cuántas columnas tiene realmente cada fila (si es tabular)? | `awk -F'DELIMITADOR' '{print NF}' archivo \| sort -u` — si aparece más de un número, hay filas inconsistentes |

Correr este checklist antes de escribir el `grep`/`sed`/`awk` definitivo evita el escenario más frustrante: pasar tiempo depurando una regex que en realidad está bien escrita, cuando el problema real es un BOM, un `\r` invisible, o una codificación distinta a la asumida.
