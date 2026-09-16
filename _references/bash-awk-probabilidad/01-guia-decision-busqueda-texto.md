# Guía de decisión: buscar existencia, contenido y patrones en archivos de texto

Esta guía es abstracta — aplica a cualquier árbol de directorios, no a un proyecto en particular. Reúne lo discutido sobre cuándo usar cada herramienta, las diferencias POSIX vs GNU, y BRE vs ERE.

## 1. Árbol de decisión: ¿qué herramienta uso?

| Necesitas... | Herramienta | Por qué |
|---|---|---|
| Saber si un patrón existe/no existe en uno o varios archivos | `grep` | Es la herramienta especializada en coincidencia de texto línea a línea |
| Extraer o transformar un rango de líneas (entre dos patrones, o líneas N a M) | `sed` | Trabaja con direcciones de línea y comandos de edición de flujo |
| Filtrar/calcular sobre columnas (campos numéricos, comparar columnas, sumar, promediar) | `awk` | Es el único de los tres con modelo de "registros y campos" nativo |
| Localizar archivos por nombre, tamaño, fecha, tipo, profundidad | `find` | Recorre el árbol de directorios; no mira contenido, solo metadatos |
| Recorrer un árbol de directorios *y además* mirar contenido | `find` + `grep` (o `grep -r`) | Combinación de metadatos (find) + contenido (grep) |

Regla rápida: **existe/no existe + texto libre → `grep`**. **Rango de líneas o sustitución → `sed`**. **Columnas/números → `awk`**. **Metadatos de archivo → `find`**.

## 2. Combinar `find` + búsqueda de contenido, de forma segura y eficiente

De menos a más recomendable en **POSIX puro** (sin `ripgrep`, sin `grep -r`, sin `-print0`/`xargs -0`, que son extensiones GNU):

```bash
# 1) MÁS EFICIENTE Y SEGURO — agrupa archivos por invocación, maneja nombres con espacios
find . -type f -name "*.ext" -exec grep -l "patron" {} +

# 2) Funciona, pero rompe con nombres de archivo que tengan espacios o saltos de línea
find . -type f -name "*.ext" | xargs grep -l "patron"

# 3) Más lento (un proceso grep por archivo) pero robusto ante nombres raros sin usar -exec +
find . -type f -name "*.ext" | while IFS= read -r f; do
  grep -l "patron" "$f"
done
```

**Por qué la opción 1 gana:** `-exec ... +` es POSIX.1-2008, agrupa varios nombres de archivo por llamada a `grep` (igual que haría `xargs`), y como `find` arma los argumentos internamente (no como texto plano en un pipe), no se rompe con espacios ni caracteres especiales en los nombres.

Si tu entorno sí tiene herramientas GNU disponibles (la mayoría de Linux modernos), la opción más rápida en la práctica es:

```bash
# Con ripgrep, si está instalado — más rápido en árboles grandes (multihilo, ignora .git por defecto)
rg -l "patron" .

# Con GNU grep, sin find, si no necesitas filtros de find
grep -rl "patron" --include="*.ext" .
```

## 3. Buscar contenido dentro de un solo archivo

| Objetivo | Comando |
|---|---|
| Saber si existe / en qué línea | `grep -n "patron" archivo` |
| Contar líneas que matchean | `grep -c "patron" archivo` |
| Líneas que NO matchean | `grep -v "patron" archivo` |
| Imprimir un rango entre dos patrones | `sed -n '/inicio/,/fin/p' archivo` |
| Extraer y transformar (necesitas número de línea o campos) | `awk '/patron/ {print NR, $0}' archivo` |

## 4. POSIX vs GNU — qué se pierde y qué se gana

| Característica | POSIX puro | Solo GNU |
|---|---|---|
| `grep -r` / `grep -R` (recursivo) | No estándar | Disponible |
| `find -print0` / `xargs -0` (separador nulo, seguro con espacios) | No estándar | Disponible |
| `find -exec ... +` (agrupar argumentos) | Disponible desde POSIX.1-2008 | Disponible |
| `sed -E` (regex extendida) | Disponible desde POSIX.1-2008 | Disponible (también `-r` como alias) |
| `grep -A`/`-B`/`-C` (contexto) | No estándar | Disponible |
| `awk` con patrones `/regex/` (ERE nativo) | Disponible | Disponible |
| `ripgrep` (`rg`) | No es un estándar Unix, es un binario aparte | No aplica |

Si el objetivo es portabilidad (scripts que deben correr igual en cualquier Unix, incluidos sistemas mínimos tipo BusyBox), usa la columna POSIX. Si el script solo correrá en tu propia máquina o en Linux/macOS modernos, las extensiones GNU casi siempre dan mejor legibilidad y rendimiento.

## 5. BRE vs ERE (expresiones regulares)

**BRE (Basic Regular Expressions)** — default de `grep` y `sed` sin flags:
- Los metacaracteres `+`, `?`, `|`, `(`, `)` **no funcionan** como tales salvo que los escapes con `\`.
- La alternancia `\|` **no es POSIX estándar** en BRE (es extensión GNU) — en BRE puro no hay alternancia.

**ERE (Extended Regular Expressions)** — `grep -E`, `sed -E`, y nativo en los patrones de `awk`:
- `|` alternancia, `+` una o más, `?` cero o una, `(...)` agrupación, `{n,m}` repetición con rango — todos sin escapar.
- `sed -E` es POSIX desde 2008, seguro de usar en sistemas modernos.
- `awk` usa ERE de forma nativa en sus patrones `/regex/`, equivalente a `grep -E`.

**Límite importante:** los backreferences (`\1` dentro del propio patrón de búsqueda) **no existen en ERE POSIX** — es una extensión de PCRE, no disponible en `grep -E` ni `sed -E` estándar. Para eso hace falta `grep -P` (GNU con soporte PCRE) o un lenguaje con regex completo (Perl, Python).

```bash
# Alternancia
grep -E "error|warning" log.txt

# Agrupación + repetición
grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" archivo.txt

# Sustitución con grupos capturados
sed -E 's/(patron1|patron2)/MATCH/' archivo.txt
```

## 6. Encontrar coincidencias entre dos archivos (sets)

```bash
# Requiere que ambos archivos estén ordenados y sin duplicados
sort -u file1 > a
sort -u file2 > b

comm -12 a b   # líneas en AMBOS (intersección)
comm -23 a b   # líneas SOLO en file1
comm -13 a b   # líneas SOLO en file2

# Alternativa con sort + uniq (menos explícita que comm)
sort a b | uniq -d   # intersección
```
