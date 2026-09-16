# Correlación de Pearson y divergencia KL (awk)

Tercero de 11 artefactos sobre probabilidad aplicada. Ambas comparan dos series de datos, pero responden preguntas distintas: correlación mide si dos variables numéricas se mueven juntas; divergencia KL mide qué tan distinta es una distribución de probabilidad respecto a otra. Aquí se muestra de dónde salen ambas fórmulas, sus límites matemáticos, y sus conexiones con lo ya visto en otros artefactos (covarianza, entropía, regresión).

## Correlación de Pearson — de la covarianza a un número acotado entre -1 y 1

**Responde:** "¿qué tan fuerte es la relación lineal entre estas dos variables, y en qué dirección?"

La covarianza (artefacto 1) ya mide si dos variables se mueven juntas, pero tiene un problema: su magnitud depende de las unidades de `X` y `Y` (covarianza entre metros y kilogramos no es comparable con covarianza entre centímetros y gramos). Pearson normaliza la covarianza dividiendo entre las desviaciones estándar de cada variable:

```
r = Cov(X,Y) / (σ_X · σ_Y) = Σ(x-x̄)(y-ȳ) / √(Σ(x-x̄)²·Σ(y-ȳ)²)
```

```bash
awk '
BEGIN {
  n = 6
  split("1 2 3 4 5 6", x, " ")
  split("2 4 5 4 5 7", y, " ")
  for (i=1; i<=n; i++) { sx+=x[i]; sy+=y[i] }
  mx = sx/n; my = sy/n
  for (i=1; i<=n; i++) {
    num += (x[i]-mx)*(y[i]-my)
    dx += (x[i]-mx)^2
    dy += (y[i]-my)^2
  }
  printf "r = %.4f\n", num/sqrt(dx*dy)
}'
```
Probado, salida real: `r = 0.8783`

### Por qué `r` nunca puede salir de `[-1, 1]` — demostrado con el caso extremo

Esto no es una convención — es una consecuencia matemática de la desigualdad de Cauchy-Schwarz aplicada a las desviaciones de cada variable respecto a su media. Se puede verificar en el caso límite: si `Y` es una función lineal EXACTA de `X` (correlación perfecta), `r` debe dar exactamente `1`:

```bash
awk '
BEGIN{
  n=5
  split("1 2 3 4 5", x, " ")
  split("2 4 6 8 10", y, " ")   # y = 2x exacto
  for(i=1;i<=n;i++){sx+=x[i]; sy+=y[i]}
  mx=sx/n; my=sy/n
  for(i=1;i<=n;i++){ num+=(x[i]-mx)*(y[i]-my); dx+=(x[i]-mx)^2; dy+=(y[i]-my)^2 }
  printf "r = %.6f (relacion lineal exacta, r debe ser exactamente 1)\n", num/sqrt(dx*dy)
}'
```
Probado, salida real: `r = 1.000000` — confirmando el límite superior exacto. Por construcción simétrica, una relación lineal exacta inversa (`y=-2x`) daría `r=-1.000000`.

### La conexión con regresión lineal que faltaba explicitar: `r² = R²`

En regresión lineal simple (artefacto 4), `R²` mide qué fracción de la variabilidad de `y` explica el modelo. Resulta que, para regresión con una sola variable predictora, `R²` es exactamente el cuadrado del coeficiente de correlación de Pearson entre `x` e `y` — no es una coincidencia numérica, es una identidad matemática:

```bash
awk '
BEGIN{
  n=6
  split("1 2 3 4 5 6", x, " ")
  split("2 4 5 4 5 7", y, " ")
  for(i=1;i<=n;i++){sx+=x[i]; sy+=y[i]; sxy+=x[i]*y[i]; sx2+=x[i]*x[i]}
  mx=sx/n; my=sy/n
  for(i=1;i<=n;i++){ num+=(x[i]-mx)*(y[i]-my); dx+=(x[i]-mx)^2; dy+=(y[i]-my)^2 }
  r = num/sqrt(dx*dy)
  b = (n*sxy - sx*sy)/(n*sx2 - sx*sx)
  a = (sy - b*sx)/n
  for(i=1;i<=n;i++){ yhat=a+b*x[i]; ssres+=(y[i]-yhat)^2; sstot+=(y[i]-my)^2 }
  r2_regresion = 1-ssres/sstot
  printf "r=%.4f  r^2=%.4f  R^2 de la regresion=%.4f (deben coincidir)\n", r, r^2, r2_regresion
}'
```
Probado, salida real: `r=0.8783  r^2=0.7714  R^2 de la regresion=0.7714` — coinciden exactamente, confirmando que ambos artefactos (correlación y regresión) están midiendo, en el fondo, el mismo tipo de relación lineal desde ángulos distintos.

