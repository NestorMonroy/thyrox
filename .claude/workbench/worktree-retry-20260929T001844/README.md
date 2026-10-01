# El alta del worktree de un ítem espera al candado de git

El ítem 3 (R-2b-4) del pool `fast-mode-pool-unbounded-20260929T000919` salió
con «no se pudo preparar el worktree del item». Entró en `worktree add` entre
las 00:09:19 y las 00:10:33, y a las 00:09:40 se hizo un commit en el mismo
repositorio: un commit retiene el candado de git mientras corren sus hooks,
que duran minutos. `with_retries` hacía cinco intentos en unos 1.5 s y
descartaba el stderr de git, así que el motivo no quedó registrado.

Ahora reintenta hasta un plazo (`THYROX_ITEM_WORKTREE_RETRY_SECONDS`, 300 por
defecto) con espera creciente hasta 8 s, y al agotarlo imprime el último
motivo de git por stderr.

| Salida | Resultado |
|---|---|
| `green.txt` | 7/7 |
| `annulment.txt`, con el módulo de HEAD (`item_worktree.pre-deadline.sh`) | 4/7: caen exactamente las tres aserciones nuevas |

*Métrica:* aserciones de `tests/session/test-item-worktree-lock.sh`, con un
`git` falso que retiene un candado propio.
*Ciega a:* un candado real de git retenido por otro proceso; el falso imita
su mensaje y su conducta, no su implementación.
