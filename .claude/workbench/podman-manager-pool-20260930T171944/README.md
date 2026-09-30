# podman-manager-pool

## El encargo

«vamos a empezar con PodmanWorkerManager sigue pendiente (TASK-THYROX-0557)» y
«porque no lo ejecutas via Pool lifecycle y recuerdas que tenemos que usar
bash».

## La premisa, si se corrigio al primer comando

El manager ya se commiteó en `ea0a48eec` (banco
`podman-worker-manager-20260930T171326`). Este pool hace lo que falta, en dos
ítems disjuntos por archivo: la prueba contra Podman real y el ciclo de vida
dentro del daemon. `daemon.json` no declara workers especializados; eso queda
para TASK-THYROX-0558, su primer consumidor.

## Las piezas

| archivo | que hace |
|---|---|
| `source.md` | fuente de verdad de los dos ítems |
| `items.txt` | un ítem por línea, con los archivos que le pertenecen |
| `template.md` | la plantilla de `packages-20260930T052338` |
| `probes/verify-item.sh` | corre las pruebas que tocó el ítem, lint y typecheck |
| `launch.sh` | el pool, con `--task-class analisis` y `--credential-proxy` |

## Los resultados

**Primer lanzamiento (2026-09-30T17:20): rehusado antes de lanzar ningún
ítem, con exit 2.** El pool derivó `claude-opus-5-5` de `--task-class
analisis` y la fuente `proxy-store` de `--credential-proxy`, porque el entorno
no declara ninguna variable de credencial. El proxy no arrancó: el store de
conexiones tampoco tiene credencial propia. Log: `.claude/jobs/podman-manager-pool-20260930T172008/`.

El rechazo era correcto para lo que se pidió, y lo pedido era el error:
`--credential-proxy` exige una credencial propia, en el entorno o en el store,
y no la había. Este pool no la necesita. Sin la opción rige `inherit`: cada
ítem hereda el entorno y `thyrox -p` entra al proxy local (C7). Medido en
`task-census-20260930T064202/impl-pool-a/outputs-2`, que corrió así: sus
ítems 1, 2 y 3 terminaron en `success`, con 54, 69 y 79 turnos. Por eso el
relanzamiento va sin `--credential-proxy`.

**Ampliado tras el rechazo:** el pool lleva ahora cuatro ítems. Se añaden
TASK-THYROX-0657 (el rechazo del proxy nombra la vía del store) y
TASK-THYROX-0658 (`providers add --dry-run` no escribe). El segundo
lanzamiento escribe en `outputs-2/`, para no mezclarse con la salida del
rechazo. Para relanzar hace falta una credencial propia
declarada en el entorno: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` o
`THYROX_CODE_OAUTH_TOKEN`.

*Metrica:* veredicto por ítem, casos de cada suite, errores propios.
*Ciega a:* GPU real, Podman rootless y otros anfitriones.