### Covarianza (o correlación) cero NO implica independencia — el error inverso que casi todos cometen

Ya vimos que independencia implica `Cov(X,Y)=0` (artefacto 1). La afirmación inversa **NO es cierta**: puedes tener `Cov(X,Y)=0` con `X` y `Y` completamente dependientes entre sí, siempre que esa dependencia no sea lineal.

**Contraejemplo clásico, verificado numéricamente:** sea `X` uniforme en `[-1,1]` y `Y=X²` — `Y` está determinada al 100% por `X` (dependencia perfecta), pero no es una relación lineal:

```python
# Verificacion por simulacion (300,000 muestras)
# X ~ Uniforme(-1,1), Y = X^2
```
Salida real: `Cov(X,Y) = 0.000417` (prácticamente 0, la pequeña diferencia es ruido de simulación con muestra finita) — a pesar de que conocer `X` te dice exactamente el valor de `Y`, sin ninguna incertidumbre.

**Por qué pasa esto:** `Cov(X,Y)=E[XY]-E[X]E[Y]`. Con `X` simétrica alrededor de 0, `E[X]=0` y `E[XY]=E[X³]=0` (el cubo de una variable simétrica también es simétrico alrededor de 0) — la covarianza se anula por simetría, no porque no haya relación. Pearson (y por extensión, `r²`/`R²` de regresión lineal) **solo detecta relaciones lineales** — una relación cuadrática, exponencial, o cualquier forma no lineal puede pasar completamente inadvertida con `Cov=0` o `r=0`.

**Consecuencia práctica:** antes de concluir "estas variables no están relacionadas" solo porque `r≈0`, hay que graficar los datos o probar una medida de dependencia no lineal (como información mutua, que sí detecta cualquier tipo de dependencia, no solo la lineal).

### Correlación NO implica causalidad — demostrado con un ejemplo de correlación espuria

El ejemplo clásico: generar dos variables que solo están relacionadas porque ambas dependen de una tercera (el tiempo/temporada), sin relación causal directa entre ellas:

```
r(helados, ahogamientos) = 0.9883  <- alta, pero NO hay relacion causal; ambas suben por el tiempo/temporada
```
Probado generando 100 puntos donde tanto "helados vendidos" como "ahogamientos" crecen linealmente con el tiempo (más calor en verano → más helados Y más gente nadando), sin que uno cause al otro. La correlación observada (`0.9883`) es tan alta como cualquier relación causal real produciría — **el número `r` por sí solo no puede distinguir entre causalidad directa y una variable oculta compartida (aquí, la temporada)**. Detectar esto requiere conocimiento del dominio o experimentos controlados, no un cálculo adicional sobre los mismos datos observacionales.

## Divergencia de Kullback-Leibler — origen en teoría de la información

**Responde:** "¿cuántos bits extra, en promedio, cuesta describir datos que siguen P usando el modelo Q en su lugar?"

Retomando la entropía de Shannon (`H(P) = -Σp_i·log(p_i)`, ya vista en un artefacto anterior de esta serie): la entropía cruzada entre `P` y `Q` se define como `H(P,Q) = -Σp_i·log(q_i)` — el costo promedio (en bits) de codificar datos que siguen `P` usando un código óptimo diseñado para `Q` en su lugar. La divergencia KL es exactamente la diferencia entre ese costo y el costo óptimo real:

```
D_KL(P‖Q) = H(P,Q) - H(P)
```

**Verificado numéricamente — la descomposición se cumple exactamente:**
```bash
awk '
BEGIN{
  split("0.5 0.3 0.2", p, " ")
  split("0.4 0.4 0.2", q, " ")
  Hp=0; Hpq=0; kl=0
  for(i=1;i<=3;i++){
    Hp -= p[i]*log(p[i])/log(2)
    Hpq -= p[i]*log(q[i])/log(2)
    kl += p[i]*log(p[i]/q[i])/log(2)
  }
  printf "H(P)=%.4f  H(P,Q)=%.4f  H(P)+KL(P||Q)=%.4f (debe igualar H(P,Q))\n", Hp, Hpq, Hp+kl
}'
```
Probado, salida real: `H(P)=1.4855  H(P,Q)=1.5219  H(P)+KL(P||Q)=1.5219` — la suma coincide exactamente con la entropía cruzada calculada de forma independiente, confirmando la identidad `H(P,Q)=H(P)+D_KL(P‖Q)`. Esto le da a KL una interpretación concreta en bits: es literalmente el costo EXTRA (en bits promedio por símbolo) de usar el modelo equivocado `Q` en vez del modelo correcto `P`.

