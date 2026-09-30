# suitevoice

## Qué se lanzó

```
bun test src/packages/voice
```

## Qué se preguntaba

Si retirar los siete shims locales del paquete `voice` —dos modulos
restaurados a la fuente mas los tres bloques de `voice.ts`— rompe
alguna de las 27 aserciones que el paquete ya tenia en verde.

## Qué se recogió

**27 pass, 0 fail, 63 expect() calls** en 896 ms, sobre 2 archivos.
Ninguna cae.

*Metrica:* `bun test src/packages/voice`.
*Ciega a:* los modulos que la suite no ejercita — `voice.ts` entre
ellos, que no tiene test propio. Su verde lo da la sonda de conducta
del banco, no esta suite.
