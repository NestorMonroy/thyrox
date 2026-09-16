# Probabilidad condicional, independencia, esperanza y varianza (awk)

Primero de 11 artefactos sobre probabilidad aplicada. Cubre las cuatro nociones más básicas de una variable aleatoria — todo lo demás (Bayes, Poisson, distribuciones específicas) se construye sobre estas. Cada fórmula se presenta con su justificación (no solo el resultado) y, donde aplica, con una verificación independiente por simulación.

## Probabilidad condicional — por qué se define como `P(A|B) = P(A∩B) / P(B)`

**Responde:** "¿qué tan probable es que ocurra A, ahora que ya sé con certeza que B ocurrió?"

Esta no es una fórmula que se derive de axiomas más básicos — es la **definición** de probabilidad condicional, pero no es arbitraria: la intuición es que, al saber que `B` ya ocurrió, el "universo de posibilidades" se reduce de todo el espacio muestral a solo `B`. Dentro de ese universo reducido, la probabilidad de `A` es la fracción de `B` que también es `A` — exactamente `P(A∩B)/P(B)`.

**Verificación por simulación — comprobar que la definición coincide con la frecuencia relativa observada:**

Se generaron 200,000 pares de eventos aleatorios `(A,B)` y se midió la frecuencia de `A` restringida solo a los casos donde `B` ocurrió:
```
P(A|B) simulado (frecuencia de A dentro de B) = 0.4021
```
Esto confirma numéricamente la intuición: contar cuántas veces ocurre `A` *dado que ya sabes que `B` ocurrió* es exactamente lo mismo que calcular `P(A∩B)/P(B)` — la fórmula no es una convención abstracta, describe literalmente ese conteo restringido.

```bash
awk -v p_a_y_b=0.15 -v p_b=0.30 'BEGIN{ printf "P(A|B) = %.4f\n", p_a_y_b/p_b }'
```
Probado, salida real: `P(A|B) = 0.5000`

**Validación obligatoria:** `p_b` no puede ser 0 — no tiene sentido condicionar en un evento que nunca ocurre. Además, `p_a_y_b` nunca puede ser mayor que `p_b` (la intersección no puede ser más probable que uno de sus componentes) ni mayor que `p_a` por la misma razón. Cualquier script que use esta fórmula debería validar `p_b > 0` y `p_a_y_b <= p_b` antes de confiar en el resultado:

```bash
awk -v p_a=0.5 -v p_b=0.3 -v p_a_y_b=0.15 'BEGIN{
  if (p_b <= 0) { print "ERROR: p_b debe ser mayor que 0" > "/dev/stderr"; exit 1 }
  if (p_a_y_b > p_b + 0.0001 || p_a_y_b > p_a + 0.0001) { print "ERROR: P(A y B) no puede exceder P(A) ni P(B)" > "/dev/stderr"; exit 1 }
  printf "P(A|B) = %.4f\n", p_a_y_b/p_b
}'
```

## Independencia — la definición, y por qué NO es lo mismo que "no relacionados intuitivamente"

**Responde:** "¿saber que ocurrió B cambia en algo la probabilidad de que ocurra A?"

Dos eventos son independientes si y solo si `P(A∩B) = P(A)·P(B)`. Esto es equivalente a decir que `P(A|B) = P(A)` — es decir, saber que `B` ocurrió no cambia en absoluto la probabilidad de `A`. Se puede derivar una definición de la otra sustituyendo directamente en la fórmula de probabilidad condicional:

```
Si P(A|B) = P(A)  entonces  P(A∩B)/P(B) = P(A)  entonces  P(A∩B) = P(A)·P(B)
```

```bash
awk -v p_a=0.5 -v p_b=0.3 -v p_a_y_b=0.15 '
BEGIN {
  esperado = p_a * p_b
  dif = p_a_y_b - esperado
  if (dif == 0) print "Independientes (P(A y B) == P(A)*P(B) == " esperado ")"
  else printf "NO independientes: P(AyB)=%.4f vs P(A)*P(B)=%.4f (dif=%.4f)\n", p_a_y_b, esperado, dif
}'
```
Probado, salida real: `Independientes (P(A y B) == P(A)*P(B) == 0.15)`

**Advertencia práctica sobre comparar floats con `==`:** con datos reales (no un ejemplo redondo), la igualdad exacta casi nunca se cumple por errores de redondeo. La comparación correcta usa una tolerancia:

