# Podman fase 2b — incorporar las capacidades de aislamiento a la sonda (TASK-THYROX-0555)

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo, de
funciones y de capacidades en inglés; comentarios en español técnico, sin
coloquialismos, con los términos técnicos en inglés. No toques `.claude/`,
`_references/` ni `agent-results/`. Operaciones de archivo por Bash.

## Estado de partida (medido)

`src/lib/podman_capabilities.sh` mide cuatro capacidades (`run`,
`pids_limit`, `memory_limit`, `cleanup`) con un ayudante estático en C
dentro de una imagen local importada. Su contrato lo fija
`tests/lib/test-podman-capabilities.sh` (`EXPECTED_CAPABILITIES`). Usa
`--network none` como bandera en cada `podman run`, pero NO la mide como
capacidad, y no mide `--read-only`, `--cpus` ni un montaje `:ro`.

Dos bancos ya midieron esas capacidades en este anfitrión (Podman 4.9.3,
uid 0) con y sin su bandera; léelos antes de escribir:
`.claude/workbench/podman-isolation-2b-20260929T100450/` y
`.claude/workbench/podman-isolation-2b-gaps-20260929T140754/` (README,
`helper.c`, `probe.sh`, `results.tsv`). Resumen:

- `--network none`: TCP a 1.1.1.1:443 falla (`Network is unreachable`) y
  una consulta DNS por UDP a 1.1.1.1:53 también; sin la bandera, ambas
  funcionan. IPv6 no es medible en este anfitrión.
- `--read-only`: escribir en `/` falla, pero `/tmp`, `/run`, `/var/tmp` y
  `/dev/shm` siguen escribibles (Podman monta tmpfs). Con
  `--read-only --read-only-tmpfs=false`, escribir en `/tmp` falla.
- `--cpus 0.5`: 2 hilos girando obtienen 0,51 núcleos; sin límite, 1,94.
- montaje `:ro`: se lee, y escribir falla con `Read-only file system`.

## Qué hacer

Añade a la sonda cuatro capacidades, con el mismo formato TSV
(`capacidad<TAB>veredicto<TAB>detalle`, veredicto `efectivo`,
`no-efectivo` o `error`) y el mismo patrón de limpieza (cada contenedor
registrado, `trap` que lo retira):

1. `network_none` — con `--network none`, TCP IPv4 a una IP fija Y una
   consulta DNS por UDP deben fallar. `efectivo` sólo si las dos fallan.
2. `read_only_rootfs` — con `--read-only --read-only-tmpfs=false`, escribir
   en `/` y en `/tmp` debe fallar. `efectivo` sólo si las dos fallan. En el
   detalle declara que `--read-only` solo deja `/tmp`, `/run`, `/var/tmp` y
   `/dev/shm` escribibles, y que por eso la sonda exige la segunda bandera.
3. `cpu_limit` — con `--cpus 0.5`, el ayudante gira 2 hilos unos segundos y
   publica núcleos obtenidos (CPU/pared). `efectivo` si queda por debajo de
   un umbral con nombre (constante, no número mágico) entre el límite y el
   techo de 2 hilos. Declara en el comentario que la medida es sensible a la
   carga del anfitrión.
4. `readonly_mount` — monta un directorio desechable propio (NO el repo)
   con `:ro`: leer un archivo sembrado debe funcionar y escribir debe
   fallar. `efectivo` sólo si las dos cosas se cumplen.

Extiende el ayudante en C con los modos que falten (`dns`, `cpu <hilos>`,
`read`/`write <ruta>`), tomando el código de los bancos. Actualiza la
cabecera del guion (lista de capacidades, en orden) y el contrato de la
prueba: `EXPECTED_CAPABILITIES` pasa a las ocho, en el orden que publique la
sonda, y el caso 2 exige que las cuatro nuevas den `efectivo` en este
anfitrión. El caso 3 (no queda imagen ni contenedor) debe seguir en verde.

**Control de anulación, obligatorio:** retira la bandera de cada capacidad
nueva (una a la vez) y comprueba que su veredicto pasa a `no-efectivo` y
cae exactamente la aserción que la exige. Restaura y deja el resultado de
las cuatro anulaciones en tu informe final, con la salida literal.

## Qué NO hacer

- No montes el repo ni ninguna ruta del árbol en escritura.
- No toques la imagen ni los contenedores de otra ejecución: usa los nombres
  con `_PODMAN_CAP_RUN_ID`.
- No cambies el contrato de exit 2 (no poder medir no imprime veredictos).
- `shellcheck` debe quedar limpio sobre los archivos tocados.
