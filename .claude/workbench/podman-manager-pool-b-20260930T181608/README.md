# podman-manager-pool-b

## El encargo

Terminar TASK-THYROX-0557 vía pool, y lo que el primer pool destapó.

## La premisa, si se corrigio al primer comando

El primer pool (`podman-manager-pool-20260930T171944`, `outputs-2`)
integró los ítems 3 y 4 (`f51f7a7c5`). El ítem 1 dio 17 de 18 contra el
Podman real y cayó en el contrato de salida de `hardware-inventory` (sale 1
con `none`); el defecto es de `readHardwareVerdict`, commiteado en
`ea0a48eec`. El ítem 2 murió con un 400 del proxy local sin dejar stream ni
log: TASK-THYROX-0659 hace que el próximo 400 traiga su evidencia.

## Las piezas

| archivo | que hace |
|---|---|
| `source.md` | los tres ítems, con rutas absolutas |
| `items.txt` | un ítem por línea y sus archivos |
| `item1-real-podman.patch` | el parche del ítem 1 del primer pool, punto de partida del ítem A |
| `probes/verify-item.sh` | pruebas tocadas, lint y typecheck |
| `launch.sh` | el pool, en `inherit` por el proxy local |

## Los resultados

Se escriben al integrar.

*Metrica:* veredicto por ítem, casos por suite, errores propios.
*Ciega a:* GPU real, Podman rootless y la causa del 400 del primer pool.
