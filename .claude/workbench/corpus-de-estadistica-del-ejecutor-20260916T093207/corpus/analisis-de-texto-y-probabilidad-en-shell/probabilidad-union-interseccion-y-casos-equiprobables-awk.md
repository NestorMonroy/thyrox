# Unión, intersección y casos equiprobables (awk)

Sexto de 11 artefactos sobre probabilidad aplicada. Cubre las reglas más básicas de combinar eventos — la base sobre la que se construyen Bayes, independencia, y todo lo demás.

## Unión — `P(A∪B) = P(A) + P(B) - P(A∩B)`

**Responde:** "¿qué tan probable es que ocurra A, o B, o ambos a la vez?"

```bash
awk -v p_a=0.5 -v p_b=0.3 -v p_a_y_b=0.15 'BEGIN{
  printf "P(A union B) = %.4f\n", p_a + p_b - p_a_y_b
}'
```
Probado, salida real: `P(A union B) = 0.6500`

**Validar antes de usar:** `P(A)` y `P(B)` deben estar entre 0 y 1, y `P(A∩B)` no puede exceder ni a `P(A)` ni a `P(B)` (la intersección no puede ser más probable que uno de sus componentes):
```bash
awk -v p_a=0.5 -v p_b=0.3 -v p_a_y_b=0.15 'BEGIN{
  if (p_a<0||p_a>1||p_b<0||p_b>1) { print "ERROR: P(A) y P(B) deben estar entre 0 y 1" > "/dev/stderr"; exit 1 }
  if (p_a_y_b > p_a+0.0001 || p_a_y_b > p_b+0.0001) { print "ERROR: P(A y B) no puede exceder P(A) ni P(B)" > "/dev/stderr"; exit 1 }
}'
```

**Por qué se resta la intersección — verificado por simulación, no solo por argumento visual:**

```
P(A)=0.4993 P(B)=0.3018 P(AyB)=0.1509
P(A union B) simulado directo = 0.6502
P(A)+P(B)-P(AyB) calculado    = 0.6502
```
Probado generando 300,000 pares de eventos aleatorios y comparando dos formas de calcular `P(A∪B)`: contando directamente cuántas veces ocurrió "A o B" (`0.6502`), y calculando la fórmula `P(A)+P(B)-P(A∩B)` con las frecuencias observadas (`0.6502`) — coinciden exactamente. El motivo intuitivo: sumar `P(A)+P(B)` cuenta dos veces la región donde ambos ocurren a la vez; restar `P(A∩B)` corrige ese doble conteo — es la misma lógica de "inclusión-exclusión" en conteo de conjuntos, aplicada a probabilidades.

**Caso especial — eventos mutuamente excluyentes:**

```bash
awk -v p_a=0.5 -v p_b=0.3 'BEGIN{
  printf "P(A union B) si son mutuamente excluyentes = %.4f\n", p_a + p_b - 0
}'
```
Probado, salida real: `P(A union B) si son mutuamente excluyentes = 0.8000`

Cuando dos eventos no pueden ocurrir simultáneamente (`P(A∩B)=0`), la fórmula se simplifica a la suma directa — pero usar la suma directa sin verificar que sean mutuamente excluyentes sobreestima la unión cuando en realidad sí hay superposición.

**`P(A∪B)=P(A)+P(B)` para eventos mutuamente excluyentes es uno de los tres axiomas de Kolmogorov de la teoría de probabilidad** — no es un teorema que se derive de algo más básico, es un punto de partida que se acepta sin demostración. La fórmula general de unión (con la resta de la intersección) sí se construye sobre ese axioma, pero el caso mutuamente excluyente es el axioma mismo.

### Generalización a tres eventos — inclusión-exclusión completa

La misma idea se extiende a más eventos, alternando signos: sumar los individuales, restar los pares, sumar de vuelta el triple:

```
P(A∪B∪C) = P(A)+P(B)+P(C) - P(A∩B)-P(A∩C)-P(B∩C) + P(A∩B∩C)
```

```bash
awk -v pa=0.4 -v pb=0.3 -v pc=0.2 -v pab=0.12 -v pac=0.08 -v pbc=0.06 -v pabc=0.024 'BEGIN{
  printf "P(AuBuC) = %.4f\n", pa+pb+pc-pab-pac-pbc+pabc
}'
```
Probado, salida real: `P(AuBuC) = 0.6640`

