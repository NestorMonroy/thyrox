# H-THYROX-462

```json
{
 "finding_id": "H-THYROX-462",
 "created_at": "2026-10-03T21:52:13",
 "updated_at": "2026-10-03T21:52:13",
 "severity": "MEDIA",
 "initiative": "thyrox/identity-migration-kaupamex-ai",
 "status": "open",
 "source_ref": "src/packages/podman-execution/workerContainerLifecycle.ts:23,219; src/packages/image-registry/imageLifecycle.ts:22; src/lib/infrastructure.sh:88",
 "observations": [
  {
   "fact": "image-registry (io.thyrox.image.*), infrastructure.sh (io.thyrox.role/service), podman-execution (thyrox.owner-*, thyrox.execution-*, thyrox.resource-*, thyrox.worker-id) y model-scheduling (thyrox.model.*). Añadir labels de componente exige primero un esquema único en podman-execution; el barrido de workers decide además por name=^thyrox-worker-.",
   "evidence": "src/packages/podman-execution/workerContainerLifecycle.ts:23,219; src/packages/image-registry/imageLifecycle.ts:22; src/lib/infrastructure.sh:88"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T21:52:13",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    "src/packages/podman-execution/workerContainerLifecycle.ts:23,219; src/packages/image-registry/imageLifecycle.ts:22; src/lib/infrastructure.sh:88"
   ]
  }
 ],
 "current_assessment": "El esquema de labels de identidad no tiene autoridad única: cuatro módulos y dos prefijos (io.thyrox.* y thyrox.*)"
}
```

## OBSERVATION

- image-registry (io.thyrox.image.*), infrastructure.sh (io.thyrox.role/service), podman-execution (thyrox.owner-*, thyrox.execution-*, thyrox.resource-*, thyrox.worker-id) y model-scheduling (thyrox.model.*). Añadir labels de componente exige primero un esquema único en podman-execution; el barrido de workers decide además por name=^thyrox-worker-. — `src/packages/podman-execution/workerContainerLifecycle.ts:23,219; src/packages/image-registry/imageLifecycle.ts:22; src/lib/infrastructure.sh:88`

## ASSESSMENT HISTORY

- 2026-10-03T21:52:13: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

El esquema de labels de identidad no tiene autoridad única: cuatro módulos y dos prefijos (io.thyrox.* y thyrox.*)
