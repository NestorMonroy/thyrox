# Estimación por máxima verosimilitud (MLE) y regresión lineal simple (awk)

Cuarto de 11 artefactos sobre probabilidad aplicada. MLE responde "¿cuál es el parámetro que mejor explica los datos que observé?"; regresión lineal responde "¿qué recta describe mejor la relación entre dos variables?" — ambas son formas de ajustar un modelo a datos observados, y ambas comparten una idea central: no basta con el estimador puntual, también hay que saber qué tan confiable es.

## Qué es una función de verosimilitud, antes de derivar nada

Dado un conjunto de datos observados y un modelo con un parámetro desconocido `θ` (por ejemplo, la `p` de una Bernoulli), la **función de verosimilitud** `L(θ)` es la probabilidad de haber observado exactamente esos datos, vista como función de `θ` (no como función de los datos — los datos ya están fijos, lo que varía es el parámetro que estamos probando).

`L(θ) = P(datos | θ)`

**Máxima verosimilitud** significa: de todos los valores posibles de `θ`, elegir el que hace más probable haber observado los datos que realmente observaste. En la práctica casi siempre se trabaja con el **logaritmo** de la verosimilitud (`log L(θ)`), porque el logaritmo convierte productos en sumas (mucho más fácil de derivar) y, al ser una función monótona creciente, el `θ` que maximiza `L(θ)` es el mismo que maximiza `log L(θ)`.

## Derivación completa: MLE de una Bernoulli, paso a paso

Con `n` ensayos independientes y `s` éxitos observados, la verosimilitud de ver esa secuencia exacta de éxitos/fracasos, dado un valor de `p`, es:

```
L(p) = p^s · (1-p)^(n-s)
```

**Paso 1 — tomar logaritmo:**
```
log L(p) = s·log(p) + (n-s)·log(1-p)
```

**Paso 2 — derivar respecto a `p` e igualar a cero** (condición de máximo):
```
d/dp [log L(p)] = s/p - (n-s)/(1-p) = 0
```

**Paso 3 — despejar `p`:**
```
s/p = (n-s)/(1-p)
s(1-p) = p(n-s)
s - sp = pn - ps
s = pn
p = s/n
```

El resultado — la proporción muestral — no es una heurística conveniente, es la solución algebraica exacta de maximizar la log-verosimilitud.

**Verificación numérica independiente (optimización, sin usar la fórmula cerrada):**
```
p_MLE numerico (optimizacion) = 0.7
p_MLE analitico (s/n) = 0.7
```
Probado con `scipy.optimize.minimize_scalar` maximizando `log L(p)` directamente sobre 10 ensayos con 7 éxitos — coincide exactamente con `s/n = 0.7`, confirmando que la derivación algebraica y la búsqueda numérica del máximo llegan al mismo lugar.

```bash
printf "1\n0\n1\n1\n0\n1\n1\n1\n0\n1\n" | awk '{s+=$1; n++} END{printf "p_MLE = %.4f (sobre %d ensayos)\n", s/n, n}'
```
Salida real: `p_MLE = 0.7000 (sobre 10 ensayos)`

**Validar antes de usar:** cada dato debe ser exactamente `0` o `1` (no cualquier número), y debe haber al menos un ensayo:
```bash
awk '{
  if ($1!=0 && $1!=1) { print "ERROR: los datos de Bernoulli deben ser 0 o 1" > "/dev/stderr"; exit 1 }
  s+=$1; n++
} END{ if(n==0){print "ERROR: no hay datos" > "/dev/stderr"; exit 1} printf "p_MLE = %.4f\n", s/n }'
```

## Qué tan confiable es el estimador — error estándar vía información de Fisher

Un punto estimado sin su margen de error es información incompleta. La **información de Fisher** `I(θ)` mide qué tan "puntiaguda" es la log-verosimilitud alrededor de su máximo — mientras más puntiaguda, más información aportan los datos sobre `θ`, y menor es la varianza del estimador. Para Bernoulli:

```
I(p) = n / (p(1-p))         Var(p̂) ≈ 1/I(p) = p(1-p)/n         SE(p̂) = √(p(1-p)/n)
```

```bash
awk -v p=0.7 -v n=10 'BEGIN{ printf "SE(p_MLE) = %.4f\n", sqrt(p*(1-p)/n) }'
```
Probado, salida real: `SE(p_MLE) = 0.1449`

**Cómo interpretarlo:** el estimador es `p̂=0.70`, con un error estándar de `≈0.14` — es decir, con muestras repetidas del mismo tamaño, esperarías que `p̂` variara típicamente en ese orden de magnitud alrededor del valor real. Con solo 10 ensayos el error estándar es relativamente grande; crece la precisión (baja el error estándar) en proporción a `1/√n` a medida que `n` aumenta — el patrón típico de cualquier estimador de máxima verosimilitud.

