# H-THYROX-452

```json
{
 "finding_id": "H-THYROX-452",
 "created_at": "2026-10-03T19:35:33",
 "updated_at": "2026-10-03T19:35:33",
 "severity": "ALTA",
 "initiative": "actualizar-agentic-ai-thyrox",
 "status": "open",
 "source_ref": ".claude/workbench/model-fallback-chain-reference-20261003T192801/outputs/reference-analysis.md",
 "observations": [
  {
   "fact": "Claude Code 2.1.286 (bin/binary) separa interruptor (G6=CLAUDE_CODE_NO_MODEL_FALLBACK), cadena ordenada dentro de availableModels (rre/chn/Hr) y motivos cerrados (model_not_found, permission_denied, overloaded tras LK=3 529, server_error, last_resort salvo 401/407/429/404/403/413, model_blocked); agotada la cadena relanza el error o reintenta en el sitio si fue overloaded/server_error ($a); cada salto es de un turno y deja system/model_fallback. thyrox ya tenía withRetry.FallbackTriggeredError, anthropicHttp.fallbackModel, query.ts y --fallback-model, pero printDelegation->localProxy->admittedUpstream no salta nunca, y execution_policy fundía todo en fallback.enabled. Además, en sesión se afirmó que model_blocked no salta: falso, salta si hay respaldo. Lo que bloquea hoy la autoimplementación (falta cualificar con reasoning none) no es un motivo de salto en la referencia.",
   "evidence": ".claude/workbench/model-fallback-chain-reference-20261003T192801/outputs/reference-analysis.md"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T19:35:33",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    ".claude/workbench/model-fallback-chain-reference-20261003T192801/outputs/reference-analysis.md"
   ]
  }
 ],
 "current_assessment": "El respaldo de la referencia ya estaba portado a medias y no llega a la ruta local; la política lo reducía a un booleano"
}
```

## OBSERVATION

- Claude Code 2.1.286 (bin/binary) separa interruptor (G6=CLAUDE_CODE_NO_MODEL_FALLBACK), cadena ordenada dentro de availableModels (rre/chn/Hr) y motivos cerrados (model_not_found, permission_denied, overloaded tras LK=3 529, server_error, last_resort salvo 401/407/429/404/403/413, model_blocked); agotada la cadena relanza el error o reintenta en el sitio si fue overloaded/server_error ($a); cada salto es de un turno y deja system/model_fallback. thyrox ya tenía withRetry.FallbackTriggeredError, anthropicHttp.fallbackModel, query.ts y --fallback-model, pero printDelegation->localProxy->admittedUpstream no salta nunca, y execution_policy fundía todo en fallback.enabled. Además, en sesión se afirmó que model_blocked no salta: falso, salta si hay respaldo. Lo que bloquea hoy la autoimplementación (falta cualificar con reasoning none) no es un motivo de salto en la referencia. — `.claude/workbench/model-fallback-chain-reference-20261003T192801/outputs/reference-analysis.md`

## ASSESSMENT HISTORY

- 2026-10-03T19:35:33: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

El respaldo de la referencia ya estaba portado a medias y no llega a la ruta local; la política lo reducía a un booleano
