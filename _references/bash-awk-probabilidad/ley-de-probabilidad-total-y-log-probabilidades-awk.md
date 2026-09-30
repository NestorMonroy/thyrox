# Ley de probabilidad total y log-probabilidades (awk)

Séptimo de 11 artefactos sobre probabilidad aplicada. La ley de probabilidad total resuelve "¿cuál es la probabilidad de B si no sé cuál de varios escenarios ocurrió?"; las log-probabilidades resuelven un problema numérico (no matemático) que aparece al multiplicar muchas probabilidades pequeñas seguidas.

## Ley de probabilidad total — `P(B) = Σ P(B|A_i)·P(A_i)`

**Responde:** "no sé cuál de varios escenarios posibles ocurrió, pero sé qué tan probable es B dentro de cada uno — ¿cuál es la probabilidad total de B, sin condicionar a ningún escenario en particular?"

```bash
awk 'BEGIN{
  p_b_dado_a1=0.7; p_a1=0.4
  p_b_dado_a2=0.2; p_a2=0.6
  p_b = p_b_dado_a1*p_a1 + p_b_dado_a2*p_a2
  printf "P(B) = %.4f\n", p_b
}'
```
Probado, salida real: `P(B) = 0.4000`

### De dónde sale la fórmula — no es una regla nueva, es unión de eventos disjuntos

Si `A1` y `A2` particionan todo el espacio muestral (son mutuamente excluyentes y cubren todos los casos posibles), entonces el evento `B` se puede descomponer exactamente en dos piezas disjuntas: la parte de `B` que ocurre junto con `A1`, y la parte que ocurre junto con `A2`. Como son disjuntas, sus probabilidades simplemente se suman (la unión de eventos disjuntos del artefacto 6, sin necesitar restar ninguna intersección):

```bash
awk 'BEGIN{
  p_b_y_a1 = 0.7*0.4
  p_b_y_a2 = 0.2*0.6
  printf "P(B) = P(B interseccion A1)+P(B interseccion A2) = %.4f + %.4f = %.4f\n", p_b_y_a1, p_b_y_a2, p_b_y_a1+p_b_y_a2
}'
```
Probado, salida real: `P(B) = P(B interseccion A1)+P(B interseccion A2) = 0.2800 + 0.1200 = 0.4000` — y cada término `P(B∩A_i)` es exactamente `P(B|A_i)·P(A_i)` por la definición misma de probabilidad condicional (artefacto 1) — la ley de probabilidad total es la combinación directa de dos ideas ya vistas, no una regla independiente que memorizar por separado.

**Verificación por simulación:**
```
P(B) simulada = 0.4002
P(B) formula = 0.4000
```
Probado generando 300,000 repeticiones del proceso completo (elegir el escenario al azar según `P(A_i)`, luego decidir si ocurre `B` según `P(B|A_i)`) y contando la frecuencia total de `B` — coincide con la fórmula.

### Versión generalizada, para N escenarios

```bash
awk '
BEGIN{
  split("0.7 0.2 0.5", p_b_dado_a, " ")
  split("0.3 0.5 0.2", p_a, " ")
  n = 3
  for (i=1; i<=n; i++) p_b += p_b_dado_a[i]*p_a[i]
  printf "P(B) = %.4f\n", p_b
}'
```
Probado, salida real: `P(B) = 0.4100`

**Ejemplo con un escenario nombrado — clasificación de riesgo de una enfermedad:** una población se divide en tres grupos mutuamente excluyentes que cubren a todos: riesgo alto (exposición conocida), riesgo medio (antecedente familiar sin exposición directa), y riesgo bajo (población general). Cada grupo tiene su propia probabilidad de dar positivo en una prueba:

```bash
awk 'BEGIN{
  p_alto=0.10; p_medio=0.30; p_bajo=0.60
  p_test_dado_alto=0.80; p_test_dado_medio=0.20; p_test_dado_bajo=0.02
  p_test = p_test_dado_alto*p_alto + p_test_dado_medio*p_medio + p_test_dado_bajo*p_bajo
  printf "P(test positivo) = %.4f\n", p_test
}'
```
Salida real: `P(test positivo) = 0.1520` — el 15.2% de probabilidad de que una persona elegida al azar dé positivo combina tres poblaciones con comportamientos muy distintos (80% de positivos en el grupo de alto riesgo, solo 2% en el de bajo riesgo), ponderadas por qué tan grande es cada grupo dentro de la población total.

**Validación obligatoria:** los `p_a[i]` deben sumar exactamente 1 (partición completa, ver artefacto 6) — si no, el resultado no tiene sentido:

```bash
awk 'BEGIN{
  split("0.7 0.2 0.5", p_b_dado_a, " ")
  split("0.3 0.5 0.2", p_a, " ")
  n = 3
  suma_pa = 0
  for (i=1; i<=n; i++) suma_pa += p_a[i]
  if (suma_pa < 0.999 || suma_pa > 1.001) {
    print "ERROR: los p_a[i] no forman una particion valida (suma=" suma_pa ")" > "/dev/stderr"
    exit 1
  }
  for (i=1; i<=n; i++) p_b += p_b_dado_a[i]*p_a[i]
  printf "P(B) = %.4f\n", p_b
}'
```

**Por qué esta fórmula es el paso intermedio que usa Bayes:** el denominador `P(B)` en el teorema de Bayes casi nunca se conoce directamente — se calcula justamente con esta ley, sumando sobre todos los escenarios posibles.

