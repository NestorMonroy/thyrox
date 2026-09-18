# Aplicando conceptos de probabilidad (del temario del libro) a nuestro análisis de texto

El repositorio clonado organiza su contenido por temas — la estructura de carpetas bajo `chapters/` funciona como un índice de qué conceptos de probabilidad cubre el libro (combinatoria, teorema de Bayes, distribución de Poisson, teoría de la información, Bayes ingenuo/Naive Bayes, entre otros). Este archivo no reproduce el contenido explicativo del libro — toma **fórmulas matemáticas estándar de dominio público** (las mismas que encontrarías en cualquier texto de probabilidad) correspondientes a esos temas, las implementa en `awk`/bash, y las aplica a los datos reales que ya extrajimos del repo (la distribución de nombres de función en `scripts/*.py`), para enriquecer el análisis de frecuencia de los artefactos anteriores con herramientas estadísticas más allá de TF-IDF.

## Temas del libro con aplicación directa a análisis de texto/corpus

| Carpeta del libro (tema) | Qué mide | Cómo se aplica a nuestro análisis de tokens |
|---|---|---|
| `part1/combinatorics` | Conteo de combinaciones (coeficiente binomial) | Contar combinaciones posibles de tokens co-ocurrentes |
| `part1/bayes_theorem` | `P(A\|B) = P(B\|A)·P(A) / P(B)` | Inferir de qué archivo probablemente proviene un fragmento, dado qué tokens contiene |
| `part2/poisson` | Probabilidad de observar *k* eventos raros dado una tasa promedio | Decidir si la frecuencia de un token en un archivo es "sorprendente" o es lo esperado por azar |
| `part4/information_theory` | Entropía de Shannon | Medir qué tan "concentrada" o "dispersa" está la aparición de un token en el corpus |
| `part5/naive_bayes` | Combinar varias probabilidades condicionalmente independientes | Clasificar a qué archivo pertenece un fragmento usando varios tokens a la vez, no uno solo |

## 1. Coeficiente binomial (`choose`) en awk — combinatoria de tokens

Fórmula estándar: `C(n,r) = n! / (r!·(n-r)!)`, calculada de forma numéricamente estable sin factoriales grandes:

```bash
awk 'function choose(n,r,  i,res){
  res=1
  for(i=0;i<r;i++) res=res*(n-i)/(i+1)
  return res
}
BEGIN{printf "%.0f\n", choose(7,2)}'
```

Salida real: `21` — el número de pares posibles entre las 7 funciones distintas que encontramos en `scripts/*.py` (`main`, `simulate_one`, `print_normalized`, `calc_points`, `joint`, `joint_d0`, `joint_d1`). Útil si quisieras, por ejemplo, analizar todos los pares de tokens que co-ocurren en un mismo archivo sin repetir combinaciones.

## 2. Entropía de Shannon — qué tan dispersa está una función en el corpus

Fórmula estándar: `H = -Σ p_i · log2(p_i)`, donde `p_i` es la proporción de apariciones de cada función sobre el total.

Con los datos reales ya extraídos (`main`:6, `simulate_one`:3, `print_normalized`:3, `calc_points`:3, `joint`:1, `joint_d0`:1, `joint_d1`:1 — sobre 18 apariciones totales):

```bash
awk '
BEGIN {
  split("6 3 3 3 1 1 1", counts, " ")
  total = 0
  for (i in counts) total += counts[i]
  H = 0
  for (i in counts) {
    p = counts[i] / total
    H -= p * log(p) / log(2)
  }
  printf "Entropia H = %.4f bits (maximo posible con %d funciones = %.4f bits)\n", H, length(counts), log(length(counts))/log(2)
}'
```

Salida real:

```
Entropia H = 2.5158 bits (maximo posible con 7 funciones = 2.8074 bits)
```

**Interpretación:** el máximo de entropía (2.8074 bits) ocurriría si las 7 funciones aparecieran con igual frecuencia. El valor real (2.5158) está cerca del máximo pero no en él — reflejando que `main` está sobrerrepresentada (aparece en 6 de 6 archivos, como ya vimos con IDF=0), lo cual reduce la entropía de la distribución. Esto es una segunda forma, complementaria a IDF, de decir lo mismo: una distribución muy desigual (dominada por un token que está en todos lados) tiene menos entropía que una repartida uniformemente entre tokens distintivos.

## 3. Distribución de Poisson — ¿es "raro" que un archivo tenga solo 1 función?

Fórmula estándar: `P(X=k) = e^(-λ)·λ^k / k!`, donde `λ` es la tasa promedio de eventos (aquí, funciones por archivo).

Contando funciones por archivo real: 4, 4, 4, 1, 4, 1 → promedio `λ = 3.0` funciones/archivo sobre 6 archivos.

