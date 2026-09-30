# Distribución hipergeométrica y muestreo sin remplazo (awk)

Décimo de 11 artefactos sobre probabilidad aplicada. La diferencia clave frente a la Binomial: aquí se muestrea SIN remplazo de una población finita, así que la probabilidad de éxito cambia ligeramente en cada extracción.

## Cómo reconocer un experimento hipergeométrico

Un experimento sigue una distribución hipergeométrica cuando se cumplen estas cinco condiciones a la vez:

1. Hay dos grupos distintos de donde se muestrea.
2. Uno de los dos grupos es el "de interés" (el que se cuenta en el resultado).
3. El muestreo es SIN remplazo, de los dos grupos combinados.
4. Cada extracción NO es independiente de las anteriores (la composición restante cambia).
5. No son ensayos de Bernoulli — la probabilidad de éxito no permanece constante extracción a extracción.

Si falta cualquiera de estas condiciones (por ejemplo, si hay remplazo, o si las extracciones sí son independientes), el modelo correcto es otro — típicamente la Binomial.

## PMF hipergeométrica — `P(X=k) = C(K,k)·C(N-K,n-k) / C(N,n)`

**Responde:** "de una población finita con un número conocido de elementos de interés, si tomo una muestra sin reponer lo extraído, ¿qué tan probable es que la muestra contenga exactamente k de esos elementos?"

**Notación alternativa común:** algunos textos escriben `X~H(r,b,n)`, donde `r` es el tamaño del grupo de interés, `b` el tamaño del otro grupo, y `n` el tamaño de la muestra — equivalente a `K=r` y `N=r+b` en la notación usada aquí. La media en esa notación se escribe `μ=nr/(r+b)`, idéntica a `E[X]=n·(K/N)`:

```bash
awk -v n=4 -v r=6 -v b=5 'BEGIN{
  mu_notacion_rb = n*r/(r+b)
  N=r+b; K=r
  mi_notacion_NK = n*(K/N)
  printf "mu (r,b) = %.4f    E[X] (N,K) = %.4f\n", mu_notacion_rb, mi_notacion_NK
}'
```
Salida real: `mu (r,b) = 2.1818    E[X] (N,K) = 2.1818` — ambas notaciones dan el mismo resultado; solo cambian los nombres de las variables.

```bash
awk 'function choose(n,r,  i,res){res=1; for(i=0;i<r;i++) res=res*(n-i)/(i+1); return res}
BEGIN{
  N=50; K=5; n=10; k=2
  printf "P(X=%d) = %.4f  (N=%d poblacion, K=%d exitos en poblacion, n=%d muestra)\n", k, (choose(K,k)*choose(N-K,n-k))/choose(N,n), N, K, n
}'
```
Probado, salida real: `P(X=2) = 0.2098  (N=50 poblacion, K=5 exitos en poblacion, n=10 muestra)`

**Validar antes de usar:** deben cumplirse `0≤K≤N`, `0≤n≤N`, `k≤K`, `k≤n`, y `n-k≤N-K` (no puede haber más no-éxitos en la muestra que no-éxitos disponibles en la población) — sin estas condiciones, la muestra descrita es físicamente imposible:
```bash
awk -v N=50 -v K=5 -v n=10 -v k=2 'BEGIN{
  if (K<0 || K>N) { print "ERROR: K debe estar entre 0 y N" > "/dev/stderr"; exit 1 }
  if (n<0 || n>N) { print "ERROR: n debe estar entre 0 y N" > "/dev/stderr"; exit 1 }
  if (k<0 || k>K || k>n) { print "ERROR: k no puede exceder K ni n" > "/dev/stderr"; exit 1 }
  if ((n-k) > (N-K)) { print "ERROR: la muestra no puede tener mas no-exitos que los disponibles en la poblacion" > "/dev/stderr"; exit 1 }
}'
```

### De dónde sale la fórmula — conteo directo de casos favorables sobre casos totales

Esta es, en el fondo, la probabilidad clásica del artefacto 6 (favorables/totales), aplicada a un problema de conteo combinatorio:

```bash
awk 'function choose(n,r,  i,res){res=1; for(i=0;i<r;i++) res=res*(n-i)/(i+1); return res}
BEGIN{
  N=50; K=5; n=10; k=2
  formas_totales = choose(N,n)
  formas_favorables = choose(K,k)*choose(N-K,n-k)
  printf "formas totales de elegir %d de %d = %.0f\n", n, N, formas_totales
  printf "formas favorables (elegir %d exitos de %d y %d no-exitos de %d) = %.0f\n", k, K, n-k, N-K, formas_favorables
  printf "P(X=%d) = favorables/totales = %.4f\n", k, formas_favorables/formas_totales
}'
```
Probado, salida real:
```
formas totales de elegir 10 de 50 = 10272278170
formas favorables (elegir 2 exitos de 5 y 8 no-exitos de 45) = 2155531950
P(X=2) = favorables/totales = 0.2098
```

**La lógica del conteo:** `C(N,n)` cuenta TODAS las muestras posibles de tamaño `n`, sin distinguir cuáles elementos son de interés. `C(K,k)` cuenta las formas de elegir exactamente `k` elementos de interés de los `K` disponibles, y `C(N-K,n-k)` cuenta las formas de completar el resto de la muestra con elementos que NO son de interés. Multiplicarlos da el total de formas de armar una muestra con exactamente `k` éxitos; dividir entre el total de muestras posibles da la probabilidad.

