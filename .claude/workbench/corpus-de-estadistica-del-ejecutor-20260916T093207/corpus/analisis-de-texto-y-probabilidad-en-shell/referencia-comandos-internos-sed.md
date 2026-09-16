# Referencia completa de comandos internos de sed

Hoja standalone, equivalente a la de sintaxis interna de awk pero para `sed` — cubre los comandos de una letra que aparecen en cualquier script sed, incluido el "hold space", que es la pieza que permite operaciones entre líneas no consecutivas y que no se había explicado hasta ahora.

## Modelo mental de sed

`sed` lee el archivo línea por línea. Cada línea entra al **espacio de patrón** (pattern space), se le aplican los comandos, y al final del ciclo se imprime (salvo que uses `-n`). El **espacio de retención** (hold space) es un espacio adicional, separado, donde puedes guardar contenido de una línea para usarlo más adelante, en otra línea.

## Comandos de una letra más usados

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `s/patron/reemplazo/` | Sustituye (Substitute) | `sed 's/foo/bar/'` |
| `p` | Imprime el espacio de patrón (Print) | Normalmente combinado con `-n` |
| `d` | Borra el espacio de patrón y pasa a la siguiente línea, sin imprimir (Delete) | `sed '/patron/d'` |
| `i texto` | Inserta `texto` ANTES de la línea actual (Insert) | `sed '3i\texto nuevo'` |
| `a texto` | Agrega `texto` DESPUÉS de la línea actual (Append) | `sed '3a\texto nuevo'` |
| `c texto` | Reemplaza la línea completa por `texto` (Change) | `sed '/patron/c\reemplazo'` |
| `y/abc/xyz/` | Transliteración carácter por carácter (como `tr`) | `sed 'y/abc/xyz/'` cambia cada `a`→`x`, `b`→`y`, `c`→`z` |
| `q` | Termina sed inmediatamente (Quit), imprime la línea actual antes de salir | `sed '5q'` — imprime hasta la línea 5 y para |
| `Q` | Igual que `q` pero SIN imprimir la línea actual (extensión GNU) | `sed '5Q'` |
| `=` | Imprime el número de línea actual | `sed '='` |
| `l` | Imprime la línea mostrando caracteres no imprimibles explícitamente (list) | Útil para depurar tabs/espacios invisibles |

## Direcciones — a qué líneas aplica cada comando

| Dirección | Qué selecciona |
|---|---|
| `5` | Solo la línea 5 |
| `2,5` | Líneas 2 a 5 |
| `/patron/` | Cada línea que matchee el patrón |
| `/inicio/,/fin/` | Desde la primera línea que matchee `inicio` hasta la primera que matchee `fin`, inclusive |
| `2,$` | Desde la línea 2 hasta el final del archivo (`$` = última línea) |
| `0~2` | Desde la línea 0, cada 2 líneas (extensión GNU) — líneas pares |
| `1~3` | Desde la línea 1, cada 3 líneas — líneas 1, 4, 7... |
| `/patron/!` | Negación: todas las líneas que NO matcheen |

Probado — imprimir solo líneas pares con `~N` (extensión GNU):
```bash
printf "1\n2\n3\n4\n5\n6\n" | sed -n '0~2p'
```
Salida real: `2`, `4`, `6`.

## El espacio de retención (hold space) — operaciones entre líneas no consecutivas

| Comando | Qué hace |
|---|---|
| `h` | Copia el espacio de patrón AL espacio de retención (sobrescribe) |
| `H` | Agrega el espacio de patrón AL espacio de retención (sin sobrescribir, concatena con salto de línea) |
| `g` | Copia el espacio de retención AL espacio de patrón (sobrescribe) |
| `G` | Agrega el espacio de retención AL espacio de patrón |
| `x` | Intercambia el contenido de ambos espacios |

**Ejemplo clásico: invertir el orden de todas las líneas de un archivo (`tac` casero, sin usar el comando `tac`):**

```bash
sed -n '1!G;h;$p'
```

Probado:
```bash
printf "1\n2\n3\n" | sed -n '1!G;h;$p'
```
Salida real: `3`, `2`, `1`.

**Cómo funciona, paso a paso:** `1!G` significa "en toda línea que NO sea la 1, agrega el hold space al patron space" (así se va acumulando el historial invertido); `h` guarda el estado actual acumulado en el hold space para la siguiente iteración; `$p` imprime todo solo al llegar a la última línea (`$`), momento en que el hold space ya acumuló todas las líneas en orden inverso.

## Sustitución avanzada — flags de `s///`

| Flag después de `s/patron/reemplazo/` | Qué hace |
|---|---|
| `g` | Reemplaza TODAS las ocurrencias en la línea, no solo la primera |
| `N` (un número) | Reemplaza solo la ocurrencia número N |
| `Ng` | Reemplaza desde la ocurrencia N en adelante |
| `i` (o `I`) | Ignora mayúsculas/minúsculas al buscar (extensión GNU) |
| `p` | Imprime la línea si hubo sustitución (se combina con `-n` para imprimir SOLO las líneas modificadas) |
| `w archivo` | Escribe la línea (si hubo sustitución) a un archivo aparte |

```bash
# Solo mostrar las líneas donde realmente se sustituyó algo
sed -n 's/patron/reemplazo/p' archivo.txt
```

## Diferencia entre `d` y `D`, y entre `p` con o sin `-n`

- `d` borra TODO el espacio de patrón actual y pasa a la siguiente línea de entrada.
- `D` (mayúscula) borra solo hasta el primer salto de línea DENTRO del espacio de patrón (relevante solo cuando ya acumulaste varias líneas ahí con `N` o `H`), y reinicia el ciclo sin leer una nueva línea si aún queda contenido.
- `sed 'p'` (sin `-n`) imprime cada línea DOS veces: una por el comportamiento automático de imprimir al final del ciclo, y otra por el `p` explícito. Por eso casi siempre se usa `sed -n '...p'` — `-n` desactiva la impresión automática, dejando que solo el `p` explícito decida qué se muestra.

## Ejecutar varios comandos en secuencia

```bash
# Con punto y coma, todo en una línea
sed 's/foo/bar/; s/baz/qux/' archivo.txt

# Con -e, uno por flag (equivalente)
sed -e 's/foo/bar/' -e 's/baz/qux/' archivo.txt

# Con un archivo de script sed (para secuencias largas)
sed -f script.sed archivo.txt
```
