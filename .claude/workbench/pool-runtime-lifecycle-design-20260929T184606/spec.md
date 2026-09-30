# Ciclo de vida de artefactos de repository/job — especificación aprobada

Aprobada por el ejecutor el 2026-09-29, con condiciones. Gobierna
TASK-THYROX-0601 y fija su orden respecto de TASK-THYROX-0506 y
TASK-THYROX-0546. Vive en headless-pool / thyrox-bg; queda fuera de Daemon,
PodmanWorkerManager, @thyrox/store, Redis, PostgreSQL y los workers
especializados.

## Orden

1. A4 (#291) y #335 terminan.
2. TASK-THYROX-0506 — el pool ejecuta una copia inmutable de su lanzador.
3. TASK-THYROX-0546 — grupo de procesos por ítem, WriterInspector propio (no
   `stdin_probe`) y cero escritores vivos al cerrar.
4. TASK-THYROX-0601a — runtime fuera del banco (`.thyrox/runtime/pool/<run-id>/`),
   máquina de estados, generaciones y publicación lógicamente atómica con
   `<n>.closed`.
5. TASK-THYROX-0601b — SnapshotStore (objetos de Git), RecoveryController.
6. Gate de pre-commit contra escritores vivos.

## Estados

CREATED → RUNNING → SNAPSHOTTING → RUNNING | CLOSING → PUBLISHING → CLOSED.
Una escritura de `writer.generation != item.current_generation` se rechaza.

## Invariantes

- I1  RUNNING ⇒ ningún artefacto está publicado lógicamente.
- I2  CLOSED ⇒ `<n>.closed` existe, todos los artefactos requeridos existen y
      su generación coincide con la del marcador.
- I3  `<n>.closed` ⇒ no hay escritor vivo de esa generación.
- I4  un snapshot de la generación N nunca sobrescribe ni publica la N+1.
- I5  un fallo en cualquier instrucción lleva a la recuperación al estado
      válido anterior o al siguiente completo; nunca a un estado intermedio
      aceptado.

## Publicación: atomicidad LÓGICA, no física

Mover N archivos no es atómico. Lo atómico es la visibilidad del ítem:

- sin `<n>.closed` → el ítem NO está publicado; ningún consumidor confía en
  sus salidas aunque `<n>.patch` exista;
- con `<n>.closed` → todas las salidas requeridas están completas.

`<n>.closed` se escribe el último (temporal + `rename`) y lleva la
generación y el sha256 de cada artefacto. Todo consumidor lo exige:
`pool_integrate`, `check_bench_untracked`, los reportes y cualquiera nuevo.
Cada uno lleva su prueba de «sin marcador no lee».

`finalize` es idempotente: tras un fallo a mitad (A movido, B no, sin
`.closed`) el RecoveryController detecta la publicación incompleta, completa
o reconcilia los movimientos, verifica los sha256 y sólo entonces escribe
`.closed`. Los archivos parciales no se tratan como publicados ni se borran.

## Snapshot

Objeto commit sin referencia de rama: índice temporal (`GIT_INDEX_FILE`),
`git add -A`, `write-tree`, `commit-tree`, anclado en
`refs/thyrox/snapshots/<run>/<item>/<generation>`. No usa `git stash`.

`git add -A` sobre el índice temporal captura el contenido final del worktree
pero borra la distinción staged/unstaged. **Decisión: se preserva.** Antes del
snapshot se registra `git write-tree` del índice real del worktree (escribe
sólo un objeto; no toca el índice ni el árbol) como `original_index_tree`.

Manifest mínimo por snapshot:

    run, item, generation, base_head, snapshot_commit, original_index_tree,
    created_at, sha256 del manifest y de cada artefacto

## Recuperación: no destructiva por defecto

La recuperación NO hace `git checkout <hash> -- .` sobre el worktree
original: puede contener trabajo nuevo. Por defecto crea un worktree y una
rama temporales desde `snapshot_commit` (con el índice restaurado desde
`original_index_tree`). Restaurar sobre el worktree original exige una
acción explícita. El guardián prioriza conservar información.

## Refs de snapshot bajo concurrencia

Los refs `refs/thyrox/snapshots/...` viven en el repositorio compartido por
todos los worktrees. Se distinguen de `refs/stash` por el nombre único por
(run, item, generación) y por el bloqueo de refs de Git, y eso se PRUEBA:

    worktree A → snapshot run-A/item-1/gen-3
    worktree B → snapshot run-B/item-1/gen-2
    simultáneos ⇒ los dos refs existen, ninguno reemplaza al otro,
                   ningún HEAD ni rama cambia

La creación usa `git update-ref <ref> <commit> ""` (el valor viejo vacío
exige que el ref no exista); una colisión rehúsa en vez de pisar.

## Ignorados versionados

Nada de ignorar `.thyrox/` entero. El `.gitignore` versionado declara sólo el
namespace de estado local:

    /.thyrox/runtime/
    /.thyrox/pool-worktrees/

## Pruebas mínimas

Las de la especificación original, más: una prueba por invariante I1–I5
(I5 con fallo inyectado entre cada movimiento de `finalize`), la de
concurrencia de refs, la de recuperación no destructiva sobre un worktree
con trabajo nuevo y la de «sin `.closed` no se lee» por cada consumidor.

## Fuera de alcance

Algoritmos de grafos.
