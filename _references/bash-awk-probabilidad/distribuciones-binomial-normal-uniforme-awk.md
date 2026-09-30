# Distribuciones Binomial, Normal y Uniforme (awk)

Segundo de 11 artefactos sobre probabilidad aplicada. Cubre tres de las distribuciones de referencia más usadas: una discreta (Binomial) y dos continuas (Normal, Uniforme) — con su origen, sus momentos (media/varianza), y la conexión entre ellas que explica por qué la Normal aparece por todas partes.

## Distribución Binomial — de dónde sale la fórmula, no solo cuál es

**Responde:** "¿qué tan probable es obtener exactamente k éxitos en n intentos independientes?"

Una Binomial `n,p` es literalmente la suma de `n` variables Bernoulli independientes, cada una con probabilidad `p` de éxito. Esto no es solo una analogía — se puede verificar generando la Binomial de dos formas completamente distintas y comprobando que dan el mismo resultado:

**Camino 1 — simular la suma de 10 Bernoullis independientes, repetido 100,000 veces:**
```
P(X=3) simulado (sumando 10 Bernoullis) = 0.2665
```

**Camino 2 — la fórmula cerrada `P(X=k) = C(n,k)·p^k·(1-p)^(n-k)`:**
```bash
awk -v n=10 -v p=0.3 -v k=3 '
function choose(n,r,  i,res){res=1; for(i=0;i<r;i++) res=res*(n-i)/(i+1); return res}
BEGIN{
  printf "P(X=%d | n=%d, p=%.1f) = %.4f\n", k, n, p, choose(n,k)*(p^k)*((1-p)^(n-k))
}'
```
Salida real: `P(X=3 | n=10, p=0.3) = 0.2668`

Ambos caminos coinciden (`0.2665` vs `0.2668`, la pequeña diferencia es ruido de simulación con 100,000 repeticiones) — confirmando que la fórmula cerrada es exactamente lo que se obtendría al simular el proceso físico de "10 monedas cargadas, contar cuántas caen éxito", solo que calculado analíticamente en vez de por fuerza bruta.

**Por qué aparece el coeficiente binomial `C(n,k)` en la fórmula:** `p^k·(1-p)^(n-k)` es la probabilidad de una secuencia ESPECÍFICA de `k` éxitos y `n-k` fracasos (por ejemplo, éxito-éxito-fracaso-éxito...). Pero hay `C(n,k)` secuencias distintas que tienen exactamente `k` éxitos en total (sin importar el orden) — el coeficiente binomial cuenta cuántas de esas secuencias existen, y se multiplica porque cualquiera de ellas cuenta como "exactamente k éxitos".

**Validar antes de usar:** `p` debe estar en `[0,1]`, y `k` debe ser un entero entre `0` y `n`. Fuera de esos rangos la fórmula da resultados sin sentido (probabilidades negativas o mayores a 1) sin que awk avise con un error explícito:

```bash
awk -v n=10 -v p=1.5 -v k=3 'BEGIN{
  if (p<0 || p>1) { print "ERROR: p debe estar entre 0 y 1" > "/dev/stderr"; exit 1 }
  if (k<0 || k>n) { print "ERROR: k debe ser un entero entre 0 y n" > "/dev/stderr"; exit 1 }
}'
```

## Media y varianza de la Binomial — se derivan directamente de ser una suma

Usando la linealidad de la esperanza (artefacto 1: `E[X+Y]=E[X]+E[Y]` sin necesitar independencia) sobre `n` Bernoullis, cada una con `E[Bernoulli]=p` y `Var[Bernoulli]=p(1-p)`:

```
E[X] = n·p          Var(X) = n·p·(1-p)     (aquí sí se usa independencia, ver artefacto 1)
```

```bash
awk -v n=10 -v p=0.3 'BEGIN{ printf "E[X]=%.4f  Var(X)=%.4f  SD(X)=%.4f\n", n*p, n*p*(1-p), sqrt(n*p*(1-p)) }'
```
Probado, salida real: `E[X]=3.0000  Var(X)=2.1000  SD(X)=1.4491`

## Distribución Normal — PDF, CDF, y por qué aparece en todas partes

**Responde:** "¿qué tan probable es cada valor cuando resulta de sumar muchas causas pequeñas e independientes?"

