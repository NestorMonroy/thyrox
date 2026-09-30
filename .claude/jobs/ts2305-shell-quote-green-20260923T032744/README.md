# ts2305-shell-quote-green

## Qué se lanzó

`bunx tsc --noEmit` mediante `bin/thyrox-bg`, recogido por `bin/wait-jobs`.

## Qué se preguntaba

¿El runtime seguro de shellQuote elimina sus dos grafías de aristas TS2305?

## Qué se recogió

4 879 diagnósticos en 924 archivos, TS2305=464 y TS2307=19; cero aristas de
`@thyrox/shell/bash/shellQuote.js` y `./shellQuote.js`. El exit global es 2.
