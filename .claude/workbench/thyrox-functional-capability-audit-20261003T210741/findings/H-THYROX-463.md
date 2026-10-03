# H-THYROX-463

```json
{
 "finding_id": "H-THYROX-463",
 "created_at": "2026-10-03T21:52:13",
 "updated_at": "2026-10-03T21:52:13",
 "severity": "MEDIA",
 "initiative": "thyrox/identity-migration-kaupamex-ai",
 "status": "open",
 "source_ref": "src/packages/shared-state/redis.ts:46; src/packages/model-scheduling/redisCoordination.ts:111",
 "observations": [
  {
   "fact": "createRedisSharedStateStore y redisCoordination aceptan keyPrefix pero ningún consumidor lo fija; otro componente kaupamex-* en el mismo Redis compartiría claves (leases, generaciones). El prefijo debe derivarse de la identidad de componente.",
   "evidence": "src/packages/shared-state/redis.ts:46; src/packages/model-scheduling/redisCoordination.ts:111"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T21:52:13",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    "src/packages/shared-state/redis.ts:46; src/packages/model-scheduling/redisCoordination.ts:111"
   ]
  }
 ],
 "current_assessment": "Redis no lleva namespace de componente: keyPrefix vale '' por defecto en shared-state y en la coordinación de modelos"
}
```

## OBSERVATION

- createRedisSharedStateStore y redisCoordination aceptan keyPrefix pero ningún consumidor lo fija; otro componente kaupamex-* en el mismo Redis compartiría claves (leases, generaciones). El prefijo debe derivarse de la identidad de componente. — `src/packages/shared-state/redis.ts:46; src/packages/model-scheduling/redisCoordination.ts:111`

## ASSESSMENT HISTORY

- 2026-10-03T21:52:13: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

Redis no lleva namespace de componente: keyPrefix vale '' por defecto en shared-state y en la coordinación de modelos
