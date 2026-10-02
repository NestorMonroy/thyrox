# postgres-durability-through-primitive

TASK-THYROX-0741: `thyrox-postgres` levantado por la única vía permitida
(ADR-007 1.15.0, Regla 4) y su durabilidad probada sin salir de ella.

## El encargo

> sí quiero levantar `thyrox-postgres`, pero únicamente después de que la
> primitive pueda representar correctamente: owner = infrastructure, name =
> thyrox-postgres, named durable volume, mounted PostgreSQL secret, health =
> pg_isready […] No uses `podman run`, `podman create`, scripts alternos ni una
> excepción temporal para PostgreSQL.

## La premisa, si se corrigio al primer comando

- La primitiva ya representaba las cinco cosas (`resourceMaterialization.ts`:
  `ResourceKind`, `namedVolumes`, `secrets` montados, `health`, deriva y
  convergencia), y la declaración de PostgreSQL ya las pedía
  (`thyrox_infrastructure_desired_resource`). Lo que faltaba era levantarlo.
- Quedaba una segunda vía muerta: `thyrox_infrastructure_create_argv`, que
  componía `podman create` y pasaba la contraseña como `-e POSTGRES_PASSWORD=`.
  Retirada en `a5e1bdb30`.
- `THYROX_INFRA_POSTGRES_PASSWORD` estaba en estado `exposed`. Ninguna base la
  usaba todavía: se regeneró localmente antes de inicializar (sin imprimirla;
  `credential-rotation.tsv` del banco de TASK-THYROX-0743).
- El primer `bin/infrastructure_ensure thyrox-postgres` rehusó con exit 3:
  locks desfasados (3 asignados, 4 referenciados) y `podman system renumber`
  roto por el defecto de sqlite (H-THYROX-308). Se aplicó la reparación
  explícita `bin/podman_lock_recovery --confirm` (sin contenedores vivos;
  tras refrescar, 5 asignados) y el ensure volvió a correr por la primitiva.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/marker.ts` | escribe/lee una fila marcadora; corre DENTRO de una unidad, contraseña por secreto montado |
| `probes/durability.sh` | escribe → recrea por la primitiva → lee → vuelve a la declaración → lee → ensure sin cambios → control negativo |

## Los resultados

Creación (`.thyrox/runtime/ensure-postgres-2.log`, transcrito):
`thyrox-postgres action=created drift=- created=yes started=yes health=healthy volumes=thyrox-postgres-data:created`.

`outputs/durability.log`:

| paso | resultado |
|---|---|
| escribir | `written` |
| puerto 55433 → ensure | `action=recreated drift=configuration … health=healthy volumes=thyrox-postgres-data:preserved` |
| leer | `present`, mismo `written_at` |
| volver a la declaración → ensure | `recreated`, `preserved` |
| leer | `present` |
| ensure sin cambios | `kept` |
| control: marcador nunca escrito | `absent`, exit 1 |

`outputs/durability-health-timeout-kept.log`: cambiar el plazo de salud NO
recrea (`kept`): la salud se comprueba, no es propiedad del contenedor, y
`configDigest` no la incluye. Por eso la recreación se forzó con el puerto.

`outputs/inspect-summary.txt`: el valor de la contraseña aparece 0 veces en
`podman inspect`; el contenedor recibe `POSTGRES_PASSWORD_FILE`; dueño
`infrastructure`.

*Metrica:* acción y volúmenes que reporta la primitiva, fila leída desde otra
unidad, ocurrencias del valor en `inspect`.
*Ciega a:* un reinicio de la microVM (lo que se probó es la recreación del
contenedor, no el arranque en frío de la VM), y a la deriva de `thyrox-redis`
y `thyrox-ollama`, que siguen como contenedores del camino anterior sin
etiqueta de dueño y no se tocaron aquí.
