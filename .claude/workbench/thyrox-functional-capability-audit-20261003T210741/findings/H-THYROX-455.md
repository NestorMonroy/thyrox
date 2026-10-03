# H-THYROX-455

```json
{
 "finding_id": "H-THYROX-455",
 "created_at": "2026-10-03T20:54:49",
 "updated_at": "2026-10-03T20:54:49",
 "severity": "ALTA",
 "initiative": "actualizar-agentic-ai-thyrox",
 "status": "open",
 "source_ref": ".claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md",
 "observations": [
  {
   "fact": "decidePrintRoute (printDelegation.ts:71) devuelve own si resolveCredential encuentra credencial, aunque --model sea thyrox-*. headless-pool --execution host con la fuente por defecto inherit hereda el entorno; sólo --execution unit no entrega credenciales. Ninguna regla obliga a la unidad para trabajo de autoimplementación.",
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
 "current_assessment": "thyrox -p elige la ruta por la credencial, no por la localidad del modelo: un trabajo local puede salir del anfitrión"
}
```

## OBSERVATION

- decidePrintRoute (printDelegation.ts:71) devuelve own si resolveCredential encuentra credencial, aunque --model sea thyrox-*. headless-pool --execution host con la fuente por defecto inherit hereda el entorno; sólo --execution unit no entrega credenciales. Ninguna regla obliga a la unidad para trabajo de autoimplementación. — `.claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md`

## ASSESSMENT HISTORY

- 2026-10-03T20:54:49: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

thyrox -p elige la ruta por la credencial, no por la localidad del modelo: un trabajo local puede salir del anfitrión