**Por qué el patrón de signos se alterna (+,-,+):** cada par se resta porque fue contado dos veces al sumar los individuales; pero al restar los tres pares, la región donde los TRES eventos ocurren a la vez queda restada tres veces (una por cada par que la incluye) habiendo sido sumada tres veces originalmente — sumarla de vuelta una vez corrige el balance. Este patrón de inclusión-exclusión continúa alternando signos si se generaliza a 4 o más eventos.

## Intersección para eventos independientes — `P(A∩B) = P(A)·P(B)`

**Responde:** "si sé que A y B no se influyen entre sí, ¿qué tan probable es que ocurran ambos a la vez?"

```bash
awk -v p_a=0.5 -v p_b=0.3 'BEGIN{ printf "P(A y B) = %.4f (si son independientes)\n", p_a*p_b }'
```
Probado, salida real: `P(A y B) = 0.1500 (si son independientes)`

**La fórmula se deriva directamente de la definición de independencia y de probabilidad condicional.** Independencia significa `P(A|B)=P(A)` (artefacto 1); sustituyendo en la definición de condicional `P(A|B)=P(A∩B)/P(B)`, se obtiene `P(A)=P(A∩B)/P(B)`, y despejando: `P(A∩B)=P(A)·P(B)`.

```bash
awk -v p_a=0.5 -v p_b=0.3 'BEGIN{
  p_a_dado_b = p_a
  p_a_y_b_derivado = p_a_dado_b * p_b
  p_a_y_b_directo = p_a*p_b
  printf "P(A y B) via P(A|B)*P(B) = %.4f    P(A)*P(B) directo = %.4f\n", p_a_y_b_derivado, p_a_y_b_directo
}'
```
Salida real: `P(A y B) via P(A|B)*P(B) = 0.1500    P(A)*P(B) directo = 0.1500` — ambos caminos coinciden.

**La fórmula solo es válida si `A` y `B` son independientes.** Si no lo son, `P(A∩B)` no se puede derivar solo de `P(A)` y `P(B)` — hace falta la regla de la cadena, que sigue en la próxima sección.

## Intersección para eventos dependientes — la regla de la cadena

**Responde:** "si dos eventos SÍ se influyen entre sí, ¿cómo calculo la probabilidad de que ocurran ambos?"

`P(A∩B) = P(A|B)·P(B)`, equivalentemente `P(A∩B) = P(B|A)·P(A)` — la probabilidad de observar ambos eventos es la probabilidad de observar uno, multiplicada por la probabilidad del otro dado que el primero ya ocurrió.

```bash
awk -v p_e_dado_f=0.6 -v p_f=0.3 'BEGIN{
  printf "P(E y F) = %.4f\n", p_e_dado_f*p_f
}'
```
Salida real: `P(E y F) = 0.1800`

**Generalización a `n` eventos:**
```
P(E₁∩E₂∩...∩Eₙ) = P(E₁)·P(E₂|E₁)·P(E₃|E₁∩E₂)·...·P(Eₙ|E₁∩...∩Eₙ₋₁)
```

```bash
awk -v p_e1=0.5 -v p_e2_dado_e1=0.4 -v p_e3_dado_e1e2=0.7 'BEGIN{
  printf "P(E1 y E2 y E3) = %.4f\n", p_e1*p_e2_dado_e1*p_e3_dado_e1e2
}'
```
Salida real: `P(E1 y E2 y E3) = 0.1400`

Cada factor condiciona en todos los eventos anteriores de la cadena — la fórmula de independencia (`P(A)·P(B)`) es el caso particular donde ningún evento cambia la probabilidad del siguiente, así que cada término condicional colapsa a su probabilidad marginal.

### Ley de De Morgan — el complemento de una unión es la intersección de los complementos

`P(no(A∪B)) = P(noA ∩ noB)` — verificado numéricamente cuando `A` y `B` son independientes:

