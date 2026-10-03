# H-THYROX-467

```json
{
 "finding_id": "H-THYROX-467",
 "created_at": "2026-10-03T22:17:18",
 "updated_at": "2026-10-03T22:17:18",
 "severity": "ALTA",
 "initiative": "thyrox/functional-capability-audit",
 "status": "open",
 "source_ref": "src/packages/podman-execution/containerRun.ts:runJobWithOutput; src/session/headless-pool.sh",
 "observations": [
  {
   "fact": "runJobWithOutput lee podman logs después de wait, así que <n>.stream.jsonl de un ítem --execution unit está vacío mientras corre. El vigilante (F7) no veía llamadas repetidas y su plazo de 1800 s sin eventos habría detenido un ítem sano; en la cualificación real se retiró a mano sólo su proceso vigilante. Ahora el payload de la unidad copia su salida en vivo con tee al directorio montado (<n>.live.jsonl, código de salida por PIPESTATUS) y el vigilante lee esa copia en modo unidad.",
   "evidence": "src/packages/podman-execution/containerRun.ts:runJobWithOutput; src/session/headless-pool.sh"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T22:17:18",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    "src/packages/podman-execution/containerRun.ts:runJobWithOutput; src/session/headless-pool.sh"
   ]
  }
 ],
 "current_assessment": "La salida de un ítem en unidad llega sólo al terminar: el vigilante no veía nada y su plazo sin progreso habría matado ítems sanos"
}
```

## OBSERVATION

- runJobWithOutput lee podman logs después de wait, así que <n>.stream.jsonl de un ítem --execution unit está vacío mientras corre. El vigilante (F7) no veía llamadas repetidas y su plazo de 1800 s sin eventos habría detenido un ítem sano; en la cualificación real se retiró a mano sólo su proceso vigilante. Ahora el payload de la unidad copia su salida en vivo con tee al directorio montado (<n>.live.jsonl, código de salida por PIPESTATUS) y el vigilante lee esa copia en modo unidad. — `src/packages/podman-execution/containerRun.ts:runJobWithOutput; src/session/headless-pool.sh`

## ASSESSMENT HISTORY

- 2026-10-03T22:17:18: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

La salida de un ítem en unidad llega sólo al terminar: el vigilante no veía nada y su plazo sin progreso habría matado ítems sanos
