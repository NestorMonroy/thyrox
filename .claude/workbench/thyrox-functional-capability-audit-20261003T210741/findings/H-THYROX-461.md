# H-THYROX-461

```json
{
 "finding_id": "H-THYROX-461",
 "created_at": "2026-10-03T21:52:13",
 "updated_at": "2026-10-03T21:52:13",
 "severity": "ALTA",
 "initiative": "thyrox/identity-migration-kaupamex-ai",
 "status": "open",
 "source_ref": "src/session/write-env.sh:71; src/verify/thyrox-audit.sh:259; src/paths/reach.py:615; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/identity-surface-inventory.tsv",
 "observations": [
  {
   "fact": "write-env.sh:71 usa THYROX_CLONE_PREFIX:-kaupamex-, reach.py/reach.ts derivan hermanos por prefijo, thyrox-audit.sh:259 hace ls kaupamex-*, task_ids.py modela 'los kaupamex-* son consumidores'. Tras el rename a kaupamex-ai, el proveedor caería en el conjunto de consumidores. Pertenencia por identidad de componente o roster declarado, nunca por prefijo.",
   "evidence": "src/session/write-env.sh:71; src/verify/thyrox-audit.sh:259; src/paths/reach.py:615; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/identity-surface-inventory.tsv"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T21:52:13",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    "src/session/write-env.sh:71; src/verify/thyrox-audit.sh:259; src/paths/reach.py:615; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/identity-surface-inventory.tsv"
   ]
  }
 ],
 "current_assessment": "La pertenencia al ecosistema se decide por el prefijo kaupamex-: un clon kaupamex-ai se contaría como consumidor"
}
```

## OBSERVATION

- write-env.sh:71 usa THYROX_CLONE_PREFIX:-kaupamex-, reach.py/reach.ts derivan hermanos por prefijo, thyrox-audit.sh:259 hace ls kaupamex-*, task_ids.py modela 'los kaupamex-* son consumidores'. Tras el rename a kaupamex-ai, el proveedor caería en el conjunto de consumidores. Pertenencia por identidad de componente o roster declarado, nunca por prefijo. — `src/session/write-env.sh:71; src/verify/thyrox-audit.sh:259; src/paths/reach.py:615; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/identity-surface-inventory.tsv`

## ASSESSMENT HISTORY

- 2026-10-03T21:52:13: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

La pertenencia al ecosistema se decide por el prefijo kaupamex-: un clon kaupamex-ai se contaría como consumidor
