# Recetario ejecutable: fórmulas de probabilidad como funciones awk/bash

Versión genérica de las fórmulas ya aplicadas en un ejemplo concreto — aquí cada una está pensada para que la copies y la uses con tus propios datos, con datos de juguete solo para mostrar que funciona.

## Coeficiente binomial — `choose(n, r)`

Cuenta combinaciones posibles de `r` elementos tomados de un total de `n`, sin importar el orden.

```bash
awk 'function choose(n, r,    i, res) {
  res = 1
  for (i = 0; i < r; i++) res = res * (n - i) / (i + 1)
  return res
}
BEGIN { printf "C(10,3) = %.0f\n", choose(10, 3) }'
```
Probado, salida real: `C(10,3) = 120`

**Cómo adaptarlo:** cambia los dos números en la llamada `choose(10, 3)` por tus propios `n` y `r`, o reemplaza el `BEGIN` por un bloque que lea `n` y `r` de cada línea de un archivo: `{ print choose($1, $2) }`.

## Entropía de Shannon — qué tan pareja está una distribución

Recibe una lista de conteos (uno por línea, por `stdin`) y devuelve cuántos bits de "sorpresa" promedio tiene esa distribución.

```bash
awk '
{ counts[NR] = $1; total += $1 }
END {
  H = 0
  for (i in counts) {
    p = counts[i] / total
    H -= p * log(p) / log(2)
  }
  printf "Entropia H = %.4f bits sobre %d categorias (maximo posible = %.4f bits)\n", \
    H, length(counts), log(length(counts))/log(2)
}' <<'EOF'
5
3
3
3
1
1
1
EOF
```
Probado, salida real: `Entropia H = 2.5654 bits sobre 7 categorias`

**Cómo adaptarlo:** reemplaza el bloque `<<'EOF' ... EOF` por tu propio archivo de conteos (`awk '...' mis_conteos.txt`), uno por línea. Entropía baja significa que la distribución está dominada por pocas categorías; entropía cercana al máximo significa que está repartida casi uniformemente.

## Distribución de Poisson — probabilidad de observar exactamente *k* eventos

Dado un promedio de eventos por unidad (`lambda`), calcula qué tan probable es observar exactamente `k` eventos.

```bash
awk -v lam=4 -v k=2 '
function factorial(n,    i, res) { res = 1; for (i = 2; i <= n; i++) res *= i; return res }
BEGIN { printf "P(X=%d | lambda=%.1f) = %.4f\n", k, lam, exp(-lam) * (lam^k) / factorial(k) }'
```
Probado, salida real: `P(X=2 | lambda=4.0) = 0.1465`

**Cómo adaptarlo:** cambia `lam` (la tasa promedio observada en tus propios datos) y `k` (el valor específico cuya probabilidad quieres conocer) al invocar el comando: `awk -v lam=TU_LAMBDA -v k=TU_K '...'`. Un valor de probabilidad muy bajo (por ejemplo, menor a 0.01) sugiere que el valor observado es estadísticamente inusual bajo el supuesto de que los eventos siguen este modelo.

## Teorema de Bayes — invertir una probabilidad condicional

Dado `P(evidencia|hipótesis)`, `P(hipótesis)` y `P(evidencia)`, calcula `P(hipótesis|evidencia)`.

```bash
awk -v p_b_dado_a=0.9 -v p_a=0.01 -v p_b=0.05 '
BEGIN { printf "P(A|B) = %.4f\n", (p_b_dado_a * p_a) / p_b }'
```
Probado, salida real: `P(A|B) = 0.1800`

**Cómo adaptarlo:** sustituye los tres valores por los de tu propio problema. Si no conoces `P(evidencia)` directamente, se puede calcular como `P(evidencia) = P(evidencia|A)·P(A) + P(evidencia|no A)·P(no A)` — la ley de probabilidad total, que se puede añadir como una variable más al mismo `awk`.

## Naive Bayes — combinar varias piezas de evidencia con logaritmos

Cuando tienes varias probabilidades condicionales independientes que multiplicar, sumar sus logaritmos evita que el resultado se vuelva un número demasiado pequeño para representarse (*underflow*):

```bash
awk -v prior=0.1667 -v lik1=0.3333 -v lik2=0.3333 '
BEGIN {
  log_score = log(prior) + log(lik1) + log(lik2)
  printf "log-score = %.4f  (equivalente a probabilidad = %.6f)\n", log_score, exp(log_score)
}'
```

**Cómo adaptarlo:** por cada pieza de evidencia adicional, agrega otro `-v likN=...` y súmalo en `log_score`. Para clasificar entre varias categorías, calcula el `log_score` de cada una con los mismos datos de evidencia y quédate con la categoría de mayor puntaje — no hace falta convertir de vuelta a probabilidad para comparar cuál es mayor.

## Patrón común a las cuatro funciones

Todas siguen la misma estructura reutilizable:

```bash
awk -v param1=VALOR -v param2=VALOR 'BEGIN { ... calculo usando param1, param2 ... }'
```

Si necesitas la misma fórmula muchas veces con distintos valores, en vez de repetir la línea de `awk` conviene guardarla como función dentro de un archivo `.awk` (ver la guía de sintaxis de awk) e invocarla con `-f`, pasando los valores variables por `-v` en cada llamada.