## MLE de Poisson — misma lógica, resultado ya usado en artefactos anteriores

```
L(λ) = Π [e^(-λ)·λ^xi / xi!]     log L(λ) = -nλ + (Σxi)·log(λ) - Σlog(xi!)
d/dλ = -n + (Σxi)/λ = 0     →     λ = Σxi/n
```

```bash
printf "4\n2\n5\n3\n6\n1\n5\n" | awk '{s+=$1; n++} END{printf "lambda_MLE = %.4f\n", s/n}'
```
Salida real: `lambda_MLE = 3.7143`

**Información de Fisher e intervalo:** `I(λ) = n/λ`, por lo que `SE(λ̂) = √(λ̂/n)`.

**Validar antes de usar:** los conteos deben ser enteros no negativos, y debe haber al menos un dato con suma mayor que 0 (si todos los conteos son 0, `lambda_MLE=0` es técnicamente válido pero deja `SE` en 0 también, lo cual puede ser engañoso con muestras muy pequeñas):
```bash
awk '{
  if ($1<0) { print "ERROR: los conteos deben ser no negativos" > "/dev/stderr"; exit 1 }
  s+=$1; n++
} END{ if(n==0){print "ERROR: no hay datos" > "/dev/stderr"; exit 1} printf "lambda_MLE = %.4f\n", s/n }'
```

## MLE de la distribución exponencial — pieza que faltaba en la versión anterior

```
L(λ) = λ^n · exp(-λ·Σxi)     log L(λ) = n·log(λ) - λ·Σxi
d/dλ = n/λ - Σxi = 0     →     λ = n/Σxi = 1/media
```

```bash
printf "2\n3\n1\n4\n2\n" | awk '{s+=$1;n++} END{printf "lambda_MLE = %.4f\n", n/s}'
```
Probado, salida real: `lambda_MLE = 0.4167` (el inverso de la media muestral, `1/2.4`)

**Error estándar — `I(λ) = n/λ²`, por lo que `SE(λ̂) = λ̂/√n`:**

```bash
awk -v lam=0.4167 -v n=5 'BEGIN{ printf "SE(lambda_MLE) = %.4f\n", lam/sqrt(n) }'
```
Probado, salida real: `SE(lambda_MLE) = 0.1864`

**Validar antes de usar:** los tiempos/valores deben ser estrictamente positivos (un tiempo de espera de 0 o negativo no tiene sentido para una exponencial), y la suma debe ser mayor que 0 antes de dividir:
```bash
awk '{
  if ($1<=0) { print "ERROR: los valores deben ser estrictamente positivos" > "/dev/stderr"; exit 1 }
  s+=$1; n++
} END{ if(n==0){print "ERROR: no hay datos" > "/dev/stderr"; exit 1} printf "lambda_MLE = %.4f\n", n/s }'
```

## MLE de una Normal — `mu` y `sigma²`

```bash
printf "10\n12\n9\n11\n13\n8\n" | awk '{x[NR]=$1; s+=$1; n++} END{
  mu = s/n
  for(i=1;i<=n;i++) ss += (x[i]-mu)^2
  sigma2 = ss/n
  printf "mu_MLE = %.4f   sigma2_MLE = %.4f\n", mu, sigma2
}'
```
Probado, salida real: `mu_MLE = 10.5000   sigma2_MLE = 2.9167`

**Nota técnica — MLE vs el estimador insesgado habitual:** el MLE de la varianza divide entre `n`, no entre `n-1` (la corrección de Bessel para varianza muestral insesgada). Ambos son válidos; difieren en la propiedad estadística que priorizan (máxima verosimilitud vs insesgadez), no en cuál es "más correcto" en términos absolutos.

```bash
# Varianza muestral insesgada (divide entre n-1)
awk '{x[NR]=$1; s+=$1; n++} END{
  mu=s/n
  for(i=1;i<=n;i++) ss+=(x[i]-mu)^2
  printf "varianza insesgada = %.4f\n", ss/(n-1)
}'
```

**Validar antes de usar:** se necesitan al menos 2 datos para que la varianza insesgada tenga sentido (dividir entre `n-1` con `n=1` es una división por cero):
```bash
awk '{x[NR]=$1; s+=$1; n++} END{
  if (n<2) { print "ERROR: se necesitan al menos 2 datos para la varianza insesgada" > "/dev/stderr"; exit 1 }
  mu=s/n
  for(i=1;i<=n;i++) ss+=(x[i]-mu)^2
  printf "varianza insesgada = %.4f\n", ss/(n-1)
}'
```

