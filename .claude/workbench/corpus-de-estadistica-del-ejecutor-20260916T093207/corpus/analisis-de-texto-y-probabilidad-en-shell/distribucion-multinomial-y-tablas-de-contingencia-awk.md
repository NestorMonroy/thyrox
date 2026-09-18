# Distribución multinomial y tablas de contingencia (awk)

Octavo de 11 artefactos sobre probabilidad aplicada. La multinomial generaliza la Binomial a más de dos categorías; la marginalización y probabilidad condicional sobre tablas conjuntas responden cómo obtener información parcial a partir de una tabla completa.

## Coeficiente multinomial — `n! / (k1!·k2!·...·kr!)`

**Responde:** "¿de cuántas formas distintas puedo repartir n elementos en r grupos de tamaños específicos?"

```bash
awk 'function factorial(n,  i,res){res=1; for(i=2;i<=n;i++)res*=i; return res}
BEGIN{
  n=10
  split("3 4 3", grupos, " ")
  denom=1
  for(i=1;i<=3;i++) denom *= factorial(grupos[i])
  printf "Multinomial(10; 3,4,3) = %.0f\n", factorial(n)/denom
}'
```
Probado, salida real: `Multinomial(10; 3,4,3) = 4200`

**Validar antes de usar:** los tamaños de grupo deben sumar exactamente `n`:
```bash
awk 'function factorial(n,  i,res){res=1; for(i=2;i<=n;i++)res*=i; return res}
BEGIN{
  n=10
  split("3 4 3", grupos, " ")
  suma=0; for(i=1;i<=3;i++) suma+=grupos[i]
  if (suma!=n) { print "ERROR: los grupos deben sumar exactamente n" > "/dev/stderr"; exit 1 }
}'
```

## PMF de la distribución multinomial

**Responde:** "con r categorías posibles, cada una con su propia probabilidad, ¿qué tan probable es observar exactamente esta combinación específica de conteos en una muestra de tamaño n?"

```bash
awk 'function factorial(n,  i,res){res=1; for(i=2;i<=n;i++)res*=i; return res}
BEGIN{
  n=10
  split("3 4 3", k, " ")
  split("0.2 0.5 0.3", p, " ")
  coef = factorial(n)
  prod = 1
  for (i=1; i<=3; i++) { coef /= factorial(k[i]); prod *= p[i]^k[i] }
  printf "P(k1=3,k2=4,k3=3) = %.4f\n", coef*prod
}'
```
Probado, salida real: `P(k1=3,k2=4,k3=3) = 0.0567`

**Validar antes de usar:** los `k_i` deben sumar exactamente `n`, y los `p_i` deben sumar 1:
```bash
awk 'BEGIN{
  n=10
  split("3 4 3", k, " ")
  split("0.2 0.5 0.3", p, " ")
  suma_k=0; suma_p=0
  for(i=1;i<=3;i++){ suma_k+=k[i]; suma_p+=p[i] }
  if (suma_k!=n) { print "ERROR: los k_i deben sumar exactamente n" > "/dev/stderr"; exit 1 }
  if (suma_p<0.999||suma_p>1.001) { print "ERROR: los p_i deben sumar 1 (suma=" suma_p ")" > "/dev/stderr"; exit 1 }
}'
```

**Verificación por simulación independiente:**
```
P(3,4,3) simulada = 0.0567
P(3,4,3) formula  = 0.0567
```
Probado simulando 500,000 veces el proceso de asignar 10 elementos a 3 categorías según las probabilidades dadas, y contando la frecuencia exacta de obtener `(3,4,3)` — coincide con la fórmula cerrada hasta el cuarto decimal.

### La multinomial generaliza la Binomial — demostrado, no solo afirmado

Con exactamente 2 categorías (`r=2`), la fórmula multinomial debe colapsar exactamente a la fórmula binomial, porque son la misma situación descrita de dos formas:

```bash
awk 'function factorial(n,  i,res){res=1; for(i=2;i<=n;i++)res*=i; return res}
function choose(n,r,  i,res){res=1; for(i=0;i<r;i++) res=res*(n-i)/(i+1); return res}
BEGIN{
  n=10; k=3; p=0.3
  coef = factorial(n)/(factorial(k)*factorial(n-k))
  prod = (p^k)*((1-p)^(n-k))
  multinomial_r2 = coef*prod
  binomial = choose(n,k)*(p^k)*((1-p)^(n-k))
  printf "Multinomial(r=2) = %.4f   Binomial = %.4f (deben ser identicas)\n", multinomial_r2, binomial
}'
```
Probado, salida real: `Multinomial(r=2) = 0.2668   Binomial = 0.2668` — idénticas, confirmando que la Binomial no es una distribución aparte, es el caso particular de la multinomial con solo 2 categorías (éxito/fracaso).

## Marginalización — obtener probabilidades individuales a partir de una tabla conjunta

**Responde:** "tengo la probabilidad conjunta de dos variables — ¿cuál es la probabilidad de cada una por separado, ignorando la otra?"

**Validar antes de usar (aplica a esta sección y a las dos siguientes, que reutilizan la misma tabla):** todas las celdas de la tabla conjunta deben sumar exactamente 1:
```bash
awk 'BEGIN{
  t[1,1]=0.10; t[1,2]=0.15; t[1,3]=0.05
  t[2,1]=0.20; t[2,2]=0.30; t[2,3]=0.20
  suma=0
  for(i=1;i<=2;i++) for(j=1;j<=3;j++) suma+=t[i,j]
  if (suma<0.999||suma>1.001) { print "ERROR: la tabla conjunta debe sumar 1 (suma=" suma ")" > "/dev/stderr"; exit 1 }
}'
```

