# Resultados, contra las predicciones escritas antes

| # | Prediccion | Resultado | Veredicto |
|---|---|---|---|
| 1 | corregido D1, `permission` cae a ~0 | **0** | confirmada |
| 2 | corregido D2, los 5 AUSENTE existen y `config` cae a ~0 | los 5 existen; **0** | confirmada |
| 3 | el total aterriza en ~739 | **739** = 416 propio de cli + 323 de agent | confirmada a la unidad |
| 4 | el gate atrapa los dos HOY, antes de arreglar nada | **FALSIFICADA a medias** | ver abajo |

## La prediccion 4, falsificada — y lo que destapo

Se predijo que el gate de verificacion de destino publicaria INERTE para
`permission` y para `config` corrido contra el arbol tal cual. Medido:

```
--- permission: repoint_manifest -> True
--- config: repoint_manifest -> True
```

Las dos razones son distintas, y solo una es un defecto:

- **`permission` no rehusa porque el arreglo lo CORRIGE.** `resolve_declaration`
  no deriva la ruta: la busca en el disco, y `dist/src/permission.d.ts` existe.
  Rehusar habria sido peor — el repunte correcto estaba disponible.
- **`config` no rehusaba porque el instrumento NO DISCRIMINABA.** La primera
  version comprobaba un comodin con `any(glob)`: **una** coincidencia bastaba,
  y el defecto que se queria ver era justo que ALGUNAS expansiones faltaran.
  Verde con 17 de 22 presentes. Es el sub-patron D con este gate como sujeto,
  cometido en el gate escrito para atajarlo.

Corregido a exigir que **todas** las expansiones del `default` tengan su
declaracion, el gate publica:

```
config: repunte INERTE — 2 destino(s) de types no existen:
  ./* -> ./dist/*.d.ts
  ./*.js -> ./dist/*.d.ts
```

## Control de anulacion

| Se retira | Caen | Ni una mas |
|---|---|---|
| el comodin de raiz declara el paquete entero | 1 asercion | si |
| `resolve_declaration` mira el disco (vuelve a derivar) | 3 aserciones | si |

## Efecto acumulado, medido

| Estado | typecheck del consumidor |
|---|---|
| antes de emitir nada | 2821 |
| repunte con la declaracion aplanada (inerte) | 2656 |
| repunte con el rootDir preservado | 974 |
| **con D1 y D2 cerrados** | **739** |

De los 739 que quedan, **ninguno es de un paquete repuntado**: 416 son de cli
y 323 de `agent`, que rehusa emitir porque escapa a `src/paths`, `src/store` y
`src/task` — fuera de su propio paquete, irreparable por ensanche.

## Segunda vuelta: el propio de `agent` +1102, y su hipotesis falsificada

Los dos baselines congelados (el pre-barrido NO se sobreescribio) dan el
contraste que `predicciones.md` anticipaba — «el own de algun paquete CAMBIA»:

    repl            2052 ->  2051   (-1)
    agent            463 ->  1565   (+1102)
    config           517 ->   831   (+314)
    tool-registry   1035 ->  1036   (+1)

La hipotesis con que se abrio H-THYROX-151 fue **«la declaracion no lleva lo
que el compilador infirio de la fuente»**. Se midio y es FALSA. Histograma de
codigos TS de los propios de `agent`:

    573 TS2307   'bun:test' 158 · 'node:path' 89 · 'node:fs' 78
    533 TS2591   'process' / 'Buffer'
    152 TS2339

**151 de los 158 `bun:test` viven en un directorio `__tests__`.** La causa es
el arreglo del comodin de raiz: declara el paquete entero como superficie y
arrastra sus tests, que solo compilan con `@types/bun`. Cerrado con
`TEST_EXCLUDE`.

Y eso destapo dos ceguerass de la verificacion que el INERTE de `config`
habia tapado — **acerto por otra razon**: su `glob` no cruzaba `/` (la
especificacion de `exports` si), asi que los 5 de `config/plugin/` nunca se
midieron; y `dist/` entraba en el glob de fuentes porque un `.d.ts` termina
en `.ts`.