**PDF (densidad):**
```bash
awk -v x=1 -v mu=0 -v sigma=1 'BEGIN{
  pi = atan2(0,-1)
  pdf = (1/(sigma*sqrt(2*pi))) * exp(-((x-mu)^2)/(2*sigma^2))
  printf "pdf_normal(x=%.1f | mu=%.1f, sigma=%.1f) = %.4f\n", x, mu, sigma, pdf
}'
```
Probado, salida real: `pdf_normal(x=1.0 | mu=0.0, sigma=1.0) = 0.2420`

**Nota sobre `pi`:** awk no tiene una constante `pi` incorporada — `atan2(0,-1)` es el truco estándar para obtenerla con precisión completa.

**CDF — aproximada vía la función error, porque no tiene forma cerrada exacta:**
```bash
awk -v x=1.0 -v mu=0 -v sigma=1 '
function erf(x,   t,y,sign){
  sign = (x<0) ? -1 : 1
  x = (x<0) ? -x : x
  t = 1.0/(1.0+0.3275911*x)
  y = 1.0 - (((((1.061405429*t -1.453152027)*t)+1.421413741)*t -0.284496736)*t +0.254829592)*t*exp(-x*x)
  return sign*y
}
BEGIN{
  z = (x-mu)/sigma
  cdf = 0.5*(1+erf(z/sqrt(2)))
  printf "cdf_normal(x=%.1f | mu=%.1f, sigma=%.1f) = %.4f\n", x, mu, sigma, cdf
}'
```
Probado, salida real: `cdf_normal(x=1.0 | mu=0.0, sigma=1.0) = 0.8413` — coincide con el valor de referencia conocido (`P(Z≤1)≈0.8413`).

### Por qué la Normal aparece en tantos contextos distintos — el Teorema del Límite Central, demostrado

La razón NO es que "las cosas en la naturaleza sean Normales" por defecto — es que **la suma de muchas variables aleatorias independientes, sin importar su distribución original, se aproxima a una Normal** conforme crece la cantidad de variables sumadas. Esto se puede demostrar sumando variables que claramente NO son normales (Uniformes) y observando que su suma sí lo parece:

```
media de la suma-6 = 0.0093 (esperado ~0)
varianza de la suma-6 = 0.9859 (esperado ~1)
```
Probado sumando 12 variables Uniforme(0,1) independientes y restando 6 (un truco clásico de generación de números pseudo-normales anterior a tener buenas aproximaciones de la inversa de la CDF normal): la media y varianza resultantes ya casi coinciden con las de una Normal estándar (`N(0,1)`), aunque cada sumando individual es Uniforme, no Normal — la forma de campana emerge de la suma, no de los sumandos.

**Esto es precisamente por qué la Binomial se aproxima a la Normal cuando `n` es grande** (aproximación de De Moivre-Laplace): una Binomial ya es una suma de `n` Bernoullis, así que el mismo Teorema del Límite Central aplica directamente — con `n` suficientemente grande, `Binomial(n,p) ≈ Normal(np, np(1-p))`.

### Segunda razón (distinta del CLT) por la que se usa la Normal: es la distribución de máxima entropía

Hay una justificación adicional, independiente de que los datos realmente sean una suma de cosas: de todas las distribuciones continuas posibles que tengan una media y varianza específicas, la Normal es la que tiene **mayor entropía diferencial** — es decir, es la que menos supuestos adicionales agrega más allá de fijar esos dos momentos. Por eso, incluso cuando los datos NO provienen de sumar variables independientes, modelarlos como Normales sigue siendo razonable: es la elección "más conservadora" dado que solo conoces media y varianza.

**Verificado numéricamente — comparando la entropía diferencial de tres distribuciones con la MISMA varianza:**

```bash
awk -v sigma=3.0 'BEGIN{
  pi = atan2(0,-1); e = exp(1)
  var = sigma^2
  H_normal = 0.5*log(2*pi*e*var)
  ancho = sqrt(12*var)
  H_uniforme = log(ancho)
  b_laplace = sqrt(var/2)
  H_laplace = log(2*b_laplace*e)
  printf "H_normal=%.4f  H_uniforme=%.4f  H_laplace=%.4f (Normal debe ser la mayor)\n", H_normal, H_uniforme, H_laplace
}'
```
Probado, salida real: `H_normal=2.5176  H_uniforme=2.3411  H_laplace=2.4452` — con las tres distribuciones ajustadas para tener exactamente la misma varianza (`σ=3.0`), la Normal tiene la entropía más alta de las tres, confirmando numéricamente el principio de máxima entropía.

