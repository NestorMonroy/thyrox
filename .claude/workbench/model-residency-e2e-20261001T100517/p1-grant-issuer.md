# P1 — MemoryGrantIssuer

Tarea: TASK-THYROX-0699 (tarjeta 61). Archivo tuyo: `src/packages/model-scheduling/memoryGrantIssuer.ts`.
Pruebas: `__tests__/memoryGrantIssuer.test.ts`. Deben seguir verdes las demás suites del paquete.

Lee: el docstring del archivo, `scheduler.ts` (`GrantIssuer`, `ExecutionPlan`), `@thyrox/model-artifacts/executionGrant.ts`
y `@thyrox/model-artifacts/resolvedModelArtifact.ts` (`assertConsistentIdentity`).

`issue`: valida la identidad con `assertConsistentIdentity`; si lanza `InconsistentModelIdentityError`,
`{ status: 'failed', reason }` con el mensaje (nombra el campo). Si no, construye el grant con `newGrantId()`,
`residency: { mode: 'create', instance: plan.residencyKey, generation }`, los campos del plan, `issuedAt = now()`
y `expiresAt = now() + ttlMs`, lo registra como vigente y lo devuelve. `revoke`: lo retira del registro
(`revoked`) o `absent`. `isCurrent`: el grant está registrado, es idéntico al registrado (una copia alterada no
cuenta) y `now() < expiresAt`.
