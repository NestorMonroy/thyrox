# H-THYROX-471

```json
{
 "finding_id": "H-THYROX-471",
 "created_at": "2026-10-03T23:18:30",
 "updated_at": "2026-10-03T23:18:30",
 "severity": "ALTA",
 "initiative": "thyrox/functional-capability-audit",
 "status": "open",
 "source_ref": ".claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/resources/ram.txt; src/session/resource_admission.py:359; src/packages/local-models/ollamaRuntimeAdapter.ts:69",
 "observations": [
  {
   "fact": "RAM física 15.7 GiB sin swap; cgroup de la sesión 13.4 GiB; las unidades de modelo en libpod_parent sin límite. resource_admission toma la holgura del cgroup de la sesión con la caché de páginas como usada (inflada por sha256sum de GGUF), y el piso de 2 GiB; por eso rehusó un laboratorio de 8 GiB con ~15 GB libres. Disco: el canónico es remoto (0 bytes locales obligatorios); pushBlob copia la caché a la unidad: dos copias por modelo por materialización, no por requisito. El techo de modelo declarado antes mezclaba configuración con física.",
   "evidence": ".claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/resources/ram.txt; src/session/resource_admission.py:359; src/packages/local-models/ollamaRuntimeAdapter.ts:69"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T23:18:30",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    ".claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/resources/ram.txt; src/session/resource_admission.py:359; src/packages/local-models/ollamaRuntimeAdapter.ts:69"
   ]
  }
 ],
 "current_assessment": "La admisión de RAM mide el cgroup de la sesión y cuenta su caché de páginas, pero las unidades corren en libpod_parent; y cada modelo se guarda dos veces por materialización"
}
```

## OBSERVATION

- RAM física 15.7 GiB sin swap; cgroup de la sesión 13.4 GiB; las unidades de modelo en libpod_parent sin límite. resource_admission toma la holgura del cgroup de la sesión con la caché de páginas como usada (inflada por sha256sum de GGUF), y el piso de 2 GiB; por eso rehusó un laboratorio de 8 GiB con ~15 GB libres. Disco: el canónico es remoto (0 bytes locales obligatorios); pushBlob copia la caché a la unidad: dos copias por modelo por materialización, no por requisito. El techo de modelo declarado antes mezclaba configuración con física. — `.claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/resources/ram.txt; src/session/resource_admission.py:359; src/packages/local-models/ollamaRuntimeAdapter.ts:69`

## ASSESSMENT HISTORY

- 2026-10-03T23:18:30: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

La admisión de RAM mide el cgroup de la sesión y cuenta su caché de páginas, pero las unidades corren en libpod_parent; y cada modelo se guarda dos veces por materialización
