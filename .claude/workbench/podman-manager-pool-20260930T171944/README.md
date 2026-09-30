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

Se escriben al integrar.

*Metrica:* veredicto por ítem, casos de cada suite, errores propios.
*Ciega a:* GPU real, Podman rootless y otros anfitriones.
