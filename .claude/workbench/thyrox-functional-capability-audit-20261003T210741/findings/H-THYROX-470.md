# H-THYROX-470

```json
{
 "finding_id": "H-THYROX-470",
 "created_at": "2026-10-03T23:11:51",
 "updated_at": "2026-10-03T23:18:30",
 "severity": "ALTA",
 "initiative": "thyrox/self-implementation",
 "status": "open",
 "source_ref": ".claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/REPORT.md",
 "observations": [
  {
   "fact": "qwen3-4b bc640142 Q4_K_M: repo-code-change@1 FAIL (rechazado)",
   "evidence": "experiments/repo-code-change-qwen3-4b-r1"
  },
  {
   "fact": "qwen2.5-7b-instruct bb5d59e0 Q4_K_M: repo-code-change@1 FAIL r1 (sin-cambios)",
   "evidence": "experiments/repo-code-change-qwen25-7b-instruct-r1"
  },
  {
   "fact": "qwen2.5-7b-instruct bb5d59e0 Q4_K_M: repo-code-change@1 FAIL r2 (rechazado)",
   "evidence": "experiments/repo-code-change-qwen25-7b-instruct-r2"
  },
  {
   "fact": "qwen2.5-coder-7b 13fb94bf Q4_K_M: tool-calling@1 2/6, no elegible",
   "evidence": "experiments/tool-calling-qwen25-coder-7b-8k-r1"
  },
  {
   "fact": "perfil: local, unidad gestionada, 8K, presupuesto de sistema 2048, prompt limpio, vigilante",
   "evidence": "experiments/*/runtime-profile.json"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T23:11:51Z",
   "previous": null,
   "new": "HARD_PHYSICAL_LIMIT",
   "reason": "redacción inicial tras la segunda muestra de qwen2.5-7b: «ningún modelo que cabe en el contenedor completa repo-code-change@1»",
   "evidence": [
    "evidence/store-revisions/H-THYROX-470@fd3d113ce.json",
    "snapshots/report-20261003T231152Z-fd3d113ce.md"
   ]
  },
  {
   "timestamp": "2026-10-03T23:18:30Z",
   "previous": "HARD_PHYSICAL_LIMIT",
   "new": "BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE",
   "reason": "corrección del ejecutor: se probaron identidades concretas bajo un perfil concreto; el techo mezclaba configuración y materialización con física",
   "evidence": [
    "evidence/store-revisions/H-THYROX-470@HEAD.json",
    "snapshots/report-20261003T231847Z-6f011826c.md",
    "outputs/resources/ram.txt",
    "outputs/resources/disk.txt"
   ]
  },
  {
   "timestamp": "2026-10-03T23:21:16Z",
   "previous": "BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE",
   "new": "MIXED (provisional, clasificación del DAG)",
   "reason": "las corridas contienen evidencia de MODEL_CAPABILITY, TOOL_PROTOCOL y WORKFLOW, y un RUNTIME_PROFILE no explorado; PHYSICAL no demostrado",
   "evidence": [
    "snapshots/report-20261003T232116Z-d5502b7b6.md"
   ]
  }
 ],
 "current_assessment": "CURRENT_LOCAL_MODELS_FAIL_REPO_CODE_CHANGE_ACCEPTANCE: las identidades probadas fallan repo-code-change@1 bajo el perfil actual (BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE)"
}
```

## OBSERVATION

- qwen3-4b bc640142 Q4_K_M: repo-code-change@1 FAIL (rechazado) — `experiments/repo-code-change-qwen3-4b-r1`
- qwen2.5-7b-instruct bb5d59e0 Q4_K_M: repo-code-change@1 FAIL r1 (sin-cambios) — `experiments/repo-code-change-qwen25-7b-instruct-r1`
- qwen2.5-7b-instruct bb5d59e0 Q4_K_M: repo-code-change@1 FAIL r2 (rechazado) — `experiments/repo-code-change-qwen25-7b-instruct-r2`
- qwen2.5-coder-7b 13fb94bf Q4_K_M: tool-calling@1 2/6, no elegible — `experiments/tool-calling-qwen25-coder-7b-8k-r1`
- perfil: local, unidad gestionada, 8K, presupuesto de sistema 2048, prompt limpio, vigilante — `experiments/*/runtime-profile.json`

## ASSESSMENT HISTORY

- 2026-10-03T23:11:51Z: None → **HARD_PHYSICAL_LIMIT** — redacción inicial tras la segunda muestra de qwen2.5-7b: «ningún modelo que cabe en el contenedor completa repo-code-change@1»
- 2026-10-03T23:18:30Z: HARD_PHYSICAL_LIMIT → **BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE** — corrección del ejecutor: se probaron identidades concretas bajo un perfil concreto; el techo mezclaba configuración y materialización con física
- 2026-10-03T23:21:16Z: BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE → **MIXED (provisional, clasificación del DAG)** — las corridas contienen evidencia de MODEL_CAPABILITY, TOOL_PROTOCOL y WORKFLOW, y un RUNTIME_PROFILE no explorado; PHYSICAL no demostrado

## CURRENT ASSESSMENT

CURRENT_LOCAL_MODELS_FAIL_REPO_CODE_CHANGE_ACCEPTANCE: las identidades probadas fallan repo-code-change@1 bajo el perfil actual (BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE)
