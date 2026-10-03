# H-THYROX-460

```json
{
 "finding_id": "H-THYROX-460",
 "created_at": "2026-10-03T21:46:05",
 "updated_at": "2026-10-03T21:46:05",
 "severity": "ALTA",
 "initiative": "thyrox/self-implementation",
 "status": "open",
 "source_ref": ".claude/jobs/qualify-workflow-8k-0931-20261003T214232/outputs/salida.log; src/packages/cli/src/entry/systemPrompt.ts:40",
 "observations": [
  {
   "fact": "repo-code-change@1 en qwen3-4b a ctx 8192: exceed_context_size_error, n_prompt_tokens 26085 en el primer turno. thyrox -p desde un worktree del árbol apila THYROX.md y todas las reglas .claude/rules sin paths. Las etapas 16K y 24K tampoco alcanzan; la palanca es --system-budget-tokens, ahora declarable en la suite y registrada en runtimeProfile.systemBudgetTokens. Además, la suspensión sin tokens no se escribía (velocidad no positiva): ahora se escribe con 0.",
   "evidence": ".claude/jobs/qualify-workflow-8k-0931-20261003T214232/outputs/salida.log; src/packages/cli/src/entry/systemPrompt.ts:40"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T21:46:05",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    ".claude/jobs/qualify-workflow-8k-0931-20261003T214232/outputs/salida.log; src/packages/cli/src/entry/systemPrompt.ts:40"
   ]
  }
 ],
 "current_assessment": "El prompt del worker local mide 26 085 tokens en su primer turno: 8K no alcanza sin presupuesto de sistema"
}
```

## OBSERVATION

- repo-code-change@1 en qwen3-4b a ctx 8192: exceed_context_size_error, n_prompt_tokens 26085 en el primer turno. thyrox -p desde un worktree del árbol apila THYROX.md y todas las reglas .claude/rules sin paths. Las etapas 16K y 24K tampoco alcanzan; la palanca es --system-budget-tokens, ahora declarable en la suite y registrada en runtimeProfile.systemBudgetTokens. Además, la suspensión sin tokens no se escribía (velocidad no positiva): ahora se escribe con 0. — `.claude/jobs/qualify-workflow-8k-0931-20261003T214232/outputs/salida.log; src/packages/cli/src/entry/systemPrompt.ts:40`

## ASSESSMENT HISTORY

- 2026-10-03T21:46:05: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

El prompt del worker local mide 26 085 tokens en su primer turno: 8K no alcanza sin presupuesto de sistema
