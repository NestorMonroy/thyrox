# Referencia completa de flags de grep

Hoja de referencia standalone — reúne en un solo lugar las opciones de `grep` que aparecieron sueltas en los one-liners anteriores, más las que faltaban.

## Selección de qué mostrar

| Flag | Qué hace | Ejemplo probado |
|---|---|---|
| `-i` | Ignora mayúsculas/minúsculas | `grep -i "error" log.txt` → matchea `Error:` y `error menor` |
| `-v` | Invierte: muestra líneas que NO matchean | `grep -v "error" log.txt` |
| `-w` | Coincidencia de palabra completa (no substring) | `grep -w "cat"` sobre `cat/catalog/scatter` → solo matchea `cat` |
| `-x` | Coincidencia de LÍNEA completa exacta | `grep -x "todo bien" log.txt` → solo si la línea es exactamente esa |
| `-o` | Imprime solo la parte que matchea, no la línea completa | `grep -oE "[A-Za-z]+:" log.txt` → extrae `Error:`, `WARNING:` |

## Conteo y localización

| Flag | Qué hace |
|---|---|
| `-c` | Cuenta líneas que matchean (no ocurrencias — una línea con 2 matches cuenta como 1) |
| `-n` | Antepone el número de línea a cada resultado |
| `-l` | Solo lista los NOMBRES de archivo que contienen al menos un match (no las líneas) |
| `-L` | Lo opuesto a `-l`: lista archivos que NO contienen ningún match |

Probado:
```bash
grep -c "error" log.txt      # 1  (cuenta líneas, sin -i)
grep -ci "error" log.txt     # 2  (con -i, matchea "Error:" y "error menor")
grep -ni "warning" log.txt   # 3:WARNING: algo  (numero de linea + case-insensitive)
```

## Contexto alrededor del match

| Flag | Qué hace |
|---|---|
| `-A N` | Muestra N líneas DESPUÉS del match (After) |
| `-B N` | Muestra N líneas ANTES del match (Before) |
| `-C N` | Muestra N líneas antes Y después (Context) — equivalente a `-A N -B N` |

Probado:
```bash
printf "a\nb\nOBJETIVO\nc\nd\n" | grep -A1 -B1 OBJETIVO
```
Salida real: `b`, `OBJETIVO`, `c` — una línea antes y una después del match, en el orden original.

**Nota de portabilidad:** `-A`/`-B`/`-C` son extensiones GNU, no existen en `grep` POSIX puro. Para el mismo resultado en modo estrictamente portable, hay que usar `sed` con direcciones relativas o `awk` llevando un buffer de líneas previas manualmente.

## Modo de expresión regular

| Flag | Sabor de regex |
|---|---|
| (ninguno) | BRE — ver el artefacto dedicado de BRE vs ERE |
| `-E` | ERE |
| `-F` | Ninguno — trata el patrón como texto LITERAL, sin interpretar metacaracteres (más rápido si no necesitas regex) |
| `-P` | PCRE (solo GNU) — permite backreferences en el patrón y lookahead/lookbehind, que ni BRE ni ERE POSIX soportan |

```bash
# -F es útil cuando buscas un string que tiene caracteres que serían metacaracteres en regex
grep -F "precio: $5.00" archivo.txt   # el punto y el signo $ se buscan literalmente, sin -F habría que escaparlos
```

## Recorrido de árboles de directorios

| Flag | Qué hace |
|---|---|
| `-r` / `-R` | Recursivo (extensión GNU, ver la guía de decisión para el equivalente POSIX con `find`) |
| `-I` | Al recorrer recursivamente, ignora archivos binarios automáticamente |
| `--include="*.ext"` | Solo busca dentro de archivos que matcheen ese patrón de nombre |
| `--exclude="*.ext"` | Excluye archivos que matcheen ese patrón |
| `--exclude-dir="carpeta"` | Excluye una carpeta completa del recorrido (útil para `.git`, `node_modules`) |

```bash
grep -rIl --exclude-dir=.git "TODO" .
```

## Combinaciones habituales y qué resuelven

| Necesitas | Combinación |
|---|---|
| Contar cuántos ARCHIVOS distintos contienen un patrón (no líneas) | `grep -rl "patron" . \| wc -l` |
| Ver coincidencias exactas de palabra, sin importar mayúsculas | `grep -iw "patron" archivo` |
| Extraer solo los emails de un archivo de texto | `grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' archivo` |
| Buscar en varios archivos y saber en cuál está cada match | `grep -n "patron" *.txt` (el nombre de archivo se antepone automáticamente cuando hay más de un archivo) |
| Silenciar toda salida y solo usar el código de salida (para scripts) | `grep -q "patron" archivo && echo "existe"` |

`-q` (quiet) no imprime nada — solo devuelve código de salida 0 si encontró algo y 1 si no, útil dentro de un `if` sin necesitar capturar ni descartar la salida manualmente.
