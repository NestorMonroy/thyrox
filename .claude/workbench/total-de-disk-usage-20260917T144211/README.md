# El total de `disk-usage.sh`, y quien ensucia /tmp

Dos defectos de la familia `repo/`, medidos en el mismo pase.

## 1. El total contaba dos veces

`du --max-depth=N` imprime una linea por ANCESTRO cuyo tamaño YA contiene el de
sus descendientes. El guion sumaba todas las lineas.

Medido sobre /tmp antes del arreglo: la raiz daba **1179.8 MiB** y el guion
publicaba **«2029.3 MiB en total»** — la raiz mas sus hijos, o sea un 72 % de
mas sobre la cifra que se consulta justo cuando el disco se llena. Reconcilia
exacto: 1179.8 (raiz podada) = 330 (sueltos) + 849.5 (hijos), y 1179.8 + 849.5
= 2029.3.

Tras el arreglo, contra un `du -sk -x` independiente con la misma poda:
**1181.9 MiB** los dos, byte por byte.

## 2. El censo de fugas medía el literal

El instrumento anterior buscaba `trap ... rm -rf` en el fuente. Acusaba a **21**
suites. Medido por conducta con `src/repo/fixture_leak.sh`: **6**.
`tests/session/test-record-environment.sh` es el control — no declara `trap` y
retira su directorio en linea (`:67`, `:80`, `:88`).

Las seis fugan **solo** en el eje `confined` (`shared=0` en las seis), asi que
el desvio de `TMPDIR` de `tests/run.sh` ya las cierra. El grifo residual es la
invocacion directa por ruta.

## Mitades rojas persistidas

| Archivo | Rojo |
|---|---|
| `salidas/rojo-disk-usage-total.log` | 15 ok, 4 fallo (esperado 4.0, obtenido 8.0) |
| `salidas/rojo-fixture-leak.log` | 2 ok, 12 fallo (el guion no existia) |

## Controles de anulacion

- `THYROX_TEST_ROOT_IS_TOTAL=0` → el total deja de coincidir con `du -s`.
- `THYROX_TEST_REDIRECT_TMPDIR=0` → la fuga confinada se publica como 0.

## Lo que NO se borro

`sondas/` conserva lo que cada suite dejo: es la evidencia, no basura.
Y `/tmp/thyrox-leak-probe-7ATJWV` quedo de cuando este mismo test era el grifo
que denuncia, antes de reapuntar su caso 3.