## Regresión lineal simple — ajustar `y = a + b·x`

**Fuente verificada:** el modelo, la fórmula y la derivación de esta sección están confirmados contra una prueba formal real — *StatProofBook* (Joram Soch, BCCN Berlín, definición `D163` y prueba `P271`, que a su vez cita a Penny, *"Mathematics for Brain Imaging"*, y Wikipedia). El modelo que define esa fuente es `y=β₀+β₁x+ε` con `ε~N(0,σ²)` — exactamente el modelo "Linear Transform Plus Noise" del artefacto dedicado a esa derivación, generalizado aquí con un intercepto `β₀` (`a` en nuestra notación) además de la pendiente `β₁` (`b`).

```bash
awk '
BEGIN {
  n = 6
  split("1 2 3 4 5 6", x, " ")
  split("2 4 5 4 5 7", y, " ")
  for (i=1; i<=n; i++) { sx+=x[i]; sy+=y[i]; sxy+=x[i]*y[i]; sx2+=x[i]*x[i] }
  mx = sx/n; my = sy/n
  b = (n*sxy - sx*sy)/(n*sx2 - sx*sx)
  a = (sy - b*sx)/n
  for (i=1; i<=n; i++) {
    yhat = a + b*x[i]
    ssres += (y[i]-yhat)^2
    sstot += (y[i]-my)^2
  }
  r2 = 1 - ssres/sstot
  printf "y = %.4f + %.4fx   R^2 = %.4f\n", a, b, r2
}'
```
Probado, salida real: `y = 1.8000 + 0.7714x   R^2 = 0.7714`

### Completando la derivación — de dónde salen exactamente `a` y `b` (las ecuaciones normales)

La sección anterior dio la fórmula ya resuelta; aquí se completa el paso que se había saltado: derivar el error cuadrático respecto a AMBOS parámetros a la vez, no solo uno.

**Paso 1 — plantear la suma de errores al cuadrado como función de los dos parámetros:**
```
RSS(a,b) = Σ(yᵢ - a - b·xᵢ)²
```

**Paso 2 — derivar respecto a cada parámetro por separado:**
```
dRSS/da = -2·Σ(yᵢ - a - b·xᵢ)
dRSS/db = -2·Σxᵢ(yᵢ - a - b·xᵢ)
```

**Paso 3 — igualar ambas derivadas a cero (condición de mínimo conjunto):**
```
Σyᵢ = b·Σxᵢ + a·n                    (ecuación normal 1)
Σxᵢyᵢ = b·Σxᵢ² + a·Σxᵢ                (ecuación normal 2)
```

**Verificación numérica — confirmar que `a` y `b` ya calculados SÍ satisfacen ambas ecuaciones normales:**
```bash
awk '
BEGIN{
  n=6
  split("1 2 3 4 5 6", x, " ")
  split("2 4 5 4 5 7", y, " ")
  for(i=1;i<=n;i++){sx+=x[i]; sy+=y[i]; sxy+=x[i]*y[i]; sx2+=x[i]*x[i]}
  b = (n*sxy - sx*sy)/(n*sx2 - sx*sx)
  a = (sy - b*sx)/n
  eq1_izq = b*sx + a*n
  eq2_izq = b*sx2 + a*sx
  printf "Ecuacion normal 1: %.4f (izq) = %.4f (sum y)\n", eq1_izq, sy
  printf "Ecuacion normal 2: %.4f (izq) = %.4f (sum xy)\n", eq2_izq, sxy
}'
```
Probado, salida real:
```
Ecuacion normal 1: 27.0000 (izq) = 27.0000 (sum y)
Ecuacion normal 2: 108.0000 (izq) = 108.0000 (sum xy)
```
Ambas coinciden exactamente — confirmando que `a` y `b` no son una fórmula "que funciona por casualidad", sino la solución exacta del sistema de dos ecuaciones que resulta de minimizar el error conjuntamente.

**Paso 4 — despejar `a` de la ecuación normal 1:**
```
a = ȳ - b·x̄
```
(exactamente la fórmula que ya veníamos usando: `a = (Σy - b·Σx)/n`)

**Paso 5 — sustituir esa `a` en la ecuación normal 2 y despejar `b`:** al hacerlo, se llega a una fracción con `Σxᵢyᵢ - ȳ·Σxᵢ` en el numerador y `Σxᵢ² - x̄·Σxᵢ` en el denominador — que es exactamente la forma "computacional" que usamos desde el principio (`n·Σxy - Σx·Σy` sobre `n·Σx² - (Σx)²`, la misma fracción multiplicada por `n` arriba y abajo).

