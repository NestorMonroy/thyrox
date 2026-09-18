# Detección de tipo real de archivo, pipeline de build y config hjson

Quinto artefacto de esta serie — cubre tres cosas que no estaban en los anteriores porque requerían mirar más allá de `chapters/` y `scripts/`: los binarios `.pkl` que trae el repo, los scripts de automatización de la raíz (`compile.py`, `buildIndex.py`, `runLocal.sh`, `gitCommit.sh`), y el archivo de configuración `bookOutline.hjson` que define la estructura completa del sitio. Todas las salidas son reales.

## 1. `file` vs extensión: por qué no confiar solo en el nombre del archivo

Todo lo que hicimos en los artefactos anteriores filtraba por extensión (`-name "*.py"`, `-name "*.csv"`). Eso falla cuando la extensión miente o cuando el contenido no es lo que promete. El comando `file` inspecciona los primeros bytes reales (magic bytes), no el nombre:

```bash
file data/babyNames/all_years.pkl data/babyNames/count_map.json scripts/bridgeCond.csv en/ProbabilityForComputerScientists.pdf
```

Salida real:

```
data/babyNames/all_years.pkl:            data
data/babyNames/count_map.json:           ASCII text, with very long lines (65536), with no line terminators
scripts/bridgeCond.csv:                  ASCII text, with very long lines (924)
en/ProbabilityForComputerScientists.pdf: PDF document, version 1.4, 264 page(s)
```

**Hallazgo relevante:** `all_years.pkl` se reporta simplemente como `data` (binario sin patrón textual reconocible) — es un pickle de Python, formato binario propio del lenguaje. Si intentas `grep` sobre ese archivo, no vas a obtener un error, pero tampoco resultados útiles: `grep` trata cualquier archivo como binario en cuanto detecta bytes nulos, y por defecto solo te avisa "binary file matches" en vez de mostrar contexto.

**Regla práctica antes de correr `grep -r` sobre un árbol mixto:**

```bash
# Evita perder tiempo (o falsos positivos confusos) sobre binarios
grep -rIl "patron" .   # -I = ignora archivos binarios automáticamente
```

La `-I` (mayúscula) le dice a `grep` que se salte cualquier archivo que detecte como binario, sin necesidad de listar extensiones a excluir manualmente.

## 2. `.pkl` como caso especial: por qué ninguna herramienta de texto sirve aquí

Los tres `.pkl` del repo (`all_years.pkl`, `count_map.pkl` de 25MB, `all_names.pkl`) son serializaciones binarias específicas de Python (`pickle`). No hay manera de inspeccionarlos con `grep`/`sed`/`awk` de forma útil — la única vía es deserializarlos con el propio Python:

```bash
python3 -c "import pickle; d = pickle.load(open('data/babyNames/all_years.pkl','rb')); print(type(d), len(d) if hasattr(d,'__len__') else '')"
```

Esto no es "otro one-liner de bash" — es la excepción que confirma la regla de la guía de decisión original: cuando el contenido no es texto plano, ninguna de las cuatro herramientas base (`grep`, `sed`, `awk`, `find`) puede mirar *dentro* del archivo, solo `find` puede seguir sirviendo para localizarlo por metadatos (tamaño, fecha, ruta).

## 3. Leer el pipeline de build real del repositorio

El repo trae dos scripts de una sola línea (o pocas) en la raíz que revelan cómo se construye y publica el sitio. Verlos completos es razonable porque son scripts de automatización de una sola línea, no contenido creativo:

```bash
cat runLocal.sh
```
```
python compile.py -t
python -m http.server
```

```bash
cat gitCommit.sh
```
```
python buildIndex.py
python compile.py 
cd print
python printbook.py
cd ..
git add *
git commit -m 'auto commit'
git push
```

**Lectura del pipeline:** `buildIndex.py` genera el índice de búsqueda, `compile.py` genera el HTML final a partir de las fuentes (probablemente de `chapters/` hacia `en/`), `printbook.py` genera el PDF consolidado, y luego todo se commitea junto — es decir, **`en/` y los `.html` compilados no son la fuente de verdad, son artefactos generados**. Si alguna vez necesitas editar contenido de este repo, el lugar correcto es `chapters/`, no `en/`.

Esto se puede confirmar por tamaño, sin necesidad de leer ningún archivo:

```bash
du -sh en/ chapters/
```

Salida real:

```
55M  en/
3.0M chapters/
```

`en/` pesa ~18 veces más que `chapters/` — consistente con ser la versión ya compilada/expandida (HTML completo con navegación, JS embebido, etc.) de una fuente mucho más compacta.

## 4. Parsear la configuración `.hjson` con `grep`, sin un parser de hjson instalado

`bookOutline.hjson` define la estructura completa del libro (partes, secciones). Aunque lo ideal sería parsearlo con la librería `hjson` de Python (ya está en `requirements.txt` del repo), se puede extraer información estructural rápida solo con `grep`, sin instalar nada:

```bash
# Cuántas "partes" define el libro
grep -oE '"part[0-9]+"' bookOutline.hjson | sort -u
```

Salida real:

```
"part1"
"part2"
"part3"
"part4"
"part5"
"part6"
```

```bash
# Cuántas secciones con título tiene la estructura completa
grep -c '"title"' bookOutline.hjson
```

Salida real: `8`

**Límite de este approach:** funciona para conteos y listados simples porque el archivo tiene una convención de comillas consistente, pero para cualquier cosa que dependa de la jerarquía real (qué secciones pertenecen a qué parte), `grep` ya no alcanza — ahí sí hace falta un parser real de HJSON/JSON, porque `grep` no entiende anidamiento, solo líneas.

## 5. Resumen actualizado: qué se había quedado fuera del análisis inicial

| Elemento del repo | Por qué no estaba antes | Qué reveló |
|---|---|---|
| Archivos `.pkl` (binarios) | Se filtró solo por extensiones de texto | Requieren Python, no bash, para inspeccionar contenido |
| `compile.py` / `buildIndex.py` / `runLocal.sh` / `gitCommit.sh` | No estaban en `scripts/`, sino en la raíz | Revelan que `en/` es generado, no la fuente editable |
| `bookOutline.hjson` | No es `.py` ni `.csv`, se pasó por alto | Estructura completa del libro: 6 partes, 8 secciones con título |
| Comparación `en/` vs `chapters/` por tamaño | No se había corrido `du` a nivel de directorio completo | Confirma cuál carpeta es la fuente real (`chapters/`, 18x más pequeña) |
