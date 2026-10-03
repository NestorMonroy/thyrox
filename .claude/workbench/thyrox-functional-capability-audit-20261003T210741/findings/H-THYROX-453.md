# H-THYROX-453

```json
{
 "finding_id": "H-THYROX-453",
 "created_at": "2026-10-03T20:05:47",
 "updated_at": "2026-10-03T20:05:47",
 "severity": "ALTA",
 "initiative": "actualizar-agentic-ai-thyrox",
 "status": "open",
 "source_ref": ".claude/workbench/provider-selection-migration-20261002T105550/tasks/T002.md",
 "observations": [
  {
   "fact": "Search Existing de 0920 buscó 'fallback' y no 'select|provider|candidate': no vio providerSelection.ts (selectProvider genérico, 258ca8791), el catálogo de API de Model Studio (95b0729cf) ni el plan de TASK-THYROX-0750 (providers.tsv con baseUrl y secretName por nombre, providerRegistry.candidatesFor, bin/select-provider, migrar recommend.ts y task_continuation). 0750 ya declaraba: un proveedor participa sólo si la política lo lista, sin elegibles es blocked y nunca claude, y el remoto (token-plan, https://token-plan.maas.qwencloudapi.com/apps/anthropic, protocolo Anthropic) entra con su secreto montado como ExecutionSecret. T001 de 0750 nunca se integró: cuatro intentos con qwen3.8-flash y deepseek-v4.1-flash por token-plan terminaron en 502 upstream (provider_transient). La cadena de 0920/0923 y la elección de 0750 tienen que converger en una sola autoridad.",
   "evidence": ".claude/workbench/provider-selection-migration-20261002T105550/tasks/T002.md"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T20:05:47",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    ".claude/workbench/provider-selection-migration-20261002T105550/tasks/T002.md"
   ]
  }
 ],
 "current_assessment": "TASK-THYROX-0920 extendió la vía de selección que TASK-THYROX-0750 iba a migrar, por una búsqueda acotada a 'fallback'"
}
```

## OBSERVATION

- Search Existing de 0920 buscó 'fallback' y no 'select|provider|candidate': no vio providerSelection.ts (selectProvider genérico, 258ca8791), el catálogo de API de Model Studio (95b0729cf) ni el plan de TASK-THYROX-0750 (providers.tsv con baseUrl y secretName por nombre, providerRegistry.candidatesFor, bin/select-provider, migrar recommend.ts y task_continuation). 0750 ya declaraba: un proveedor participa sólo si la política lo lista, sin elegibles es blocked y nunca claude, y el remoto (token-plan, https://token-plan.maas.qwencloudapi.com/apps/anthropic, protocolo Anthropic) entra con su secreto montado como ExecutionSecret. T001 de 0750 nunca se integró: cuatro intentos con qwen3.8-flash y deepseek-v4.1-flash por token-plan terminaron en 502 upstream (provider_transient). La cadena de 0920/0923 y la elección de 0750 tienen que converger en una sola autoridad. — `.claude/workbench/provider-selection-migration-20261002T105550/tasks/T002.md`

## ASSESSMENT HISTORY

- 2026-10-03T20:05:47: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

TASK-THYROX-0920 extendió la vía de selección que TASK-THYROX-0750 iba a migrar, por una búsqueda acotada a 'fallback'
