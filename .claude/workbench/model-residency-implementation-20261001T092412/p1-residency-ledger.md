# P1 — ledger de VRAM de residencia en memoria

Tarea: TASK-THYROX-0699 (tarjeta 61). Archivo tuyo: `src/packages/model-scheduling/memoryVramLedger.ts`, sólo
`createMemoryResidencyVramLedger` (el `FencedVramLedger` existente ya pasa sus pruebas y no se cambia de
comportamiento; reutilízalo, no lo dupliques).

Contrato: `src/packages/model-scheduling/vramLedger.ts` (`ResidencyVramLedger`, `RequestAllocation`,
`RequestAllocationOutcome`). Pruebas: `__tests__/residencyLedger.test.ts`; deben seguir verdes
`__tests__/memoryVramLedger.test.ts`.

Semántica (ADR-007 1.13.0): la residencia se reserva una vez con `reserve`; cada petición concurrente es
una asignación incremental sobre esa reserva y cuenta contra la capacidad del dispositivo; una asignación
sobre una reserva inexistente o de generación vieja se rechaza; soltar una petición devuelve su VRAM;
soltar la reserva no deja asignaciones colgando.