**Verificación por simulación independiente — muestreo real sin remplazo, no la fórmula:**
```
P(X=2) simulada = 0.2108
P(X=2) formula  = 0.2098
```
Probado con `random.sample` (que en Python realiza muestreo sin remplazo genuino) sobre 300,000 repeticiones, extrayendo 10 elementos de una población de 50 con 5 marcados como "éxito" — coincide con la fórmula cerrada dentro del margen de error de simulación.

## Comparación directa con la Binomial

```bash
awk 'function choose(n,r,  i,res){res=1; for(i=0;i<r;i++) res=res*(n-i)/(i+1); return res}
BEGIN{
  N=50; K=5; n=10; k=2
  hiper = (choose(K,k)*choose(N-K,n-k))/choose(N,n)
  p = K/N
  binom = choose(n,k)*(p^k)*((1-p)^(n-k))
  printf "Hipergeometrica: %.4f   Binomial (aproximacion): %.4f  (diferencia: %.4f)\n", hiper, binom, hiper-binom
}'
```
Probado, salida real: `Hipergeometrica: 0.2098   Binomial (aproximacion): 0.1937  (diferencia: 0.0161)`

**Por qué difieren:** la Binomial asume `p` constante en cada extracción — válido con remplazo. Sin remplazo, sacar un éxito reduce proporcionalmente los éxitos restantes disponibles para las siguientes extracciones.

## Media — `E[X] = n·(K/N)`

```bash
awk -v N=50 -v K=5 -v n=10 'BEGIN{ printf "E[X] = %.4f\n", n*(K/N) }'
```
Probado, salida real: `E[X] = 1.0000` — misma fórmula que la Binomial con `p=K/N`, la media sí coincide entre ambas aunque la forma completa de la distribución no.

## Varianza — el factor de corrección de población finita

**Responde:** "¿por qué la varianza de una muestra sin reemplazo es siempre MENOR que la de una muestra con reemplazo del mismo tamaño?"

```
Var(X) = n·(K/N)·(1-K/N)·[(N-n)/(N-1)]
```

El primer factor `n·(K/N)·(1-K/N)` es exactamente la varianza que tendría una Binomial con `p=K/N`. El segundo factor, `(N-n)/(N-1)`, se llama **factor de corrección de población finita** y siempre vale entre 0 y 1 — reduce la varianza respecto al caso con remplazo.

```bash
awk -v N=50 -v K=5 -v n=10 'BEGIN{
  p = K/N
  var_binomial = n*p*(1-p)
  factor_correccion = (N-n)/(N-1)
  var_hiper = var_binomial*factor_correccion
  printf "Var(X) hipergeometrica = %.4f   Var(X) binomial (sin correccion) = %.4f   factor correccion = %.4f\n", var_hiper, var_binomial, factor_correccion
}'
```
Probado, salida real: `Var(X) hipergeometrica = 0.7347   Var(X) binomial (sin correccion) = 0.9000   factor correccion = 0.8163`

**Por qué la varianza es menor sin remplazo — intuición:** al no reponer lo extraído, la muestra "se autorregula" — si ya salieron varios éxitos, quedan proporcionalmente menos disponibles para las extracciones restantes, lo cual limita cuánto puede desviarse el resultado final del valor esperado. Con remplazo, cada extracción es completamente independiente de las anteriores, permitiendo mayor variabilidad acumulada.

**El factor de corrección desaparece cuando `N` es mucho más grande que `n`:**
```bash
awk -v N=5000 -v n=10 'BEGIN{ printf "factor correccion (N grande) = %.4f (casi 1, casi no corrige nada)\n", (N-n)/(N-1) }'
```
Probado, salida real: `factor correccion (N grande) = 0.9982` — casi 1, confirmando por qué, con población grande relativa a la muestra, la distinción entre "con remplazo" y "sin remplazo" deja de importar tanto: agotar unos cuantos elementos de una población de miles apenas cambia las probabilidades restantes.

## Aplicación directa a nuestro análisis de tokens/corpus

Esta es la fórmula matemáticamente correcta para "si tomo una muestra de `n` archivos SIN reemplazo de un corpus de `N` archivos, donde `K` contienen un token raro, ¿cuál es la probabilidad de que mi muestra capture al menos uno?" — se responde con `1-P(X=0)`, no con la Binomial (que asumiría, incorrectamente, poder revisar el mismo archivo dos veces).

```bash
awk 'function choose(n,r,  i,res){res=1; for(i=0;i<r;i++) res=res*(n-i)/(i+1); return res}
BEGIN{
  N=50; K=5; n=10
  p_cero = (choose(K,0)*choose(N-K,n-0))/choose(N,n)
  printf "P(al menos 1 exito en la muestra) = %.4f\n", 1-p_cero
}'
```

## Resumen: cuándo usar cada una

| Situación | Distribución |
|---|---|
| Muestreo CON remplazo, o `p` constante en cada intento | Binomial |
| Muestreo SIN remplazo de una población finita conocida | Hipergeométrica |
| Muestreo sin remplazo, pero `N` es mucho más grande que `n` | Binomial como aproximación razonable (factor de corrección ≈1) |
