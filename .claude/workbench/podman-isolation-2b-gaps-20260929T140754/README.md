# Podman fase 2b — huecos del banco anterior (#312), medidos con `bin/parallel_map`

Cierra los puntos que `podman-isolation-2b-20260929T100450` declaró como no medidos. Anfitrión:
Podman 4.9.3, uid 0, 4 núcleos. Imagen local sin red: `helper.c` (el ayudante anterior más los
modos `net6`, `dns` y `cpu <hilos>`) compilado con `gcc -static` fuera del repo e importado con
`podman import`; retirada al terminar. Dos pasos (`launch.sh`): nueve sondas con `--width 4` y las
cuatro de CPU con `--width 1`, para que ninguna otra carga compita con ellas. Salida literal en
`results.tsv`; `rc_parallel=0 rc_cpu=0` en `results.err`.

| Capacidad | Con la bandera | Control | Veredicto |
|---|---|---|---|
| DNS por UDP con `--network none` | `sendto` falla: `Network is unreachable` | sin la bandera, la consulta sale y vuelve la respuesta | efectiva |
| IPv6 con `--network none` | `socket(AF_INET6)` falla | sin la bandera, **falla igual** | **no medible aquí**: el anfitrión no tiene IPv6 (`/proc/net/if_inet6` no existe) |
| `--read-only` sobre `/tmp`, `/run`, `/var/tmp`, `/dev/shm` | las cuatro escrituras **se aceptan** | `--read-only --read-only-tmpfs=false`: escribir en `/tmp` falla con `Read-only file system` | `--read-only` **no** cubre esos cuatro: Podman monta `tmpfs` escribibles; la bandera que los cierra es `--read-only-tmpfs=false` |
| `--cpus 0.5`, 1 hilo | 0,50 núcleos | sin límite: 0,97 (techo 1) | efectiva |
| `--cpus 0.5`, 2 hilos, en solitario | 0,51 núcleos | sin límite: 1,94 (techo 2) | efectiva |

**Corrección del banco anterior.** Su control de CPU dio 1,77 núcleos con un ayudante de **dos**
hilos (techo 2), medido junto a otras tres sondas. En solitario da 1,94: la diferencia es la
contención de aquella medición, no el límite. El veredicto de entonces no cambia.

**Defecto del ayudante, declarado.** En `net6`, si `socket()` falla, la llamada siguiente a
`setsockopt(-1, …)` sobrescribe `errno` con `EBADF`: el texto «Bad file descriptor» no es la causa.
La causa la da el anfitrión sin IPv6, medido aparte. No se corrigió porque el caso no puede
discriminar aquí con ningún ayudante.

*Métrica:* resultado de la llamada al sistema dentro del contenedor, con y sin la bandera.
*Ciega a:* IPv6 (el anfitrión no lo tiene); `/dev/shm` bajo `--read-only-tmpfs=false`, que se
gobierna con `--shm-size` y no se midió; la conducta rootless (la sesión es uid 0).

Siguiente paso: incorporar a `src/lib/podman_capabilities.sh` las capacidades efectivas de los dos
bancos —`--network none` (TCP y DNS), `--read-only` con `--read-only-tmpfs=false`, `--cpus` y el
montaje `:ro`—, vía pool.
