# find + grep en un repositorio real: ejemplos verificados

Todos los comandos de este archivo se corrieron contra un repositorio real clonado en `/tmp/probabilityForComputerScientists` (884 archivos, mezcla de HTML, JS, Python, CSS, PDF, CSV) y el resultado mostrado es la salida real, no inventada. Sirve como continuación de la guía de decisión ya entregada, con datos genuinos en vez de ejemplos abstractos.

## 1. Perfilar un repositorio desconocido por tipo de archivo

Antes de buscar contenido, conviene saber qué hay en el árbol. Combinación de `find` + `sed` + `sort` + `uniq -c`:

```bash
find . -type f | sed -n 's/.*\.\([a-zA-Z0-9]*\)$/\1/p' | sort | uniq -c | sort -rn | head -10
```

Salida real obtenida:

```
    305 js
    280 html
    102 pdf
     82 png
     20 css
     17 py
     14 sample
     12 jpg
      6 map
      5 json
```

**Por qué funciona:** `sed -n 's/.../\1/p'` extrae solo la extensión de cada ruta usando un grupo de captura, y solo imprime (`p`) cuando hay coincidencia — así se descartan archivos sin extensión sin necesitar un `grep` adicional.

## 2. Localizar y contar funciones definidas en código Python disperso en varios archivos

Cuando el repo tiene scripts sueltos (no un paquete estructurado), `grep -rn` con un patrón que cubra ambos niveles de indentación es más rápido que abrir archivo por archivo:

```bash
grep -rn "^def \|^    def " scripts/*.py
```

Salida real (17 definiciones encontradas en 6 archivos):

```
scripts/bridgeCondOdds.py:8:def main():
scripts/bridgeCondOdds.py:15:def simulate_one(cond_count):
scripts/bridgeStarter.py:8:def main():
scripts/makeJointCovid.py:22:def joint(f, s, d):
scripts/makeJointCovid.py:30:def joint_d0(f, s):
scripts/permsOfCoins.py:4:def main():
```

**Nota de portabilidad:** el patrón usa `\|` para alternancia dentro de BRE — es una extensión GNU. En `grep -E` (ERE) el equivalente portable sería:
```bash
grep -rnE "^(def |    def )" scripts/*.py
```

## 3. Ver qué librerías externas usa un conjunto de scripts, sin abrir cada uno

```bash
grep -h "^import\|^from" scripts/*.py | sort -u
```

Salida real:

```
from tqdm import tqdm
import itertools
import numpy as np
import pydealer
```

`grep -h` suprime el prefijo `nombre_archivo:` cuando buscas en varios archivos a la vez — útil cuando solo te interesa el contenido, no la procedencia línea por línea.

## 4. Verificar consistencia estructural de un archivo de datos con `awk`

Antes de procesar un CSV/matriz numérica, es común verificar cuántas columnas tiene realmente (no siempre coincide con lo documentado):

```bash
head -1 scripts/bridgeCond.csv | awk -F' ' '{print NF" columnas"}'
wc -l scripts/bridgeCond.csv
```

Salida real:

```
37 columnas
37 scripts/bridgeCond.csv
```

Confirma que la matriz es cuadrada (37×37) sin necesidad de abrir el archivo — relevante antes de correr cualquier script que asuma esa forma.

## 5. Encontrar los archivos más pesados de un tipo específico (excluyendo binarios pesados irrelevantes)

```bash
find . -type f \( -name "*.py" -o -name "*.html" -o -name "*.js" -o -name "*.css" \) -printf '%s %p\n' | sort -rn | head -5
```

Salida real:

```
6992939 ./plugins/ace/worker-xquery.js
604116 ./plugins/ace/ace.js
431263 ./plugins/math.min.js
403884 ./plugins/ace/mode-jsoniq.js
402333 ./plugins/ace/mode-xquery.js
```

**Por qué el `-o` entre paréntesis:** cada `-name` es una condición separada; sin agrupar con `\( ... \)` y unir con `-o` (OR), `find` interpretaría las condiciones con AND implícito y no devolvería nada, porque un archivo no puede tener dos extensiones a la vez.

## 6. Contar líneas de código total sin herramientas externas (sin `cloc`)

```bash
find . -name "*.py" -exec cat {} + | wc -l
```

Salida real: `1023` líneas de Python en todo el repo, sumando los 17 archivos `.py` encontrados. El patrón `-exec cat {} +` concatena todos los archivos encontrados en una sola invocación de `cat` (agrupado, igual que en la guía anterior) antes de contarlos con `wc -l`.

## 7. Metadatos de repositorio con `git log` (no contenido, solo historial)

Cuando el árbol es un repo git, `find`/`grep` no son la única fuente de señal — el historial de commits también cuenta:

```bash
git log --oneline | wc -l          # total de commits
git log --format='%an' | sort -u   # lista de autores únicos
```

Salida real: 585 commits, con autores como Alex Kassil, Andy Wang, Calvin Xu, Chris Cooper, Chris Piech, entre otros — útil para entender de un vistazo si un repo es de un solo mantenedor o de un equipo grande, antes de decidir cómo tratarlo.