**Paso 6 — reescribir esa fracción en términos de desviaciones respecto a la media (forma más intuitiva), y verificar que ambas formas dan el mismo número:**

```bash
# Numerador: ¿son iguales las dos formas de escribirlo?
awk '
BEGIN{
  n=6
  split("1 2 3 4 5 6", x, " ")
  split("2 4 5 4 5 7", y, " ")
  for(i=1;i<=n;i++){sx+=x[i]; sy+=y[i]; sxy+=x[i]*y[i]}
  mx=sx/n; my=sy/n
  forma1 = sxy - my*sx
  forma2 = 0
  for(i=1;i<=n;i++) forma2 += (x[i]-mx)*(y[i]-my)
  printf "forma computacional (sum(xy)-ybar*sum(x)) = %.4f\n", forma1
  printf "forma por desviaciones (sum((x-xbar)(y-ybar)))  = %.4f\n", forma2
}'
```
Probado, salida real: `forma computacional = 13.5000` y `forma por desviaciones = 13.5000` — idénticas.

```bash
# Denominador: misma verificacion
awk '
BEGIN{
  n=6
  split("1 2 3 4 5 6", x, " ")
  for(i=1;i<=n;i++){sx+=x[i]; sx2+=x[i]*x[i]}
  mx=sx/n
  forma1 = sx2 - mx*sx
  forma2 = 0
  for(i=1;i<=n;i++) forma2 += (x[i]-mx)^2
  printf "forma computacional (sum(x^2)-xbar*sum(x)) = %.4f\n", forma1
  printf "forma por desviaciones (sum((x-xbar)^2))       = %.4f\n", forma2
}'
```
Probado, salida real: `forma computacional = 17.5000` y `forma por desviaciones = 17.5000` — idénticas.

**Conclusión de la derivación completa:**
```
b = Σ(xᵢ-x̄)(yᵢ-ȳ) / Σ(xᵢ-x̄)²      (la misma fórmula del coeficiente de correlación, sin normalizar por las desviaciones estándar — de ahí la relación `r²=R²` del artefacto de correlación)
a = ȳ - b·x̄
```
Ambas formas (computacional y por desviaciones) son algebraicamente idénticas — la computacional es más rápida de calcular en una sola pasada sobre los datos (no necesita calcular las medias primero); la de desviaciones es más intuitiva para entender qué mide realmente `b` (covarianza entre `x` e `y`, dividida entre la varianza de `x`).

## Los cuatro supuestos que la regresión lineal asume — y que rara vez se verifican

Ajustar una recta es trivial; que esa recta sea una descripción *válida* de los datos depende de cuatro supuestos que la fórmula NO verifica por sí sola:

| Supuesto | Qué significa | Cómo se rompe en la práctica |
|---|---|---|
| Linealidad | La relación real entre `x` e `y` es (aproximadamente) una línea recta | Si la relación real es curva (ej. cuadrática), la recta ajustada será sistemáticamente mala en los extremos |
| Homocedasticidad | La dispersión de los residuos es constante a lo largo de todo el rango de `x` | Si la dispersión crece con `x` (heterocedasticidad), el error estándar de `b` calculado aquí subestima la incertidumbre real |
| Independencia | Los residuos no están correlacionados entre sí | Común en series de tiempo, donde el residuo de un punto predice el siguiente |
| Normalidad de los residuos | Los residuos siguen (aproximadamente) una distribución Normal | Necesario para que la prueba de hipótesis sobre `b` (más abajo) sea válida con muestras pequeñas |

**Inspección rápida de residuos — el primer chequeo, antes de cualquier prueba formal:**

```bash
awk '
BEGIN {
  n=6
  split("1 2 3 4 5 6", x, " ")
  split("2 4 5 4 5 7", y, " ")
  for(i=1;i<=n;i++){sx+=x[i]; sy+=y[i]; sxy+=x[i]*y[i]; sx2+=x[i]*x[i]}
  b = (n*sxy - sx*sy)/(n*sx2 - sx*sx)
  a = (sy - b*sx)/n
  print "residuos:"
  for(i=1;i<=n;i++) printf "  x=%d y=%d yhat=%.4f resid=%.4f\n", x[i], y[i], a+b*x[i], y[i]-(a+b*x[i])
}'
```
Probado, salida real:
```
residuos:
  x=1 y=2 yhat=2.5714 resid=-0.5714
  x=2 y=4 yhat=3.3429 resid=0.6571
  x=3 y=5 yhat=4.1143 resid=0.8857
  x=4 y=4 yhat=4.8857 resid=-0.8857
  x=5 y=5 yhat=5.6571 resid=-0.6571
  x=6 y=7 yhat=6.4286 resid=0.5714
```