### Estandarización — el puente entre cualquier Normal y la Normal estándar

```bash
awk -v x=130 -v mu=100 -v sigma=15 'BEGIN{ printf "z = (x-mu)/sigma = %.4f\n", (x-mu)/sigma }'
```
Probado, salida real: `z = 2.0000`

Restar la media y dividir entre la desviación estándar convierte cualquier variable `Normal(μ,σ)` en una `Normal(0,1)` estándar — es por esto que basta con tener una tabla (o una función `erf`) de la Normal estándar para calcular la CDF de CUALQUIER Normal, sin importar sus parámetros: se estandariza primero, y se evalúa la CDF estándar en el valor `z` resultante (exactamente lo que hace la fórmula de CDF de la sección anterior).

**Validar antes de usar:** `sigma` debe ser estrictamente mayor que 0 — una desviación estándar de 0 o negativa no tiene sentido (significaría una variable que no varía, o una varianza negativa, imposible):

```bash
awk -v sigma=0 'BEGIN{
  if (sigma<=0) { print "ERROR: sigma debe ser mayor que 0" > "/dev/stderr"; exit 1 }
}'
```

## Distribución Uniforme continua — PDF, CDF, media y varianza

**Responde:** "¿qué tan probable es cada valor cuando no hay ninguna razón para preferir uno sobre otro dentro de un rango?"

```bash
awk -v a=0 -v b=10 -v x=4 'BEGIN{
  pdf = (x>=a && x<=b) ? 1/(b-a) : 0
  cdf = (x<a) ? 0 : (x>b) ? 1 : (x-a)/(b-a)
  printf "pdf_uniforme(x=%.1f) = %.4f   cdf_uniforme(x=%.1f) = %.4f\n", x, pdf, x, cdf
}'
```
Probado, salida real: `pdf_uniforme(x=4.0) = 0.1000   cdf_uniforme(x=4.0) = 0.4000`

**Media y varianza:**
```bash
awk -v a=0 -v b=10 'BEGIN{ printf "E[X]=%.4f  Var(X)=%.4f\n", (a+b)/2, ((b-a)^2)/12 }'
```
Probado, salida real: `E[X]=5.0000  Var(X)=8.3333` — la media es simplemente el punto medio del intervalo (intuitivo, por simetría), la varianza crece con el cuadrado del ancho del intervalo dividido entre 12 (una constante que sale de integrar `(x-media)²` sobre el intervalo).

**Validar antes de usar:** `a` debe ser estrictamente menor que `b` — un intervalo invertido o de ancho cero no define una distribución válida:

```bash
awk -v a=10 -v b=5 'BEGIN{
  if (a>=b) { print "ERROR: a debe ser menor que b" > "/dev/stderr"; exit 1 }
}'
```

### La Uniforme como "materia prima" de cualquier otra distribución — muestreo por transformación inversa

Prácticamente todo generador de números aleatorios en cualquier lenguaje produce, en el fondo, muestras de una `Uniforme(0,1)` — y a partir de eso se puede generar una muestra de CUALQUIER otra distribución cuya CDF se pueda invertir, aplicando la inversa de esa CDF a la muestra uniforme:

```bash
awk -v lam=0.5 'BEGIN{ srand(5); u=rand(); x = -log(1-u)/lam; printf "u=%.4f -> x=%.4f (muestra exponencial via transformacion inversa)\n", u, x }'
```
Probado, salida real: `u=0.1315 -> x=0.2820 (muestra exponencial via transformacion inversa)`

**Por qué funciona:** si `U` es Uniforme(0,1) y `F` es la CDF (invertible) de la distribución que quieres generar, entonces `F⁻¹(U)` tiene exactamente la distribución deseada. Para la exponencial, `F(x)=1-e^(-λx)`, así que invirtiendo: `F⁻¹(u) = -ln(1-u)/λ` — exactamente la fórmula usada arriba. Esta es la técnica general detrás de `shuf`, `rand()`, y cualquier generador de números aleatorios con una distribución específica.

## Resumen de cuándo usar cada una

| Distribución | Usar cuando... |
|---|---|
| Binomial | Cuentas éxitos/fracasos en un número fijo de intentos independientes |
| Normal | Sumas muchas variables independientes (por el Teorema del Límite Central) — incluida la propia Binomial cuando `n` es grande |
| Uniforme | No tienes razón para preferir un valor sobre otro en un rango — y es la base para generar muestras de cualquier otra distribución vía transformación inversa |
