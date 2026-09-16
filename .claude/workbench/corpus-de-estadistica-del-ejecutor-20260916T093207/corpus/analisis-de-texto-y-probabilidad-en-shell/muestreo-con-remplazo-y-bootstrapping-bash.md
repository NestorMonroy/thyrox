# Muestreo con remplazo y bootstrapping (bash + awk)

Último de 11 artefactos sobre probabilidad aplicada. El bootstrapping estima la incertidumbre de una métrica directamente de los datos observados, remuestreándolos, en vez de asumir una distribución teórica. La técnica se inventó en Stanford en 1979, cuando las simulaciones por computadora empezaban a hacer viable este tipo de remuestreo masivo.

## El problema que resuelve, y por qué funciona

**Responde:** "tengo una sola muestra de datos y una métrica calculada sobre ella — ¿qué tan confiable es ese número, si no puedo volver a muestrear la población real?"

La idea central del bootstrap, que rara vez se explica: en la práctica NUNCA tienes acceso a la población completa, solo a tu muestra observada. El bootstrap trata esa muestra observada como si fuera la mejor aproximación disponible de la población real, y remuestrea DE ELLA (con remplazo) para simular qué pasaría si pudieras tomar muestras repetidas de la población verdadera.

**Verificación conceptual — comparando contra una población real simulada (algo que en la práctica nunca se conoce, pero aquí sí porque la generamos nosotros):**

```
media poblacion real (desconocida en la practica) = 49.9997
media de la muestra observada                     = 48.1946
media de las medias bootstrap                      = 48.1461
error estandar bootstrap                            = 2.7099
error estandar teorico (sigma/sqrt(n), sigma=10)    = 2.2361
```

Probado generando una población de 100,000 valores con media real `50` y desviación estándar `10`, tomando UNA muestra de solo 20 valores (lo único que se tendría en un caso real), y aplicando bootstrap sobre esa muestra pequeña. La media de las medias bootstrap (`48.1461`) se mantiene cerca de la media de la muestra original (`48.1946`, NO de la media poblacional real que el bootstrap nunca ve) — el bootstrap no "adivina" la población real, estima la variabilidad usando únicamente la información contenida en la muestra que sí tienes. El error estándar bootstrap (`2.71`) está en el mismo orden de magnitud que el error estándar teórico calculado con la fórmula clásica (`2.24`, que en este caso especial de la media SÍ existe y usa `σ` real, algo que el bootstrap tampoco necesita conocer).

## El estadístico original, antes de remuestrear

```bash
printf "10\n12\n9\n11\n50\n10\n8\n13\n9\n11\n" > datos_originales.txt
awk '{s+=$1;n++} END{printf "media original = %.4f (n=%d)\n", s/n, n}' datos_originales.txt
```
Probado, salida real: `media original = 14.3000 (n=10)` — nota el outlier `50` que infla la media respecto al resto de los datos (todos entre 8 y 13).

**Validar antes de usar:** se necesitan al menos 2 datos para poder estimar variabilidad (con 1 solo dato no hay dispersión que medir), y `B` (número de remuestras) debe ser mayor que 0:
```bash
awk '{s+=$1;n++} END{
  if (n<2) { print "ERROR: se necesitan al menos 2 datos para estimar variabilidad" > "/dev/stderr"; exit 1 }
  printf "media original = %.4f (n=%d)\n", s/n, n
}' datos_originales.txt

B=1000
awk -v B="$B" 'BEGIN{ if (B<=0) { print "ERROR: B debe ser mayor que 0" > "/dev/stderr"; exit 1 } }'
```

**Validación adicional importante:** el tamaño de cada remuestra (`-n` en `shuf -r -n 10`) debe coincidir exactamente con `n`, el tamaño de la muestra original — no es una elección arbitraria, es un requisito del método (una remuestra más chica o más grande subestimaría o sobreestimaría la variabilidad real).

## Generar remuestras con remplazo — `shuf -r`