```bash
awk -v lam=3.0 '
function factorial(n,  i,res){res=1; for(i=2;i<=n;i++) res*=i; return res}
function poisson(k,lam){return exp(-lam)*(lam^k)/factorial(k)}
BEGIN {
  printf "P(X=1 | lambda=3) = %.4f\n", poisson(1,lam)
  printf "P(X=4 | lambda=3) = %.4f\n", poisson(4,lam)
}'
```

Salida real:

```
P(X=1 | lambda=3) = 0.1494
P(X=4 | lambda=3) = 0.1680
```

**Interpretación:** con una tasa promedio de 3 funciones por archivo, tanto encontrar un archivo con 1 función (probabilidad ~15%) como uno con 4 (probabilidad ~17%) son resultados razonablemente comunes bajo un modelo de Poisson — ninguno de los dos es estadísticamente "sorprendente" por sí solo. Este mismo cálculo, aplicado a la aparición de un token en un archivo (en vez de funciones), es una forma de decidir si la frecuencia observada de un token discriminante (de los artefactos de TF-IDF anteriores) es estadísticamente significativa o cae dentro de lo esperable por azar.

## 4. Teorema de Bayes — inferir el archivo de origen a partir de un token

Fórmula estándar: `P(archivo | token) = P(token | archivo) · P(archivo) / P(token)`.

Aplicado a nuestros datos: si ves el token `joint_d0` en un fragmento de código sin saber de qué archivo viene, ¿cuál es la probabilidad de que venga de `makeJointCovid.py`?

```bash
awk '
BEGIN {
  p_token_dado_archivo = 1.0     # joint_d0 aparece en el 100% de las apariciones que provienen de makeJointCovid.py
  p_archivo = 1.0/6               # 1 de 6 archivos en el corpus
  p_token = 1.0/18                 # joint_d0 aparece 1 vez de 18 apariciones totales de funciones
  p_archivo_dado_token = (p_token_dado_archivo * p_archivo) / p_token
  printf "P(makeJointCovid.py | token=joint_d0) = %.4f\n", p_archivo_dado_token
}'
```

Salida real: `P(makeJointCovid.py | token=joint_d0) = 1.0000` — con estos datos (el token solo aparece en ese archivo), la posterior es 100%, lo cual es consistente con lo que ya sabíamos por IDF (df=1) y por entropía: es un token totalmente distintivo de ese único archivo.

## 5. Extender a Naive Bayes — combinar varios tokens, no solo uno

La idea de `part5/naive_bayes` es que, si tienes **varios** tokens observados en un fragmento (no solo uno), asumes independencia condicional entre ellos y multiplicas sus verosimilitudes:

```
P(archivo | token1, token2, ...) ∝ P(archivo) · P(token1|archivo) · P(token2|archivo) · ...
```

En bash, esto se traduce en acumular un producto (o, para evitar underflow numérico con muchos tokens, una suma de logaritmos — el mismo truco de `part1/log_probabilities`):

```bash
awk '
BEGIN {
  # log(P(archivo)) + suma de log(P(token_i | archivo)) para cada candidato a archivo
  log_prior = log(1.0/6)
  log_lik_calc_points = log(1.0/3)     # calc_points aparece en 3 de 6 archivos "bridge"
  log_lik_simulate_one = log(1.0/3)
  score = log_prior + log_lik_calc_points + log_lik_simulate_one
  printf "log-score para archivos tipo bridge, dados ambos tokens = %.4f\n", score
}'
```

**Por qué sumar logaritmos en vez de multiplicar probabilidades directamente:** con decenas de tokens, el producto de probabilidades pequeñas puede volverse un número tan diminuto que se pierde por *underflow* de punto flotante; sumar sus logaritmos evita ese problema y es la técnica estándar en clasificadores Naive Bayes reales (incluidos los de librerías como `scikit-learn`).

## Resumen: qué añade cada concepto sobre lo que ya teníamos (TF-IDF)

| Técnica | Pregunta que responde | Ya la teníamos |
|---|---|---|
| TF-IDF (artefactos anteriores) | ¿Qué tan raro es este token en el corpus? | Sí |
| Entropía de Shannon | ¿Qué tan pareja o desigual es la distribución completa de un token/función? | No — nueva en este archivo |
| Poisson | ¿Es esta frecuencia observada estadísticamente sorprendente, o es lo esperado por azar? | No — nueva en este archivo |
| Bayes / Naive Bayes | Dado un token (o varios), ¿de qué archivo probablemente proviene? | No — nueva en este archivo |
| Combinatoria (`choose`) | ¿Cuántas combinaciones de tokens co-ocurrentes existen? | No — nueva en este archivo |

Estas cuatro técnicas nuevas no reemplazan el TF-IDF de los artefactos anteriores — lo complementan: TF-IDF te dice qué tan raro es un token, mientras que Poisson te dice si esa rareza es estadísticamente significativa, la entropía te dice qué tan concentrada está su aparición, y Bayes/Naive Bayes te permite ir un paso más allá y clasificar de dónde viene un fragmento de texto usando esa evidencia.
