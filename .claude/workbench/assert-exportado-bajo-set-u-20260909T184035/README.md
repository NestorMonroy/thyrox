# assert-exportado-bajo-set-u

## El encargo

Salió de tropezar con él: al correr una suite desde una sesión que había
sourceado `assert.sh` para usar `thyrox_safe_sed`, la suite murió antes de su
primera línea.

```
environment: line 2: _THYROX_VERDE: unbound variable
```

## La premisa, corregida al medir

La premisa cómoda era «cosa del entorno del contenedor». Es falsa: es un
defecto de la biblioteca, y su control declarado no podía verlo.

`assert.sh` hace `export -f` de cinco funciones cuyos cuerpos leen estado que
**no se exporta**: las tres variables de color (9 referencias) y los dos
contadores (5). Un hijo hereda las funciones y no el estado. Mientras el hijo
no lleve `set -u`, la variable ausente expande a vacío y no pasa nada — que es
exactamente el caso que el control 4 de `test-assert-sh.sh` ejercita
(`bash -c 'thyrox_check ... x x'`, sin `set -u`).

Pero **toda suite de este árbol arranca con `set -uo pipefail`**. Así que el
contrato «la función sobrevive a un subshell» se cumplía sólo en el caso que
no se usa.

Es el sub-patrón D de `metrica-decide-la-conclusion.md` dentro del control: un
verde que no distingue «el export funciona» de «el hijo no pregunta».

## Las piezas

| archivo | qué hace |
|---|---|
| `outputs/red-child-dies.out.txt` | el estado antes: el hijo muere en la línea 2 del entorno, EXIT=1 |
| `outputs/anulacion-sin-default-de-color.out.txt` | retirado el default de los tres colores: muere igual, en la **línea 2** |
| `outputs/anulacion-sin-default-de-contador.out.txt` | retirado el default de los dos contadores: imprime el primer `ok` y muere en la **línea 3** |
| `outputs/green-child-runs.out.txt` | con las dos mitades: 8 casos, 8 ok, EXIT=0 |

Las dos anulaciones discriminan y además ordenan: sin el color se cae en la
primera llamada, sin el contador una línea más tarde. Ninguna de las dos mitades
sobra.

## Por qué el default y no exportar el estado

Exportar los colores metería en el hijo la decisión de `[[ -t 1 ]]` que tomó el
padre: un hijo con la salida a una tubería heredaría códigos ANSI que no
puede usar. Y exportar los contadores sería peor: un incremento en el hijo no
vuelve al padre — son procesos—, así que la cifra que el padre publicara sería
falsa. El default deja que cada shell cuente lo suyo y que el color lo decida
quien escribe.

## Los resultados

*Métrica:* exit code de la suite hija y la primera línea de su salida, bajo un
padre que sourcea la biblioteca.

*Ciega a:* un hijo sin `set -u`, donde nunca hubo defecto; a si exportar el
estado tendría sentido, que no se midió porque el reparto por proceso lo
decide; y a las otras 86 suites de shell del árbol — aquí sólo se midieron las
cuatro de `tests/lib/`, y de ésas `test-script-deprecated.sh` sigue en 25 ok ·
2 fallas con el cambio **y sin él** (preexistentes, medidas contra la copia).
