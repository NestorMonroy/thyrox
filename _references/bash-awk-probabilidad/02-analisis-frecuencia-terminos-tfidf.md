# Medir qué tan discriminante es un término en un corpus (TF-IDF con bash)

Técnica generalizada — aplica a cualquier archivo y cualquier corpus de directorios, no a un proyecto específico.

## El problema que resuelve

Tienes un archivo con términos propios (siglas, tokens en mayúsculas, palabras clave) y quieres saber **cuáles de esos términos realmente distinguen a ese archivo del resto del corpus**, y cuáles son tan comunes en todo el árbol que no aportan señal (ruido).

## El nombre técnico

- **Document Frequency (DF):** en cuántos documentos del corpus aparece un término, sin importar cuántas veces por documento.
- **TF-IDF (Term Frequency – Inverse Document Frequency):** combina cuántas veces aparece el término *en tu archivo* (TF) con qué tan raro es *en el corpus completo* (IDF = `log(N / DF)`). Un término con DF alto (aparece en casi todos los documentos) tiene IDF bajo → poco discriminante, ruido. Un término con DF bajo tiene IDF alto → discrimina, es señal.
- Términos relacionados si quieres profundizar: *keyword extraction*, *term weighting*, *corpus-specific term discrimination*.

## Script genérico (parametrizable)

```bash
#!/bin/bash
# tf_idf_tokens.sh
# Uso: ./tf_idf_tokens.sh <archivo_objetivo> <directorio_corpus> [patron_extraccion]
#
# Calcula tf, df, idf y score = tf*idf para cada token que matchee <patron_extraccion>
# dentro de <archivo_objetivo>, relativo a todos los archivos de <directorio_corpus>.

set -euo pipefail

F="${1:?Uso: $0 <archivo_objetivo> <directorio_corpus> [patron_extraccion]}"
CORPUS="${2:?Falta el directorio del corpus}"
PATRON="${3:-[A-Z][A-Z0-9]*(_[A-Z0-9]+)+}"   # default: tokens ALL-CAPS con guion bajo

[ -f "$F" ] || { echo "No existe el archivo: $F" >&2; exit 1; }
[ -d "$CORPUS" ] || { echo "No existe el directorio: $CORPUS" >&2; exit 1; }

# N = total de documentos en el corpus (denominador del idf)
N=$(find "$CORPUS" -type f | wc -l)
echo "=== Corpus: $N documentos bajo $CORPUS ==="
echo

TOKENS=$(grep -oE "$PATRON" "$F" | sort -u)

printf '%-30s %6s %6s %8s %10s\n' "TOKEN" "TF" "DF" "IDF" "SCORE"
printf '%-30s %6s %6s %8s %10s\n' "-----" "--" "--" "---" "-----"

echo "$TOKENS" | while IFS= read -r tok; do
  [ -z "$tok" ] && continue

  # tf: ocurrencias del token EN el archivo objetivo (no solo existencia)
  tf=$(grep -oE -- "\b${tok}\b" "$F" | wc -l)

  # df: en cuántos archivos del corpus aparece al menos una vez (match de palabra completa)
  df=$(grep -rlw -- "$tok" "$CORPUS" 2>/dev/null | wc -l)

  awk -v tf="$tf" -v df="$df" -v n="$N" -v tok="$tok" '
    BEGIN {
      if (df == 0) df = 1  # evita division por cero / log(0)
      idf = log(n / df)
      score = tf * idf
      printf "%-30s %6d %6d %8.3f %10.3f\n", tok, tf, df, idf, score
    }'
done | sort -k5 -rn
```

## Qué hace cada pieza

1. **`N`** — universo total de documentos, denominador del IDF. Se calcula con `find | wc -l`, ajustable si quieres filtrar por extensión (`find "$CORPUS" -name "*.md"`).
2. **`TOKENS`** — extraídos con `grep -oE` y el patrón que le pases (por defecto, tokens ALL-CAPS tipo `MI_CONSTANTE`). Cambia el tercer argumento si tu corpus usa otra convención (ej. `[a-z]+(-[a-z]+)+` para kebab-case).
3. **`tf`** — cuenta *ocurrencias*, no solo si existe. Se usa `grep -oE | wc -l` en vez de `grep -c`, porque `-c` cuenta líneas que matchean, no ocurrencias (subcuenta si el token aparece dos veces en la misma línea).
4. **`df`** — usa `-w` para exigir coincidencia de palabra completa y evitar falsos positivos por substring (que `SESION` matchee dentro de `SESION_ID`).
5. **`idf`/`score`** — delegado a `awk` porque `log()` no existe en bash puro; es la única pieza fuera de bash estricto, pero sigue siendo herramienta Unix estándar.
6. **`sort -k5 -rn`** al final — ordena por score descendente: los términos más discriminantes quedan arriba.

## Variantes útiles

**Excluir una sub-carpeta del corpus al calcular `df`** (por ejemplo, para no contar el propio archivo/iniciativa como parte del "resto del corpus"):

```bash
df=$(grep -rlw -- "$tok" "$CORPUS" 2>/dev/null | grep -v "/carpeta-a-excluir/" | wc -l)
# y ajustar N restando los documentos de esa carpeta:
N=$(find "$CORPUS" -type f | grep -v "/carpeta-a-excluir/" | wc -l)
```

**Optimizar para corpus grandes (evitar recorrer el árbol una vez por token):**
El script anterior hace un `grep -rlw` por cada token, lo cual es O(tokens × tamaño_del_corpus). Para corpus grandes, construir un índice invertido una sola vez es más eficiente:

```bash
# 1) Una sola pasada: genera un archivo "token TAB archivo" para cada ocurrencia en el corpus
find "$CORPUS" -type f -exec grep -oHnE "$PATRON" {} \; \
  | awk -F: '{print $3, $1}' > indice_invertido.txt

# 2) Consultas de df sobre el índice ya construido, sin volver a tocar el disco
awk '{print $1}' indice_invertido.txt | sort | uniq -c | sort -rn > df_por_token.txt
```
Esto cambia el costo de "recorrer todo el corpus N veces" (una por token) a "recorrer todo el corpus una vez", que es la mejora relevante cuando el número de tokens y el tamaño del corpus crecen.

## Cuándo usar solo el conteo simple (sin score) vs TF-IDF completo

- Si solo necesitas una primera pasada rápida ("¿cuáles de mis términos son raros?"), el conteo de `df` ordenado ascendente ya es suficiente — los de `df` bajo son los candidatos a discriminantes.
- Si necesitas comparar entre archivos con distinta longitud o distinta repetición interna de términos, el score TF-IDF completo es más justo, porque pondera tanto la repetición local (tf) como la rareza global (idf).
