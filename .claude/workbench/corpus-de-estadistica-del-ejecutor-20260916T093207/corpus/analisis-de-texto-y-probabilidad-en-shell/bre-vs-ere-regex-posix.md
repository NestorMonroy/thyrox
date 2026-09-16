# BRE vs ERE: expresiones regulares en herramientas Unix

Artefacto dedicado — antes esta sección vivía condensada dentro de la guía de decisión general. Aquí está completa, con los ejemplos que faltaban y las clases de caracteres POSIX, que son parte del mismo tema y se usan igual en ambos sabores.

## Los dos sabores y dónde aparece cada uno por defecto

| Herramienta / modo | Sabor de regex |
|---|---|
| `grep` sin flags | BRE |
| `grep -E` | ERE |
| `grep -P` (solo GNU) | PCRE (Perl-compatible, no POSIX) |
| `sed` sin flags | BRE |
| `sed -E` (o `-r` en GNU) | ERE |
| `awk` en sus patrones `/regex/` | ERE, nativo, sin flag |
| `find -regex` (GNU) | Depende de `-regextype`, por defecto Emacs, no POSIX |

## BRE (Basic Regular Expressions)

```bash
grep "patron" archivo.txt
sed -n '/patron/p' archivo.txt
```

En BRE los metacaracteres `+`, `?`, `|`, `(`, `)` **no funcionan como tales** a menos que los escapes con `\`. Agrupar y repetir sí es posible, pero con sintaxis escapada:

```bash
# Agrupación + repetición en BRE puro: 2 a 3 repeticiones de "a"
printf "aaa\nab\nb\n" | grep '\(a\)\{2,3\}'
```
Probado, salida real: `aaa` (única línea que tiene 2 o más "a" consecutivas).

**Alternancia en BRE — el punto que más confunde:** `\|` funciona en GNU grep/sed, pero **no es POSIX estándar**. En un `sed`/`grep` estrictamente POSIX (por ejemplo, en sistemas mínimos tipo BusyBox), `\|` simplemente no existe — en BRE POSIX puro no hay forma de expresar alternancia en absoluto. Si necesitas alternancia y quieres portabilidad garantizada, usa ERE (`-E`), no BRE con extensiones GNU.

## ERE (Extended Regular Expressions)

```bash
grep -E "patron1|patron2" archivo.txt
```

Sin necesidad de escapar:

| Metacarácter | Significado | Ejemplo |
|---|---|---|
| `\|` | Alternancia | `gato|perro` |
| `+` | Una o más repeticiones | `a+` |
| `?` | Cero o una repetición | `colou?r` |
| `(...)` | Agrupación | `(ab)+` |
| `{n,m}` | Repetición con rango | `a{2,4}` |

Ejemplos probados uno por uno:

```bash
# Alternancia
printf "hay un error\ntodo bien\nwarning aqui\n" | grep -E "error|warning"
```
Salida real: `hay un error` y `warning aqui`.

```bash
# ? — cero o una repetición
printf "color\ncolour\ncolouur\n" | grep -E 'colou?r'
```
Salida real: `color` y `colour` (pero NO `colouur` — dos "u" seguidas no matchea `u?`, que permite como máximo una).

```bash
# Rango de repeticiones aislado: entre 3 y 5 dígitos, línea completa
printf "12\n123\n12345\n123456\n" | grep -E '^[0-9]{3,5}$'
```
Salida real: `123` y `12345` (se excluyen `12` por ser muy corto y `123456` por tener 6 dígitos, uno más del máximo permitido).

```bash
# Agrupación + repetición: aproximación simple a una IPv4 (no valida rangos 0-255)
grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" archivo.txt

# Sustitución con grupos capturados
sed -E 's/(patron1|patron2)/MATCH/' archivo.txt
```

## Clases de caracteres POSIX — portables donde `\d`, `\w`, `\s` no lo son

Un error común es usar `\d` (dígito) o `\w` (palabra) esperando que funcionen en `grep`/`sed`/`awk` — esas son sintaxis de PCRE (Perl), **no existen en BRE ni en ERE POSIX**. El equivalente portable son las clases entre corchetes dobles:

| Clase POSIX | Equivalente PCRE (no portable aquí) | Significado |
|---|---|---|
| `[[:digit:]]` | `\d` | Un dígito |
| `[[:alpha:]]` | `\w` (aproximado) | Una letra |
| `[[:alnum:]]` | — | Letra o dígito |
| `[[:space:]]` | `\s` | Espacio, tab, salto de línea |
| `[[:upper:]]` | — | Mayúscula |
| `[[:lower:]]` | — | Minúscula |
| `[[:punct:]]` | — | Puntuación |

Probado:
```bash
printf "abc123\nABC\n   \n" | grep -E '[[:alpha:]]+'
```
Salida real: `abc123` y `ABC` (ambas líneas tienen al menos una secuencia de letras; la línea de solo espacios no matchea).

```bash
sed 's/^[[:space:]]*//;s/[[:space:]]*$//' archivo.txt   # trim portable de espacios Y tabs, BRE puro
```

**Por qué usar `[[:space:]]` en vez de `[ \t]` como en ejemplos anteriores:** `[ \t]` asume que tu `sed` interpreta `\t` como tab dentro de un corchete, lo cual **no es universal** — algunas implementaciones de `sed` tratan `\t` literalmente como los caracteres `t` y minúscula. `[[:space:]]` es la forma garantizada por POSIX de referirse a cualquier espacio en blanco (incluye tab, salto de línea, retorno de carro), sin depender de si tu `sed` interpreta secuencias de escape dentro de corchetes.

## Anclas — se comportan igual en BRE y ERE

```bash
printf "hola\nholamundo\n" | grep '^hola$'
```
Salida real: solo `hola` — `^` y `$` anclan al inicio y fin de línea en ambos sabores, sin diferencias entre BRE y ERE.

## Backreferences — el límite que separa POSIX de PCRE

Los backreferences (`\1`, `\2`... **dentro del propio patrón de búsqueda**, no en el reemplazo de `sed`) **no existen en ERE POSIX**. Sí existen en BRE (`\(a\)\1` matchea "aa"), y en PCRE. Esto es contraintuitivo porque ERE es "más potente" que BRE en casi todo excepto en esto:

```bash
# Funciona en BRE (backreference dentro del patrón)
grep '\(a\)\1' archivo.txt   # matchea "aa"

# NO funciona igual en ERE — grep -E no soporta \1 como backreference de búsqueda
# Para eso se necesita grep -P (PCRE, solo GNU) o un lenguaje con regex completo
```

**Nota:** el reemplazo de `sed` (`s/patron/\1/`) sí usa `\1` para referirse a grupos capturados, tanto en BRE como en ERE — esa es una característica distinta del *reemplazo*, no del *patrón de búsqueda*, y no tiene la misma limitación.

## Resumen de decisión

| Necesitas... | Usa |
|---|---|
| Patrón simple sin agrupar ni alternar | BRE (default de `grep`/`sed`, sin flags) |
| Alternancia, `+`, `?`, `{n,m}`, agrupación, sin escapar nada | ERE (`grep -E`, `sed -E`) |
| Clases como dígito/letra/espacio, de forma portable | `[[:digit:]]`, `[[:alpha:]]`, `[[:space:]]` — funcionan igual en BRE y ERE |
| Backreference dentro del propio patrón de búsqueda | BRE, o `grep -P` si tu sistema tiene PCRE — ERE POSIX no lo soporta |