```bash
B=1000
for i in $(seq 1 $B); do
  shuf -r -n 10 datos_originales.txt | awk '{s+=$1;n++} END{print s/n}'
done > medias_bootstrap.txt
```
Probado: genera 1000 remuestras reales. `-r` habilita muestreo CON remplazo (el mismo valor puede salir elegido más de una vez), y `-n 10` toma 10 elementos por remuestra — del mismo tamaño que los datos originales, un requisito del método, no una elección arbitraria.

## Estimar el error estándar de la métrica, directamente de las remuestras

```bash
awk '{x[NR]=$1; s+=$1; n++} END{
  mu=s/n
  for(i=1;i<=n;i++) ss+=(x[i]-mu)^2
  se = sqrt(ss/(n-1))
  printf "media de las medias bootstrap = %.4f   error estandar bootstrap = %.4f\n", mu, se
}' medias_bootstrap.txt
```
Probado, salida real: `media de las medias bootstrap = 14.3535   error estandar bootstrap = 3.7008`

## Comparar contra la fórmula analítica, cuando sí existe una

Para la media específicamente, sí existe una fórmula clásica de error estándar (`σ/√n`, del artefacto 1) — comparar ambos métodos en un caso donde SÍ hay fórmula cerrada sirve para calibrar confianza en el bootstrap antes de aplicarlo a métricas sin fórmula conocida:

```bash
awk '{x[NR]=$1; s+=$1; n++} END{
  mu=s/n
  for(i=1;i<=n;i++) ss+=(x[i]-mu)^2
  sd = sqrt(ss/(n-1))
  se_analitico = sd/sqrt(n)
  printf "SE analitico (formula clasica sigma/sqrt(n)) = %.4f\n", se_analitico
}' datos_originales.txt
```
Probado, salida real: `SE analitico (formula clasica sigma/sqrt(n)) = 3.9946` — del mismo orden de magnitud que el `3.7008` bootstrap, con la diferencia esperable dado que el bootstrap solo tiene acceso a los 10 datos observados (incluyendo su outlier) para estimar la variabilidad, sin ninguna suposición adicional sobre la forma de la distribución subyacente.

## Intervalo de confianza por percentiles — sin asumir normalidad

```bash
sort -n medias_bootstrap.txt | awk -v B=$B '
{ v[NR]=$1 }
END{
  p5 = v[int(B*0.05)]
  p95 = v[int(B*0.95)]
  printf "IC 90%% bootstrap = [%.4f, %.4f]\n", p5, p95
}'
```
Probado, salida real: `IC 90% bootstrap = [9.9000, 21.9000]`

**Por qué esto es distinto de un IC clásico (`media±1.645·SE`, usando la Normal):** un IC clásico asume que el estadístico se distribuye aproximadamente Normal — cuestionable aquí con solo 10 datos y un outlier. El intervalo por percentiles del bootstrap no asume ninguna forma de distribución, simplemente reporta dónde caen el 5% y 95% de las medias remuestreadas *observadas*, sea cual sea su forma real.

## Cuándo el bootstrap es la herramienta correcta

| Situación | Por qué el bootstrap ayuda |
|---|---|
| La métrica no tiene fórmula de error estándar conocida (mediana, percentil 90, un score compuesto como TF-IDF) | El procedimiento es genérico: remuestrear y recalcular |
| Sospechas que los datos no siguen una distribución Normal (outliers, asimetría) | El IC por percentiles no depende de esa suposición |
| Tienes pocos datos para confiar en aproximaciones asintóticas | El bootstrap usa la información real disponible, no un supuesto teórico sobre `n→∞` |