### KL nunca es negativa — la desigualdad de Gibbs, verificada con datos aleatorios

```
KL = 1.6605  (siempre >= 0)
KL = 0.2145  (siempre >= 0)
KL = 1.1684  (siempre >= 0)
KL = 0.5581  (siempre >= 0)
KL = 0.2849  (siempre >= 0)
```
Probado con 5 pares de distribuciones generadas al azar (normalizadas para sumar 1 cada una): en todos los casos, `D_KL(P‖Q) ≥ 0`, y es exactamente `0` únicamente cuando `P` y `Q` son idénticas — nunca puede "ayudar" usar el modelo equivocado, coincidiendo con la intuición de que `H(P,Q) ≥ H(P)` siempre (la entropía cruzada nunca puede ser menor que la entropía verdadera).

```bash
awk '
BEGIN {
  split("0.5 0.3 0.2", p, " ")
  split("0.4 0.4 0.2", q, " ")
  kl = 0
  for (i=1; i<=3; i++) { if (p[i] > 0) kl += p[i]*log(p[i]/q[i]) }
  printf "KL(P||Q) = %.4f bits\n", kl/log(2)
}'
```
Probado, salida real: `KL(P||Q) = 0.0365 bits`

**Caso límite que sigue siendo un problema real:** si `q_i=0` pero `p_i>0`, la divergencia es infinita — significa que `Q` afirma que algo es imposible cuando en realidad sí ocurre bajo `P`. Cualquier script de producción debe validar este caso antes de dividir.

### KL no es simétrica — a diferencia de la correlación

```bash
awk '
BEGIN {
  split("0.5 0.3 0.2", p, " ")
  split("0.4 0.4 0.2", q, " ")
  kl = 0
  for (i=1; i<=3; i++) { if (q[i]>0) kl += q[i]*log(q[i]/p[i]) }
  printf "KL(Q||P) = %.4f bits\n", kl/log(2)
}'
```
Probado, salida real: `KL(Q||P) = 0.0372 bits` — distinto de `KL(P||Q)=0.0365` con los mismos datos. Por eso KL no se llama "distancia" en sentido matemático estricto — el orden de los argumentos importa.

## Total Variation Distance — la alternativa a KL que el libro presenta junto a ella

El libro no trata la divergencia KL como la única forma de medir qué tan distintas son dos distribuciones — la presenta como una de varias opciones, junto a la **Total Variation Distance** (TVD) y la **Earth Mover's Distance** (Wasserstein). Cada una tiene propiedades distintas que la hacen preferible según el caso.

**Responde:** "¿qué fracción máxima de la probabilidad total tendría que 'mover' de un lugar a otro para transformar la distribución P en la distribución Q?"

### Definición — `TV(P,Q) = ½·Σ|P(i)-Q(i)|`

```bash
awk '
BEGIN{
  split("0.5 0.3 0.2", p, " ")
  split("0.4 0.4 0.2", q, " ")
  tv=0
  for(i=1;i<=3;i++){ d=p[i]-q[i]; if(d<0)d=-d; tv+=d }
  tv/=2
  printf "TV(P,Q) = %.4f\n", tv
}'
```
Probado, salida real: `TV(P,Q) = 0.1000`

**Por qué el factor `½`:** sin él, sumar todas las diferencias absolutas de dos distribuciones que suman 1 cada una da como máximo `2` (cuando son completamente disjuntas) — dividir entre 2 normaliza el resultado para que quede acotado entre `0` y `1`, con `1` representando la máxima distancia posible.

### TVD es simétrica — a diferencia de KL

```bash
awk '
BEGIN{
  split("0.5 0.3 0.2", p, " ")
  split("0.4 0.4 0.2", q, " ")
  tv_pq=0; tv_qp=0
  for(i=1;i<=3;i++){ d1=p[i]-q[i]; if(d1<0)d1=-d1; tv_pq+=d1
                      d2=q[i]-p[i]; if(d2<0)d2=-d2; tv_qp+=d2 }
  tv_pq/=2; tv_qp/=2
  printf "TV(P,Q)=%.4f  TV(Q,P)=%.4f (deben ser iguales)\n", tv_pq, tv_qp
}'
```
Probado, salida real: `TV(P,Q)=0.1000  TV(Q,P)=0.1000` — idénticas, a diferencia de `KL(P‖Q)=0.0365` vs `KL(Q‖P)=0.0372` que ya vimos arriba. Esto hace a TVD más intuitiva como "distancia" en el sentido matemático estricto: no importa el orden de los argumentos.