**Qué buscar a simple vista en esta tabla:** si los residuos alternan de signo sin patrón aparente (como aquí) y no crecen en magnitud conforme `x` aumenta, es una señal razonable (no una prueba formal) de que linealidad y homocedasticidad son supuestos razonables para estos datos. Un patrón sistemático (todos positivos al inicio, todos negativos al final, o creciendo en magnitud) señalaría que alguno de los supuestos falla.

## Error estándar del coeficiente `b`, y si es significativamente distinto de cero

```bash
awk '
BEGIN{
  n=6
  split("1 2 3 4 5 6", x, " ")
  split("2 4 5 4 5 7", y, " ")
  for(i=1;i<=n;i++){sx+=x[i]; sy+=y[i]; sxy+=x[i]*y[i]; sx2+=x[i]*x[i]}
  mx=sx/n; my=sy/n
  b = (n*sxy - sx*sy)/(n*sx2 - sx*sx)
  a = (sy - b*sx)/n
  for(i=1;i<=n;i++){
    yhat = a + b*x[i]
    ssres += (y[i]-yhat)^2
    sxx += (x[i]-mx)^2
  }
  gl = n-2
  mse = ssres/gl
  se_b = sqrt(mse/sxx)
  t_stat = b/se_b
  printf "b=%.4f  SE(b)=%.4f  t=%.4f  (grados de libertad=%d)\n", b, se_b, t_stat, gl
}'
```
Probado, salida real: `b=0.7714  SE(b)=0.2100  t=3.6742  (grados de libertad=4)`

**Cómo interpretar el estadístico `t`:** compara `t=3.6742` contra el valor crítico de una distribución t con 4 grados de libertad al nivel de significancia deseado (para `α=0.05` a dos colas con 4 g.l., el valor crítico de referencia es `≈2.776`). Como `|t|=3.67 > 2.776`, se rechaza la hipótesis nula de que `b=0` — hay evidencia de que existe una relación lineal real entre `x` e `y`, no solo ruido aleatorio que por casualidad produjo una pendiente distinta de cero.

**Por qué `gl = n-2` y no `n-1`:** se pierden 2 grados de libertad porque se estimaron 2 parámetros de los datos (`a` y `b`) antes de calcular los residuos — la misma lógica por la que la varianza insesgada divide entre `n-1` (un parámetro estimado, la media) en vez de `n`.

## Usar la recta ajustada para predecir, y la advertencia de extrapolar

```bash
awk -v a=1.8000 -v b=0.7714 -v xnuevo=10 'BEGIN{printf "prediccion en x=%d: y=%.4f\n", xnuevo, a+b*xnuevo}'
```

**Advertencia sobre extrapolar fuera del rango de los datos:** la fórmula no sabe que `x=10` está fuera del rango `[1,6]` usado para ajustarla — awk calcula una predicción igual de "confiada" que para un `x` dentro del rango observado, aunque la confiabilidad real de esa extrapolación sea mucho menor, y los supuestos de linealidad/homocedasticidad verificados dentro del rango observado no tienen por qué seguir cumpliéndose fuera de él.

## Aplicación directa a nuestro análisis de tokens/corpus

MLE de Poisson es exactamente lo que ya usábamos para `lambda` — ahora con su error estándar, se puede reportar no solo "la tasa promedio es 3.7" sino "3.7 ± 0.7 (aprox.)", una diferencia importante al comparar tasas entre distintos subconjuntos del corpus. Regresión lineal aplicada entre "longitud del archivo" y "número de tokens distintos ALL-CAPS" — con la prueba `t` del coeficiente `b` puedes afirmar con evidencia estadística (no solo visualmente) si esa relación es real o si el patrón observado podría deberse al azar dado el tamaño de muestra disponible.

## Resumen: cuándo usar cada una

| Necesitas... | Herramienta |
|---|---|
| Estimar el parámetro de una distribución conocida a partir de datos observados | MLE |
| Saber qué tan confiable es esa estimación puntual | Error estándar vía información de Fisher |
| Predecir una variable numérica a partir de otra, con relación aproximadamente lineal | Regresión lineal |
| Saber qué tan bien esa relación lineal explica los datos | `R²` de la regresión |
| Saber si la relación lineal encontrada es estadísticamente real o podría ser ruido | Estadístico `t` sobre el coeficiente `b` |
| Verificar que el modelo lineal es apropiado antes de confiar en él | Inspección de residuos contra los 4 supuestos |