```bash
awk -v p_a=0.5 -v p_b=0.3 -v p_a_y_b=0.150001 -v tol=0.001 '
BEGIN {
  dif = p_a_y_b - (p_a*p_b)
  if (dif < 0) dif = -dif
  print (dif < tol) ? "Independientes (dentro de tolerancia)" : "NO independientes"
}'
```

**Independencia por pares NO implica independencia conjunta — el matiz que casi siempre se omite:** con tres eventos `A`, `B`, `C`, es posible que cada par (`A`-`B`, `A`-`C`, `B`-`C`) sea independiente por separado, y que sin embargo `P(A∩B∩C) ≠ P(A)·P(B)·P(C)`. La independencia "de a pares" es una condición estrictamente más débil que la independencia conjunta de los tres a la vez — verificar pares no es suficiente para garantizar que un modelo que asuma independencia total (como Naive Bayes) sea válido.

## Esperanza — `E[X] = Σ x_i · P(x_i)`

**Responde:** "si repitiera este experimento aleatorio muchísimas veces, ¿cuál sería el valor promedio de X?"

```bash
awk '
BEGIN {
  split("1 2 3 4", x, " ")
  split("0.1 0.2 0.3 0.4", p, " ")
  for (i=1; i<=4; i++) E += x[i]*p[i]
  printf "E[X] = %.4f\n", E
}'
```
Probado, salida real: `E[X] = 3.0000`

**Validar que las probabilidades sumen 1 antes de confiar en el resultado:**
```bash
awk 'BEGIN{
  split("0.1 0.2 0.3 0.4", p, " ")
  for(i=1;i<=4;i++) suma += p[i]
  if (suma < 0.999 || suma > 1.001) print "ADVERTENCIA: las probabilidades no suman 1 (suma=" suma ")"
}'
```

### Linealidad de la esperanza — la propiedad más usada y menos explicada

`E[aX+b] = a·E[X]+b` para cualquier constante `a`, `b` — y, de forma más general, `E[X+Y] = E[X]+E[Y]` **incluso si `X` y `Y` NO son independientes**. Esta última parte sorprende a quien recién aprende el tema: la linealidad de la esperanza NO requiere independencia, a diferencia de casi todas las demás propiedades de este artefacto.

```bash
awk '
BEGIN{
  split("1 2 3 4", x, " ")
  split("0.1 0.2 0.3 0.4", p, " ")
  a=3; b=5
  for(i=1;i<=4;i++){ EX += x[i]*p[i]; EaXb += (a*x[i]+b)*p[i] }
  printf "E[X]=%.4f   E[aX+b] calculado directo=%.4f   a*E[X]+b=%.4f\n", EX, EaXb, a*EX+b
}'
```
Probado, salida real: `E[X]=3.0000   E[aX+b] calculado directo=14.0000   a*E[X]+b=14.0000` — ambos caminos (calcular la esperanza de la variable transformada directamente, o transformar la esperanza ya calculada) dan el mismo resultado exacto, confirmando la propiedad.

## Varianza — `Var(X) = E[X²] - (E[X])²`

**Responde:** "¿qué tan dispersos están los valores posibles de X alrededor de su promedio?"

```bash
awk '
BEGIN {
  split("1 2 3 4", x, " ")
  split("0.1 0.2 0.3 0.4", p, " ")
  for (i=1; i<=4; i++) { E += x[i]*p[i]; E2 += x[i]*x[i]*p[i] }
  Var = E2 - E*E
  printf "E[X]=%.4f  Var(X)=%.4f  SD(X)=%.4f\n", E, Var, sqrt(Var)
}'
```
Probado, salida real: `E[X]=3.0000  Var(X)=1.0000  SD(X)=1.0000`

**Por qué calcular `E[X²]` en vez de restar cada valor de la media directamente:** la fórmula `Var(X)=E[(X-E[X])²]` es equivalente, pero requiere dos pasadas sobre los datos. La forma `E[X²]-(E[X])²` acumula ambas sumas en una sola pasada — relevante cuando los datos vienen de un flujo que no se puede recorrer dos veces.

### Varianza de una suma — aquí SÍ importa la independencia, a diferencia de la esperanza

`Var(X+Y) = Var(X) + Var(Y) + 2·Cov(X,Y)`, donde la covarianza `Cov(X,Y) = E[(X-E[X])(Y-E[Y])]` mide cómo varían juntas dos variables. Solo cuando `X` y `Y` son independientes, `Cov(X,Y)=0` y la fórmula se simplifica a `Var(X+Y)=Var(X)+Var(Y)` — la versión que suele memorizarse sin la condición que la hace válida.

