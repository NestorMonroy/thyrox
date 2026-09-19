# tscli3

## Qué se lanzó

```
bash src/verify/check-cli-typecheck.sh
```

## Qué se preguntaba

Si retirar las cinco copias planas duplicadas y reapuntar sus 613 imports
cambia el veredicto del typecheck. La pregunta nace de una afirmacion
**falsa** que este mismo pase habia publicado —«node_modules sigue con 0
enlaces de workspace, asi que el veredicto no cambia»—, medida sobre el
`node_modules` de la **raiz** cuando bun los enlaza por **paquete**.

## Qué se recogió

`__BG_EXIT__=0` en el marcador. Comparado contra `tscli2`, que midio el
arbol antes de la retirada:

| codigo | antes | ahora | delta |
|---|---|---|---|
| TS6142 (el compilador rehusa leer un `.tsx`) | 318 | 220 | **−98** |
| TS2307 (modulo no resuelto) | 322 | 268 | **−54** |
| TS2339 (propiedad inexistente) | 546 | 520 | **−26** |
| TS2322 | 156 | 152 | −4 |
| TS2345 | 528 | 526 | −2 |
| TS2305 | 492 | 494 | +2 |
| TS7016 (sin declaracion de tipos) | 2 | 10 | **+8** |
| **total** | **3942** | **3768** | **−174** |

Y los TS2307 que nombran a los cinco paquetes: **62 → 24**.

El paquete **sigue sin compilar** — 3768 errores no es cero, y el gate lo
dice. Lo que la medicion establece es que la retirada **no** fue neutra: el
eje de resolucion mejoro, contra lo que la afirmacion corregida decia.

*Metrica:* ocurrencias de `error TS\d+` en la salida del gate, agrupadas por
codigo, contra la corrida inmediatamente anterior del mismo comando.
*Ciega a:* la atribucion de cada delta a una causa concreta — 239 archivos
desaparecieron del universo, asi que parte del −98 de TS6142 es *menos
archivos que leer* y no *mejor resolucion*; separarlos exige medir por
archivo, no por codigo. El +8 de TS7016 es de modulos que antes no se
alcanzaban y ahora si.
