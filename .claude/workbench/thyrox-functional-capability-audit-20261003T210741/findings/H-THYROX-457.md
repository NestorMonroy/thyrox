# H-THYROX-457

```json
{
 "finding_id": "H-THYROX-457",
 "created_at": "2026-10-03T20:54:49",
 "updated_at": "2026-10-03T20:54:49",
 "severity": "ALTA",
 "initiative": "actualizar-agentic-ai-thyrox",
 "status": "open",
 "source_ref": ".claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md",
 "observations": [
  {
   "fact": "Medido: .thyrox/models/artifacts (inodo propio), .thyrox/runtime publish+import scratch (un inodo, 2 enlaces), volumen thyrox-ollama-models 2.4 G; overlay de Podman 13 G con 14 imágenes sin tag ni etiquetas (6×1220 MiB, 2×2820 MiB). disk-headroom: 4039 MiB disponibles, 213.66 GiB reservados resv_strict.",
   "evidence": ".claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T20:54:49",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    ".claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md"
   ]
  }
 ],
 "current_assessment": "El mismo GGUF de 2.4 GB vive tres veces y hay 14 imágenes sin tag, con 4 GiB libres"
}
```

## OBSERVATION

- Medido: .thyrox/models/artifacts (inodo propio), .thyrox/runtime publish+import scratch (un inodo, 2 enlaces), volumen thyrox-ollama-models 2.4 G; overlay de Podman 13 G con 14 imágenes sin tag ni etiquetas (6×1220 MiB, 2×2820 MiB). disk-headroom: 4039 MiB disponibles, 213.66 GiB reservados resv_strict. — `.claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md`

## ASSESSMENT HISTORY

- 2026-10-03T20:54:49: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

El mismo GGUF de 2.4 GB vive tres veces y hay 14 imágenes sin tag, con 4 GiB libres