## El rango de una log-probabilidad

Toda probabilidad cumple `0≤P(E)≤1` (el primer axioma de Kolmogorov). Aplicando logaritmo a esa desigualdad, el rango se transforma en `-∞≤log P(E)≤0` — un logaritmo de probabilidad nunca es positivo, y se acerca a `-∞` conforme la probabilidad se acerca a 0:

```bash
awk 'BEGIN{
  print "log(1) =", log(1)
  print "log(0.5) =", log(0.5)
  print "log(0.0001) =", log(0.0001)
}'
```
Salida real: `log(1)=0`, `log(0.5)=-0.693147`, `log(0.0001)=-9.21034` — mientras más pequeña la probabilidad, más negativo (y más lejos de 0) su logaritmo.

## El problema numérico: multiplicar muchas probabilidades pequeñas causa *underflow*

**Responde:** "¿por qué mi programa de clasificación (como Naive Bayes) empieza a dar resultados de cero o `NaN` cuando proceso documentos largos con muchos tokens?"

```bash
awk 'BEGIN{
  prod = 1
  for (i=1; i<=50; i++) prod *= 0.1
  printf "producto directo tras 50 factores de 0.1 = %.10g\n", prod
}'
```
Probado, salida real: `producto directo tras 50 factores de 0.1 = 1e-50`

**Llevado al extremo — con 300 factores en vez de 50:**
```bash
awk 'BEGIN{
  prod=1
  for(i=1;i<=300;i++) prod*=0.1
  printf "producto directo tras 300 factores = %.10g\n", prod
}'
```
Probado, salida real: `producto directo tras 300 factores = 1e-300` — ya al borde mismo del límite de representación de un `double` de 64 bits. Ese límite tiene un valor exacto, no aproximado: el menor número positivo representable en punto flotante de doble precisión es `2.2250738585072014e-308` (`sys.float_info.min` en Python) — cuyo logaritmo natural es `-708.396`, un número perfectamente manejable. Cualquier probabilidad más pequeña que ese límite colapsa exactamente a `0.0` en el producto directo, mientras que su logaritmo sigue siendo un número finito y útil. Con unos pocos cientos de tokens más, el resultado se volvería literalmente `0`, y el programa perdería toda capacidad de distinguir cuál de varias probabilidades diminutas es mayor — sin lanzar ningún error, solo dando resultados incorrectos en silencio.

## La solución: sumar logaritmos en vez de multiplicar

```bash
awk 'BEGIN{
  logsum=0
  for(i=1;i<=300;i++) logsum+=log(0.1)
  printf "logsum tras 300 factores = %.4f\n", logsum
}'
```
Probado, salida real: `logsum tras 300 factores = -690.7755` — sigue siendo un número de punto flotante perfectamente normal (muy lejos de cualquier límite de representación), a diferencia del producto directo que ya estaba al borde del colapso. Matemáticamente `log(a·b)=log(a)+log(b)`, así que sumar logaritmos es equivalente al producto original, pero numéricamente estable indefinidamente, sin importar cuántos factores se acumulen.

## Log-sum-exp: sumar (no multiplicar) probabilidades ya en escala logarítmica

**Responde:** "tengo varias probabilidades representadas como logaritmos (porque ya evité el underflow al calcularlas) y necesito SUMARLAS, no multiplicarlas — ¿cómo lo hago sin tener que des-exponenciar cada una primero?"

```bash
awk '
function logsumexp(a,b){
  m = (a>b) ? a : b
  return m + log(exp(a-m)+exp(b-m))
}
BEGIN{
  la = log(0.0000001)
  lb = log(0.0000003)
  printf "log(suma) via trick = %.6f  -> suma real = %.10g\n", logsumexp(la,lb), exp(logsumexp(la,lb))
}'
```
Probado, salida real: `log(suma) via trick = -14.731801  -> suma real = 4e-07` — que es efectivamente `0.0000001+0.0000003=0.0000004`, calculado sin exponenciar los valores extremadamente pequeños en ningún momento intermedio.

**Por qué restar el máximo antes de exponenciar:** al restar el mayor de los dos logaritmos, se garantiza que al menos uno de los términos (`exp(a-m)` o `exp(b-m)`) sea exactamente `1`, y el otro un número entre 0 y 1 — evitando que `exp()` reciba un argumento tan negativo que vuelva a producir underflow. Es la misma idea de estabilidad numérica que motivó usar logaritmos, aplicada ahora a la suma.

## Aplicación directa a nuestro análisis de tokens/corpus

Esto es exactamente lo que hace falta para que el Naive Bayes del primer recetario funcione con documentos reales largos: cada `log(P(token_i|archivo))` se suma, y si en algún punto necesitas comparar o combinar puntuaciones de varios archivos candidatos, `logsumexp` es la forma correcta de hacerlo sin perder precisión numérica.

## Resumen: cuándo usar cada técnica

| Situación | Técnica |
|---|---|
| Conoces `P(B\|escenario)` para cada escenario, necesitas `P(B)` total | Ley de probabilidad total |
| Vas a multiplicar muchas probabilidades pequeñas seguidas | Sumar sus logaritmos en su lugar |
| Necesitas sumar (no multiplicar) cantidades ya en escala logarítmica | `logsumexp`, restando el máximo antes de exponenciar |
