# El alcance de la suite se deriva, no se elige

`bash tests/run.sh` corre **al arrancar la sesión**, para medir el estado de
partida. Entre commits no: ahí se corre el **subconjunto derivado** de los
símbolos tocados, y el comando que lo deriva va citado junto al resultado.

```bash
grep -rlE "<Simbolo>|<modulo>" --include=*.ts --include=*.py tests/ \
    | sed 's|/[^/]*$||' | sort | uniq -c
```

La suite entera vuelve a ser obligatoria en tres casos, y sólo en tres: el
cambio toca un mecanismo **transversal**, se cierra un bloque o se abre un PR,
o el ejecutor la pide.

## Por qué esta regla vive aquí

Medido (ERR-069): el protocolo existía en **3 de los 5 consumidores** y en
**ninguna** regla de THYROX, que es su productor. Una sesión con sólo este árbol
en alcance nunca lo veía. La misma forma que ERR-063 — una directiva que sólo
vivía donde no gobierna.

## Una suite entera sin baseline previo no atribuye

Medido en el mismo episodio: 445 s contra 0.25 s del derivado, y **cero** de sus
16 `(fail)` nombraba ninguno de los cuatro símbolos tocados. Correrla dos veces
después del cambio prueba determinismo, no atribución.

Lo que atribuye es el **control de anulación** del derivado: se retira la causa
y tienen que caer exactamente las aserciones que dependen de ella. En aquel
episodio cayeron 5 de 9 en TypeScript y ninguna de las 7 de Python — ese
contraste es la medición, y la suite entera no la contiene.
