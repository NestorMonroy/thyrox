Corriges en thyrox (bash), en TDD, dos aserciones de `tests/session/test-headless-pool.sh` que
quedaron atrás de un cambio deliberado del mecanismo. El `Item:` de abajo nombra el único archivo
que te pertenece; no toques ningún otro. Edita con `sed`, `gawk` o `bash bin/replace_literal`.

El hecho, medido: desde `20d4df2f`, `ReservationLedger.release` en `src/session/resource_admission.py`
RETIRA el archivo del registro cuando ya no queda ninguna reserva viva («en reposo no deja archivo
en el árbol»). Las aserciones «reserva: el registro queda vacio al terminar» y «dos pools: el
registro queda vacío» siguen leyendo `jq -r 'length' "$HIST/vram-reservations.json"` y esperan `0`;
con el archivo retirado `jq` no imprime nada y obtienen `''`. Fallan también en HEAD (125 de 127).

Lo que se pide:
1. Un helper en el test que devuelva el número de reservas del registro distinguiendo tres casos:
   archivo ausente → `0` (reposo); archivo presente → su `length`; archivo presente e ilegible →
   una cadena que NO sea un número (p. ej. `ilegible`), para que un JSON roto no pase como vacío.
2. Las dos aserciones lo usan. Añade un caso que ejercite la rama «presente e ilegible».
3. Control de anulación: haz que el helper devuelva `0` también para el ilegible y confirma que cae
   exactamente el caso nuevo; publica el conteo antes y después. Restaura.
4. Comentarios en español sin coloquialismos; identificadores en inglés.

Criterio de cierre: `bash tests/session/test-headless-pool.sh` en verde.
