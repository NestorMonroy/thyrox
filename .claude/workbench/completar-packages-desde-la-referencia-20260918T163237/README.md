# completar-packages-desde-la-referencia

## El encargo

<!-- verbatim, sin parafrasear -->

> de igual manera lo tienes que hacer con los demás packages pendientes de
> `thyrox/src/packages/`
>
> identifica todos los archivos que faltan por package y copialos TODOS de
> `claude-code-nestor-monroy-tools/packages/<x>/` a `thyrox/src/packages/<x>/`
> … solo copiar, por el momento no ejecutes los test
>
> los comentarios en inglés de la referencia se escriben en español, sin
> coloquialismos, los términos técnicos se quedan en inglés, considerando
> significante vs significado

## La premisa, si se corrigio al primer comando

El censo abre en **1061 archivos ausentes** repartidos en 12 paquetes
—`permission` ya cerró en 0— con **9.16 MB** y **20 630 tramos de comentario
en inglés** sobre 26 545. Es ~20× la carga que costó `permission`, así que la
copia y la traducción se separan: la copia es un **proceso** y cuesta cero
tokens; la traducción es el presupuesto entero.

Y la premisa de que `permission` estaba cerrado **se cayó al medirla con el
instrumento nuevo**: su cierre «81 de 81» usaba un criterio de archivo entero
que no ve la traducción parcial. Ver `outputs/04-…`.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/comment_burden.mjs` | por archivo, cuántos tramos de comentario tiene y cuántos disparan el léxico inglés |
| `probes/show_english.mjs` | vuelca cada tramo inglés con su línea y **la palabra que disparó**, para que el triaje no sea adivinanza |
| `probes/only_comments_changed.mjs` | el control: transpila con `removeComments` y compara el cuerpo emitido contra la referencia |
| `probes/list_comments.mjs` | extractor de tramos de comentario por AST |
| `probes/accent_census.mjs` · `accent_fix.mjs` | censo de tilde en dos clases (INEQUÍVOCA / AMBIGUA) y su sustituidor, que sólo toca la primera |

Los tres primeros se corrigieron al usarlos: el léxico traía cuatro palabras
del español (`no`, `use`, `has`, `via`), el `\b` de JavaScript es ASCII —así
que `mayúsculas` disparaba `may`— y faltaba descontar la directiva de linter.

## Los resultados

- `00-faltantes.txt` — los 1061, con su paquete.
- `01-carga-de-traduccion.txt` · `02-carga-por-paquete.txt` — la carga, por
  archivo y agregada.
- `03-residuo-en-los-copiados.txt` · `04-…` — el cierre de permission remedido.

*Metrica:* archivos `.ts`/`.tsx` de la referencia ausentes del puerto; tramos
de comentario por AST contra un léxico cerrado con frontera Unicode.
*Ciega a:* si lo copiado compila o resuelve sus imports; la fidelidad de la
traducción; el ancla inglesa citada dentro de comentario español.