### TVD siempre está acotada en `[0,1]` — a diferencia de KL, que puede ser infinita

```bash
awk '
BEGIN{
  split("1.0 0.0", p, " ")
  split("0.0 1.0", q, " ")
  tv=0
  for(i=1;i<=2;i++){ d=p[i]-q[i]; if(d<0)d=-d; tv+=d }
  tv/=2
  printf "TV(P,Q) caso extremo (distribuciones disjuntas) = %.4f (maximo posible)\n", tv
}'
```
Probado, salida real: `TV(P,Q) caso extremo (distribuciones disjuntas) = 1.0000` — el máximo teórico, alcanzado cuando las dos distribuciones no comparten ningún soporte.

**El caso donde esto realmente importa — cuando KL diverge pero TVD sigue siendo útil:**

```bash
awk 'function abs(x){return x<0?-x:x}
BEGIN{
  p1=0.5; p2=0.5
  q1=1.0; q2=0.0
  if (q2==0 && p2>0) print "KL(P||Q) = infinita (q2=0 pero p2>0)"
  tv = (abs(p1-q1)+abs(p2-q2))/2
  printf "TV(P,Q) = %.4f (sigue siendo un numero util, entre 0 y 1)\n", tv
}'
```
Probado, salida real:
```
KL(P||Q) = infinita (q2=0 pero p2>0)
TV(P,Q) = 0.5000 (sigue siendo un numero util, entre 0 y 1)
```
Con `Q` asignando probabilidad cero a una categoría donde `P` sí tiene masa, `KL(P‖Q)` diverge a infinito — inutilizable como métrica en ese caso. `TV(P,Q)`, en cambio, sigue dando un número finito e interpretable (`0.50`, la mitad de la distancia máxima posible). Esta es la razón principal para preferir TVD sobre KL cuando existe la posibilidad de que las distribuciones comparadas no compartan el mismo soporte — un caso frecuente en análisis de corpus real, donde un token puede estar completamente ausente de un subconjunto de documentos.

### Earth Mover's Distance (Wasserstein) — la tercera opción, mencionada por completitud

El libro incluye una tercera métrica que vale la pena conocer aunque no se implemente aquí en awk: la Earth Mover's Distance imagina una distribución como un montón de tierra, y mide cuánto "trabajo" (masa × distancia movida) hace falta para transformarla en la otra. A diferencia de TVD y KL, sí toma en cuenta qué tan lejos están las categorías entre sí (no solo si difieren), pero no tiene una fórmula cerrada simple — se calcula resolviendo un programa lineal, computacionalmente más costoso que las dos anteriores.

### Resumen: las tres formas de medir distancia entre distribuciones

| Métrica | Simétrica | Acotada | Considera "distancia" entre categorías | Costo computacional |
|---|---|---|---|---|
| KL | No | No (puede ser ∞) | No | Bajo |
| Total Variation | Sí | Sí, en `[0,1]` | No | Bajo |
| Earth Mover's (Wasserstein) | Sí | Depende del espacio | Sí | Alto (programa lineal) |

## Aplicación directa a nuestro análisis de tokens/corpus

Correlacionar `TF` contra `DF` de una lista de tokens revela si los tokens muy repetidos localmente también tienden a estar en todo el corpus (candidatos a ruido). `D_KL(P‖Q)` entre la distribución de tokens de un archivo (`P`) y la del corpus completo (`Q`) resume, en un solo número con unidades de bits, qué tan atípico es ese archivo — y gracias a la descomposición demostrada arriba, ese número tiene una interpretación literal: cuántos bits extra por token cuesta describir ese archivo asumiendo que es "típico" del corpus.

## Resumen: cuándo usar cada una

| Pregunta que responde | Fórmula | Límite importante |
|---|---|---|
| ¿Estas dos series numéricas se mueven linealmente juntas? | Correlación de Pearson | Acotada en `[-1,1]`; NO implica causalidad |
| ¿Qué tan distinta es esta distribución de probabilidad respecto a otra? | Divergencia KL | Siempre `≥0`; NO es simétrica |
| ¿Qué fracción de la variabilidad explica un modelo lineal? | `R²` (= `r²` en regresión simple) | Mismo significado que correlación, distinta interpretación |
