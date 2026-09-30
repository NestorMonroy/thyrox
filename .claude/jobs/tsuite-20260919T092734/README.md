# tsuite

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun test tests/ 2>&1 | tail -40; echo EXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

¿Regresa la suite de TypeScript tras el cambio de manifiesto y los
importadores editados?

## Qué se recogió

**595 pass, 4 skip, 152 fail, 96 errors** sobre 751 tests en 137 archivos.

**La cifra no atribuye nada**, y se registra declarándolo: no hay baseline
del mismo instrumento tomada antes del cambio, así que estos 152 no se
pueden separar en «los que ya estaban» y «los que introduje». Es
exactamente lo que `alcance-de-la-suite.md` advierte — una suite entera sin
baseline previo prueba determinismo, no atribución.

Lo que sí atribuye es el subconjunto derivado y el delta de typecheck, que
viven en `tsmp` y `tsrev`. El subconjunto derivado de los símbolos tocados
da **un solo directorio** (`tests/unit/utils`).

*Metrica:* `bun test tests/`, conteo de su línea de resumen.
*Ciega a:* la atribución, por falta de baseline pareada; y a un test que
falla por contención con otro proceso de la sesión, que esta corrida no
aísla.
