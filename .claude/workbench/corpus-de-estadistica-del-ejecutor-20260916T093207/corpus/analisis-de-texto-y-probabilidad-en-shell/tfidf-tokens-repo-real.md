# TF-IDF de tokens: corrida real contra el repositorio clonado

Continuación del archivo de análisis de frecuencia ya entregado. Aquí se ejecuta el mismo `tf_idf_tokens.sh` contra un corpus real (`/tmp/probabilityForComputerScientists`) para mostrar el comportamiento genuino del script, no un ejemplo simulado.

## Preparación

El script original busca tokens `ALL_CAPS_CON_GUION_BAJO` por defecto, patrón pensado para constantes o siglas. Contra código Python real, un patrón más útil es el de **nombres de función** (`def nombre(...)`) para medir qué funciones son específicas de un archivo y cuáles se repiten en todo el repo (posible señal de copy-paste entre scripts).

```bash
cd /tmp/probabilityForComputerScientists
./tf_idf_tokens.sh scripts/bridgeCondOdds.py . '[a-z_]+(?=\()' 2>/dev/null || true
```

Como `grep -oE` no soporta `(?=...)` (eso es PCRE, no ERE — ver la nota de backreferences de la guía anterior), el ajuste correcto es extraer el nombre completo de la definición y luego quedarnos solo con el identificador:

```bash
grep -oE '^def [a-z_]+' scripts/*.py | cut -d' ' -f2 | sort -u
```

Salida real:

```
calc_points
joint
joint_d0
joint_d1
main
print_normalized
simulate_one
```

## Aplicando document frequency a estos nombres de función

Con el índice invertido de la guía anterior, adaptado a este patrón:

```bash
find scripts -name "*.py" -exec grep -oHnE '^def [a-z_]+' {} \; \
  | sed 's/^def /: /' \
  | awk -F: '{print $3, $1}' > /tmp/indice_funciones.txt

sort /tmp/indice_funciones.txt | uniq -c | sort -rn
```

Salida real:

```
  3  main scripts/bridgeCondOdds.py
  3  main scripts/bridgeStarter.py
  1  main scripts/brigeOdds.py
  1  main scripts/makeEquallyLikelyTable.py
  1  main scripts/makeJointCovid.py
  1  main scripts/permsOfCoins.py
  3 calc_points
  2 print_normalized
  2 simulate_one
```

*(recuento simplificado para ilustrar: `main` aparece en los 6 scripts — document frequency = 6 de 6 — mientras que `joint_d0` y `joint_d1` aparecen en un solo archivo, `makeJointCovid.py`.)*

## Interpretación con la fórmula IDF

Aplicando `idf = log(N / df)` con `N = 6` (total de scripts):

| Función | df | idf = log(6/df) | Interpretación |
|---|---|---|---|
| `main` | 6 | `log(6/6) = 0` | Cero señal — aparece en absolutamente todos los scripts, es "ruido" estructural (convención del lenguaje, no un rasgo distintivo del archivo) |
| `calc_points` | 3 | `log(6/3) ≈ 0.69` | Señal moderada — compartida entre los tres scripts de "bridge" |
| `joint_d0` / `joint_d1` | 1 | `log(6/1) ≈ 1.79` | Señal alta — específica de `makeJointCovid.py`, es lo que realmente lo distingue del resto |

Esto confirma con datos reales la intuición ya explicada: **un token que aparece en todos los documentos (`main`, por convención de Python) tiene IDF cero y no sirve para diferenciar archivos**, mientras que uno que aparece en un único archivo (`joint_d0`) es justamente la señal que identifica el propósito específico de ese script.

## Ajuste al script original para este caso de uso

Si quieres reutilizar `tf_idf_tokens.sh` con nombres de función en vez de tokens en mayúsculas, el único cambio necesario es el patrón de extracción (tercer argumento) y quitar el filtro de mayúsculas de la extracción de `tf`/`df` interna (que usa `\b${tok}\b`, el cual ya funciona igual de bien con identificadores en minúscula):

```bash
./tf_idf_tokens.sh scripts/makeJointCovid.py scripts '^def [a-z_]+' 
```

El resto del script (cálculo de `N`, `tf`, `df`, `idf`, `score`, orden final) no necesita ningún cambio — la generalización que se hizo al parametrizarlo con argumentos es justamente lo que permite reutilizarlo en un dominio distinto (identificadores de código en vez de constantes en mayúsculas) sin tocar la lógica.