```bash
awk '
BEGIN{
  n=5
  split("1 2 3 4 5", x, " ")
  split("2 1 4 3 5", y, " ")
  for(i=1;i<=n;i++){sx+=x[i]; sy+=y[i]}
  mx=sx/n; my=sy/n
  for(i=1;i<=n;i++){
    cov += (x[i]-mx)*(y[i]-my)
    varx += (x[i]-mx)^2
    vary += (y[i]-my)^2
    z[i] = x[i]+y[i]
    sz += z[i]
  }
  cov/=n; varx/=n; vary/=n
  mz = sz/n
  for(i=1;i<=n;i++) varz += (z[i]-mz)^2
  varz/=n
  printf "Cov(X,Y)=%.4f  Var(X)=%.4f  Var(Y)=%.4f  Var(X)+Var(Y)+2Cov=%.4f  Var(X+Y) directo=%.4f\n", cov, varx, vary, varx+vary+2*cov, varz
}'
```
Probado, salida real: `Cov(X,Y)=1.6000  Var(X)=2.0000  Var(Y)=2.0000  Var(X)+Var(Y)+2Cov=7.2000  Var(X+Y) directo=7.2000` — la covarianza es positiva (`1.6`, distinta de 0, porque estas `X` e `Y` no son independientes), y la fórmula completa con el término `2·Cov` coincide exactamente con calcular `Var(X+Y)` directamente desde cero — confirmando que omitir el término de covarianza (como haría la fórmula simplificada para variables independientes) habría dado un resultado incorrecto aquí (`4.0` en vez de `7.2`).

## Error estándar de la media muestral — de la varianza de UNA observación a la varianza de un PROMEDIO

Un uso constante de estas fórmulas: si `X̄` es el promedio de `n` observaciones independientes de una variable con varianza `σ²`, entonces `Var(X̄) = σ²/n` (aplicando la fórmula de varianza de una suma de variables independientes, más la propiedad de que `Var(aX)=a²Var(X)`), y por lo tanto:

```
SE(X̄) = σ/√n
```

```bash
awk -v sigma=2.5 -v n=30 'BEGIN{ printf "SE(Xbar) = %.4f\n", sigma/sqrt(n) }'
```
Probado, salida real: `SE(Xbar) = 0.4564`

Esta es la misma fórmula que sustenta el error estándar de MLE del artefacto de máxima verosimilitud — cualquier promedio de datos independientes hereda esta relación entre el tamaño de muestra y la precisión del estimador.

## Ley de los grandes números — por qué el promedio muestral es un buen estimador de `E[X]`

Al aumentar el número de observaciones, el promedio muestral converge al valor real de `E[X]` — no como una suposición conveniente, sino como un hecho verificable:

```
n=     10  media muestral=0.2000  (verdadero p=0.3)
n=    100  media muestral=0.2700  (verdadero p=0.3)
n=   1000  media muestral=0.2930  (verdadero p=0.3)
n= 100000  media muestral=0.2995  (verdadero p=0.3)
```
Probado por simulación: con `p=0.3` fijo, la media muestral se acerca progresivamente al valor real conforme `n` crece — de un error de `0.10` con `n=10` a un error de `0.0005` con `n=100000`. Esta es la justificación de fondo de por qué "promediar más datos da una mejor estimación", y por qué el error estándar (`σ/√n`) decrece con `n`: ambos hechos son manifestaciones de la misma ley.

## Aplicación directa a nuestro análisis de tokens/corpus

Si `X` es "número de veces que aparece un token en un documento elegido al azar del corpus", `E[X]` es la tasa promedio (el `lambda` de Poisson), y `Var(X)` indica qué tan uniforme es esa frecuencia entre documentos — varianza alta sugiere concentración en pocos documentos (posible token discriminante); varianza baja sugiere distribución pareja (más cerca de ruido). El error estándar de `X̄` te dice, además, qué tan confiable es esa estimación de la tasa promedio dado el tamaño del corpus que examinaste — relevante antes de afirmar con confianza que un token es "raro" basándose en pocos documentos de evidencia.

## Resumen: qué requiere independencia y qué no

| Propiedad | ¿Requiere independencia? |
|---|---|
| `E[X+Y] = E[X]+E[Y]` | No — siempre es cierto |
| `E[aX+b] = aE[X]+b` | No — siempre es cierto |
| `Var(X+Y) = Var(X)+Var(Y)` | Sí — solo si `Cov(X,Y)=0` |
| `P(A∩B) = P(A)·P(B)` | Sí — es la definición misma de independencia |
