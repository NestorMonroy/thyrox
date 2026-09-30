# Podman fase 2b — capacidades de aislamiento (#312), medidas con `bin/parallel_map`

Anfitrión: Podman 4.9.3, runc, cgroups v1, cgroupfs, uid 0. Imagen local sin red: `helper.c`
compilado con `gcc -static` (el binario queda fuera del repo) e importado con `podman import`;
retirada al terminar. Ocho casos en paralelo (`--width 4`), cada capacidad CON y SIN su bandera, para
que el control discrimine. Salida literal en `results.tsv`.

| Capacidad | Con la bandera | Sin la bandera (control) | Veredicto |
|---|---|---|---|
| `--network none` | `connect` a 1.1.1.1:443 falla: `Network is unreachable` | conecta | efectiva |
| `--read-only` | escribir en `/` falla: `Read-only file system` | escribe | efectiva |
| `--cpus 0.5` | 0,50 núcleos (1,23 s de CPU en 2,48 s) | 1,77 núcleos (4,24 s en 2,39 s) | efectiva |
| repo montado `:ro` | lee `README.md`; escribir falla: `Read-only file system` | un directorio desechable montado `rw` acepta la escritura | efectiva |

El control del montaje NO monta el repo en escritura: usa un directorio desechable, para que ninguna
sonda pueda escribir en el árbol (comprobado: `p2b-must-not-exist` no existe).

Ciego a: `--network none` con DNS o IPv6 (se midió TCP/IPv4 a una IP fija); `--cpus` con un solo
hilo; la conducta sin uid 0 (rootless); y la escritura en `tmpfs` que Podman monta aun con
`--read-only` (`/tmp`, `/run`), que no se midió.

Siguiente paso: incorporar estas cuatro capacidades a `src/lib/podman_capabilities.sh`, vía pool.
