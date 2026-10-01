# Fuente de verdad — ítem 2: ledger de VRAM con fencing (TASK-THYROX-0699)

Decisión: ADR-007 1.12.0 (`kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`,
«Topología del scheduler, fencing y compensaciones»): la reserva lleva la generación de su
residencia y rechaza una menor que la mayor vista para esa residencia, aunque su dueño viva.

Te pertenece SÓLO `src/packages/model-scheduling/memoryVramLedger.ts`.

El contrato es `vramLedger.ts` (no lo cambies) y la prueba ya escrita y en rojo es
`__tests__/memoryVramLedger.test.ts`.

`createMemoryVramLedger({ capacityMib })`: capacidad por UUID de dispositivo; un dispositivo sin
capacidad declarada tiene 0; la VRAM libre de un dispositivo es su capacidad menos lo reservado en
él; `insufficient` nombra el primer dispositivo que no cabe, su libre y lo pedido; la generación
mayor vista se guarda por residencia y sobrevive a soltar la reserva; en CPU (`devices` vacío) no se
reserva VRAM pero la generación sigue mandando; `release` es `absent` si la reserva no existe.
