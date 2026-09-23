# perplexity-bits-per-byte

## El encargo

> considera, documenta e implementa lo siguiente el objetivo es 0 errores

Un brief sobre perplexity, su normalizacion a bits por byte y speculative
decoding, con sus salidas reales.

## La premisa, si se corrigio al primer comando

Speculative decoding YA existia: `src/measurement/rejection_sampling.py`
implementa la regla `min(1, q/p)`, el residuo y el caso `p == q`, con una suite
que reproduce el brief (23 + 2 aserciones en verde). Lo que faltaba era la
perplexity y la parte del brief sobre la VELOCIDAD: la tasa de aceptacion y los
tokens por llamada.

Dos cosas del brief que el control fija:
- su ejemplo de tokenizadores muestra mas de lo que dice: B tiene MENOR
  perplexity (1.1325 contra 1.4286) pero asigna MENOS probabilidad al texto
  (0.6885 contra 0.7). Por bytes el orden se invierte y coincide con la
  probabilidad total;
- `lib/compressibility.py` ya publica un `bits_per_byte` que es la entropia de
  orden cero del DATO. El de aqui es entropia cruzada de UN MODELO: mismo
  rotulo, otra cantidad. Por eso se llama `model_bits_per_byte`.

## Las piezas

| archivo | que hace |
|---|---|
| `src/measurement/perplexity.py` | validacion `(0, 1]`, PPL por logaritmos, PPL por producto (rehusa al subdesbordar), bits por token y por byte |
| `src/measurement/rejection_sampling.py` | `acceptance_rate` (`sum(min(p, q))`) y `expected_tokens_per_call` |
| `outputs/annul-log-path.txt` | PPL por producto: cae SOLO el caso de subdesbordamiento |
| `outputs/annul-byte-normalization.txt` | normalizar por tokens: caen la inversion del orden y la equivalencia |
| `outputs/speedup-annul-weighting.txt` | promedio sin ponderar: caen el valor exacto (0.55) y el empirico |
| `outputs/speedup-annul-formula.txt` | `alpha * gamma + 1`: caen el valor del brief y la simulacion |

## Los resultados

La formula ingenua de tokens por llamada acierta los DOS casos limite (con
`alpha` 1 da `gamma + 1` y con `alpha` 0 da 1): esos casos solos no
discriminan. Solo el valor intermedio y la simulacion con `sample` lo hacen.

*Metrica:* los valores del brief redondeados a 4 decimales, y fracciones
empiricas de `sample` con semilla fija.
*Ciega a:* un modelo real, cuyas aceptaciones no son independientes entre
posiciones; y la calibracion del modelo, de la que depende que su perplexity
signifique algo.
