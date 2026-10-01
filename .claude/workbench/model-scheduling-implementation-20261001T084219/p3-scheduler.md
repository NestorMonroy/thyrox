# Fuente de verdad — ítem 3: ModelScheduler (TASK-THYROX-0699)

Decisión: ADR-007 1.10.0, 1.11.0 y 1.12.0 (`kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`).
Invariantes M17–M20 y la tabla de compensaciones de la 1.12.0.

Te pertenece SÓLO `src/packages/model-scheduling/scheduler.ts`. Conserva sus tipos exportados.

Las pruebas ya escritas y en rojo son `__tests__/scheduler.test.ts`, con los dobles de
`testing/schedulerFakes.ts` (no los cambies).

`execute(plan)`:
1. Si no ha reconciliado desde el arranque o desde la última vez que la coordinación devolvió
   `unavailable`, reconcilia antes de adquirir (M20).
2. `acquireResidency(plan.residencyKey, plan.owner, leaseTtlMs)`: `held`/`stale`/`unavailable` →
   `refused` en `lease`, sin crear nada; `unavailable` además marca que hay que reconciliar otra vez.
3. `ledger.reserve` con la generación del lease → si no es `reserved`: soltar el lease, `failed` en `reserve`.
4. `issuer.issue(plan, generation)` → si falla: soltar reserva y lease, `failed` en `grant`.
5. `primitive.materialize(grant)` → si no es `materialized`: retirar la unidad parcial si la hay,
   revocar el grant, soltar reserva y lease, `failed` en `materialize`.
6. `runtime.load(unit, grant)` → si falla: retirar la unidad, revocar, soltar reserva y lease,
   `failed` en `load`.
7. Si todo fue bien: `executing` con lease, reserva, grant y unidad.

Las compensaciones van en orden inverso: unidad, grant, reserva, lease. Una que no se completa
(`retire` devuelve `failed`, `release` del ledger lanza) no detiene las siguientes: queda como
`ReconciliationMark` con su recurso, id y motivo (M18).

`reconcile()`: lista `primitive.units()` y `ledger.reservations()`; por cada unidad pregunta
`runtime.loadedModel(unit)`; una unidad cuyo runtime no sirve el modelo de su grant se marca (no se
retira). Nunca retira una unidad que sirve su modelo. Una caída de la coordinación no retira nada.
