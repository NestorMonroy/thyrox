# Utilidades adicionales de bash, inspiradas en un repositorio real

Este archivo agrega técnicas que no estaban en los artefactos anteriores, descubiertas al inspeccionar la estructura real de `/tmp/probabilityForComputerScientists` (un repo tipo "libro/sitio generado" con HTML, JS, Python y datos mezclados). Todas las salidas mostradas son reales.

## 1. Detectar archivos duplicados o casi idénticos con `diff`

Al perfilar los scripts del repo se encontró que dos archivos (`bridgeCondOdds.py` y `bridgeStarter.py`) tienen el mismo número de definiciones de función. Antes de asumir que son distintos, conviene compararlos directamente:

```bash
diff -u scripts/bridgeCondOdds.py scripts/bridgeStarter.py | grep -c '^[+-]'
```

Salida real: `0` — cero líneas de diferencia, es decir, son **archivos idénticos** con nombres distintos (probablemente uno es una copia de respaldo del otro).

**Patrón general para detectar duplicados en un árbol completo, usando checksums en vez de comparar de a pares:**

```bash
find . -type f -name "*.py" -exec md5sum {} \; | sort | awk '{print $1}' | uniq -d
```
Esto agrupa por hash MD5: si el mismo hash aparece más de una vez (`uniq -d`), hay archivos byte-idénticos en el árbol, sin importar el nombre.

## 2. Medir "peso" de contenido sin abrir el archivo completo — `wc -w` en lote

Cuando quieres identificar qué documentos son los más extensos de un árbol grande de HTML/Markdown, sin necesidad de leer ninguno:

```bash
find chapters -name "*.html" -exec wc -w {} \; | sort -rn | head -5
```

Salida real (archivo y conteo de palabras, no contenido):

```
10003 chapters/part2/pmf/sumDiceList.html
8492 chapters/examples/100_binomial_problems/index.html
3629 chapters/part1/many_flips/index.html
```

Útil como filtro previo antes de decidir en qué archivos vale la pena invertir tiempo de lectura o de procesamiento más costoso (por ejemplo, antes de correr el análisis TF-IDF de los artefactos anteriores sobre todo un árbol, primero identificas cuáles archivos son sustanciales).

## 3. Inventario de archivos `.json` por tamaño, útil antes de hacer parsing masivo

```bash
find . -name "*.json" -printf '%s\t%p\n'
```

Salida real:

```
568614   ./searchIndex.json
19535410 ./data/babyNames/count_map.json
471945   ./chapters/examples/bayesian_carbon_dating/historical_c14.json
7057     ./print/hash_values.json
18286    ./plugins/bootstrap-custom/config.json
```

Detectar que `count_map.json` pesa ~19.5MB *antes* de intentar abrirlo con una herramienta como `jq` evita sorpresas de rendimiento — con archivos de ese tamaño conviene usar `jq` en modo streaming (`jq --stream`) en vez de cargarlo completo en memoria.

## 4. Validar codificación de texto en lote, sin listar contenido

Antes de aplicar `grep`/`sed`/`awk` con expresiones regulares que asumen ASCII o UTF-8 limpio, vale la pena descartar archivos con codificación corrupta o mixta:

```bash
for f in $(find . -name "*.py"); do
  if ! iconv -f utf-8 -t utf-8 "$f" > /dev/null 2>&1; then
    echo "NO VALIDO: $f"
  fi
done
```

En este repo, los 17 archivos `.py` pasaron la validación sin errores — pero el patrón es el mismo que usarías para descartar archivos problemáticos en un corpus más grande o de origen menos confiable, antes de correr cualquiera de los scripts de análisis de los artefactos anteriores.

## 5. Cuándo fue tocado por última vez un subdirectorio específico (no el repo completo)

```bash
git log -1 --format='%ad' --date=short -- scripts/
```

Salida real: `2021-01-05` — la fecha del último commit que modificó algo dentro de `scripts/`, ignorando cambios en el resto del repositorio. Sirve para responder "¿esta carpeta está abandonada o sigue activa?" sin tener que revisar el historial completo del proyecto.

## 6. Resumen: cuándo usar cada técnica de este archivo

| Pregunta que quieres responder | Comando base |
|---|---|
| ¿Hay archivos duplicados en el árbol? | `md5sum` + `sort` + `uniq -d` |
| ¿Cuáles documentos son los más extensos? | `find -exec wc -w` + `sort -rn` |
| ¿Qué tan pesados son mis archivos de datos antes de parsearlos? | `find -printf '%s\t%p\n'` |
| ¿Hay archivos con codificación corrupta? | `iconv` en bucle sobre `find` |
| ¿Cuándo se tocó por última vez esta carpeta? | `git log -1 -- carpeta/` |