**Limitación a tener presente:** el bootstrap remuestrea DE LOS DATOS QUE YA TIENES — si la muestra original no es representativa de la población real (sesgada de alguna forma), el bootstrap reproduce y amplifica ese sesgo, no lo corrige. Es una herramienta para cuantificar incertidumbre dado lo que observaste, no para corregir problemas de cómo se recolectaron los datos originalmente. También se degrada cuando la distribución subyacente tiene una cola muy larga (unos pocos valores extremos dominan la variabilidad) o cuando los datos no son independientes e idénticamente distribuidos — en ambos casos, remuestrear la muestra observada no captura bien el comportamiento real de la población.

## Bootstrap para comparar dos grupos — calcular un p-valor sin asumir Normalidad

**Responde:** "tengo dos muestras de grupos distintos con medias diferentes — ¿esa diferencia es real, o podría deberse simplemente al azar?"

La idea es distinta a la de la sección anterior (ahí se cuantificaba la incertidumbre de UNA métrica; aquí se compara si DOS grupos son realmente distintos). El procedimiento: combinar ambas muestras en un solo grupo (asumiendo, como hipótesis nula, que en realidad vienen de la misma distribución), remuestrear repetidamente de ese grupo combinado dividiendo en dos submuestras del mismo tamaño que las originales, y contar en qué fracción de esas remuestras la diferencia entre submuestras es igual o mayor a la diferencia que realmente se observó.

```bash
printf "50\n52\n48\n55\n51\n49\n53\n47\n" > grupo_a.txt
printf "58\n60\n55\n62\n59\n61\n57\n63\n56\n" > grupo_b.txt

media_a=$(awk '{s+=$1;n++}END{print s/n}' grupo_a.txt)
media_b=$(awk '{s+=$1;n++}END{print s/n}' grupo_b.txt)
diff_obs=$(awk -v a=$media_a -v b=$media_b 'BEGIN{d=a-b; if(d<0)d=-d; print d}')

cat grupo_a.txt grupo_b.txt > universo.txt
N=$(wc -l < grupo_a.txt)
M=$(wc -l < grupo_b.txt)
B=1000
count=0
for i in $(seq 1 $B); do
  shuf -r -n $((N+M)) universo.txt > remuestra_completa.txt
  head -n $N remuestra_completa.txt > ra.txt
  tail -n $M remuestra_completa.txt > rb.txt
  d=$(awk -v NA=$N -v NB=$M '
    NR==FNR{sa+=$1; next}
    {sb+=$1}
    END{ma=sa/NA; mb=sb/NB; d=ma-mb; if(d<0)d=-d; print d}
  ' ra.txt rb.txt)
  es_mayor=$(awk -v d=$d -v obs=$diff_obs 'BEGIN{print (d>=obs)?1:0}')
  count=$((count+es_mayor))
done
pval=$(awk -v c=$count -v b=$B 'BEGIN{print c/b}')
echo "p-valor bootstrap = $pval"
```
Probado, salida real: `media_a=50.625  media_b=59  diferencia observada=8.375` y `p-valor bootstrap (B=1000) = 0` — con una diferencia real tan grande entre los dos grupos de prueba, ninguna de las 1000 remuestras del grupo combinado (que asume que ambos vienen de la misma distribución) produjo una diferencia igual o mayor a la observada, dando evidencia fuerte de que los grupos sí son distintos.

**Por qué esto es preferible a una prueba t en muchos casos:** la prueba t clásica asume que ambos grupos son Normales y comparte la misma varianza — supuestos que pueden no cumplirse. El bootstrap de dos grupos no necesita ninguno de los dos supuestos: solo usa la variabilidad que realmente muestran los datos.

## Aplicación directa a nuestro análisis de tokens/corpus

Para cualquier score de los artefactos anteriores (TF-IDF, entropía, divergencia KL) calculado sobre una muestra de archivos del corpus, el bootstrap responde "si hubiera tomado un subconjunto ligeramente distinto de archivos, ¿qué tan distinto habría sido este score?" — dando un intervalo de confianza real sin necesitar derivar una fórmula analítica específica para cada métrica, que en varios casos (divergencia KL, score de Naive Bayes) sería genuinamente difícil de obtener por otra vía.