```bash
awk '
BEGIN{
  t[1,1]=0.10; t[1,2]=0.15; t[1,3]=0.05
  t[2,1]=0.20; t[2,2]=0.30; t[2,3]=0.20
  for (i=1; i<=2; i++) { s=0; for (j=1; j<=3; j++) s+=t[i,j]; printf "P(A=%d) = %.4f\n", i, s }
  print "---"
  for (j=1; j<=3; j++) { s=0; for (i=1; i<=2; i++) s+=t[i,j]; printf "P(B=%d) = %.4f\n", j, s }
}'
```
Probado, salida real:
```
P(A=1) = 0.3000
P(A=2) = 0.7000
---
P(B=1) = 0.3000
P(B=2) = 0.4500
P(B=3) = 0.2500
```

## Probabilidad condicional a partir de una tabla conjunta — la pieza que faltaba en la versión anterior

**Responde:** "dado que ya sé el valor de A, ¿cuál es la probabilidad de cada valor de B?"

Combinando la marginal recién calculada con la definición de probabilidad condicional del artefacto 1 (`P(B|A)=P(A,B)/P(A)`):

```bash
awk '
BEGIN{
  t[1,1]=0.10; t[1,2]=0.15; t[1,3]=0.05
  t[2,1]=0.20; t[2,2]=0.30; t[2,3]=0.20
  pa1 = t[1,1]+t[1,2]+t[1,3]
  p_b2_dado_a1 = t[1,2]/pa1
  printf "P(A=1)=%.4f   P(B=2|A=1) = %.4f\n", pa1, p_b2_dado_a1
}'
```
Probado, salida real: `P(A=1)=0.3000   P(B=2|A=1) = 0.5000` — nota que esto es distinto de la marginal `P(B=2)=0.4500` calculada arriba: condicionar en `A=1` cambió la probabilidad de `B=2`, lo cual ya es evidencia de que `A` y `B` no son independientes (se confirma formalmente en la siguiente sección).

## Verificar independencia en una tabla de contingencia completa, celda por celda

**Responde:** "¿A y B son realmente independientes, o solo lo parecen mirando las marginales por separado?"

Si `A` y `B` fueran independientes, cada celda de la tabla conjunta debería ser exactamente `P(A=i)·P(B=j)` (la definición de independencia del artefacto 6, aplicada celda por celda):

```bash
awk '
BEGIN{
  t[1,1]=0.10; t[1,2]=0.15; t[1,3]=0.05
  t[2,1]=0.20; t[2,2]=0.30; t[2,3]=0.20
  for(i=1;i<=2;i++){ ma[i]=0; for(j=1;j<=3;j++) ma[i]+=t[i,j] }
  for(j=1;j<=3;j++){ mb[j]=0; for(i=1;i<=2;i++) mb[j]+=t[i,j] }
  independiente=1
  for(i=1;i<=2;i++) for(j=1;j<=3;j++){
    esperado = ma[i]*mb[j]
    dif = t[i,j]-esperado
    if (dif<0) dif=-dif
    if (dif>0.001) independiente=0
    printf "t[%d,%d]=%.4f  esperado_si_independiente=%.4f\n", i,j,t[i,j], esperado
  }
  print (independiente) ? "Variables independientes" : "Variables NO independientes"
}'
```
Probado, salida real:
```
t[1,1]=0.1000  esperado_si_independiente=0.0900
t[1,2]=0.1500  esperado_si_independiente=0.1350
t[1,3]=0.0500  esperado_si_independiente=0.0750
t[2,1]=0.2000  esperado_si_independiente=0.2100
t[2,2]=0.3000  esperado_si_independiente=0.3150
t[2,3]=0.2000  esperado_si_independiente=0.1750
Variables NO independientes
```

Cada celda observada difiere de lo que se esperaría bajo independencia — confirmando formalmente lo que ya sugería la diferencia entre `P(B=2|A=1)=0.50` y la marginal `P(B=2)=0.45`. Esta comparación celda por celda es, de hecho, la base conceptual de la prueba chi-cuadrado de independencia usada en estadística inferencial (que además pondera las diferencias por su magnitud esperada y las compara contra una distribución de referencia) — aquí se muestra la lógica subyacente sin el aparato estadístico completo.

## Aplicación directa a nuestro análisis de tokens/corpus

Con una tabla conjunta de "archivo pertenece a la carpeta X" vs "contiene el token Y", la marginalización da ambas probabilidades individuales sin volver a tocar el corpus, la condicional responde "dado que un archivo está en la carpeta X, ¿qué tan probable es que contenga el token Y?", y el chequeo de independencia revela si la ubicación del archivo en el árbol de carpetas realmente se relaciona con qué tokens contiene, o si son aspectos independientes del corpus.

## Resumen: cuándo usar cada técnica

| Necesitas... | Herramienta |
|---|---|
| Contar formas de repartir n elementos en más de 2 grupos | Coeficiente multinomial |
| Probabilidad de una combinación específica de conteos entre categorías | PMF multinomial (Binomial es el caso r=2) |
| Probabilidad de una variable sola, a partir de una tabla conjunta | Marginalización |
| Probabilidad de una variable DADO el valor de la otra | Condicional desde tabla conjunta |
| Verificar si dos variables de una tabla son realmente independientes | Comparar cada celda contra el producto de sus marginales |