```bash
awk -v pa=0.5 -v pb=0.3 -v pab=0.15 'BEGIN{
  p_union = pa+pb-pab
  p_no_union = 1-p_union
  p_no_a = 1-pa
  p_no_b = 1-pb
  p_no_a_y_no_b = p_no_a*p_no_b
  printf "P(no(AuB)) = %.4f   P(noA interseccion noB) = %.4f (deben coincidir si son independientes)\n", p_no_union, p_no_a_y_no_b
}'
```
Probado, salida real: `P(no(AuB)) = 0.3500   P(noA interseccion noB) = 0.3500` — coinciden exactamente. Esto es útil en la práctica porque a veces es más fácil calcular "la probabilidad de que NINGUNO de los dos ocurra" (intersección de complementos) que "el complemento de que al menos uno ocurra" directamente.

## Probabilidad clásica (casos equiprobables) — `P(evento) = casos favorables / casos totales`

**Responde:** "si cada resultado posible es igual de probable que cualquier otro, ¿qué fracción de todos los resultados corresponde al evento que me interesa?"

```bash
awk -v favorables=13 -v totales=52 'BEGIN{ printf "P(evento) = %.4f (%d/%d)\n", favorables/totales, favorables, totales }'
```
Probado, salida real: `P(evento) = 0.2500 (13/52)`

**Validar antes de usar:** `totales` debe ser mayor que 0, y `favorables` debe estar entre 0 y `totales` (no puede haber más casos favorables que casos totales):
```bash
awk -v favorables=13 -v totales=52 'BEGIN{
  if (totales<=0) { print "ERROR: totales debe ser mayor que 0" > "/dev/stderr"; exit 1 }
  if (favorables<0 || favorables>totales) { print "ERROR: favorables debe estar entre 0 y totales" > "/dev/stderr"; exit 1 }
}'
```

**Cuándo aplica y cuándo NO:** solo es válida cuando cada resultado individual tiene exactamente la misma probabilidad (un dado justo, cartas bien mezcladas). Si los resultados no son equiprobables (un dado cargado, o documentos de tamaños muy distintos en un corpus), esta fórmula da un resultado incorrecto — hay que usar probabilidades ponderadas.

## Complemento — `P(no A) = 1 - P(A)`

**Responde:** "¿qué tan probable es que A NO ocurra?"

```bash
awk -v p_a=0.3 'BEGIN{ printf "P(no A) = %.4f\n", 1-p_a }'
```
Probado, salida real: `P(no A) = 0.7000`

Útil cuando calcular directamente "algo NO pase" es más fácil que calcular que sí pase (ejemplo clásico: "al menos un éxito en N intentos" es más fácil como `1 - P(ningún éxito)`).

## Verificar que un conjunto de probabilidades forme una partición válida

**Responde:** "¿estos eventos realmente cubren todo el espacio muestral sin superponerse, o hay un error en cómo los definí?"

```bash
awk 'BEGIN{
  split("0.2 0.5 0.3", p, " ")
  for(i=1;i<=3;i++) s+=p[i]
  if (s>0.999 && s<1.001) print "particion valida, suma =", s
  else print "ADVERTENCIA: no suma 1, suma =", s
}'
```
Probado, salida real: `particion valida, suma = 1`

**Por qué la tolerancia en vez de comparar contra `1` exacto:** igual que en artefactos anteriores, los datos reales rara vez dan una suma exactamente `1.0` por errores de redondeo acumulados.

## Aplicación directa a nuestro análisis de tokens/corpus

Si tienes `P(A)` y `P(B)` de que un documento contenga los tokens A y B, la unión te dice qué fracción de documentos contiene AL MENOS UNO de los dos — útil para estimar cobertura combinada antes de correr una búsqueda real sobre todo el corpus. La generalización a tres eventos permite lo mismo con tres términos de búsqueda a la vez, sin tener que ejecutar la búsqueda combinada directamente sobre el corpus.

## Resumen: cuándo usar cada una

| Necesitas... | Fórmula |
|---|---|
| Probabilidad de que ocurra A o B (o ambos) | Unión: `P(A)+P(B)-P(A∩B)` |
| Lo mismo con 3 eventos | Inclusión-exclusión: alternar signos sumando individuales, restando pares, sumando el triple |
| Probabilidad de que ocurran A y B a la vez, sabiendo que son independientes | Intersección independiente: `P(A)·P(B)` |
| Probabilidad de que NINGUNO de los dos ocurra | De Morgan: `P(noA)·P(noB)` si son independientes |
| Probabilidad de un resultado cuando todos son igual de probables | Clásica: favorables/totales |
| Probabilidad de que algo NO ocurra | Complemento: `1-P(A)` |
