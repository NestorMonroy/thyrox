# H-THYROX-464

```json
{
 "finding_id": "H-THYROX-464",
 "created_at": "2026-10-03T22:11:29",
 "updated_at": "2026-10-03T22:11:29",
 "severity": "CRITICA",
 "initiative": "thyrox/functional-capability-audit",
 "status": "open",
 "source_ref": ".claude/jobs/local-control-plane-ready-full-20261003T100423/outputs/salida.log; .claude/workbench/postgres-corpus-disk-reclaim-20261002T023317/outputs/T003-snapshot-after.json; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/ml/04-observe-volumes.json",
 "observations": [
  {
   "fact": "El corpus (1675 documentos, 9981 chunks el 2026-10-02) ya no existe: thyrox-postgres-data se creó 2026-10-03T10:04:25 (observe volumes; PG_VERSION nacido 10:04:32) y local-control-plane-ready-full-20261003T100423 registró action=created volumes=thyrox-postgres-data:created. La reconciliación trata un volumen durable ausente como algo que crear, sin rehusar ni avisar de pérdida de datos; y volumes=…:preserved (0928) sólo mide el enganche. Quien lo borró antes de las 10:04 no está registrado.",
   "evidence": ".claude/jobs/local-control-plane-ready-full-20261003T100423/outputs/salida.log; .claude/workbench/postgres-corpus-disk-reclaim-20261002T023317/outputs/T003-snapshot-after.json; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/ml/04-observe-volumes.json"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T22:11:29",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    ".claude/jobs/local-control-plane-ready-full-20261003T100423/outputs/salida.log; .claude/workbench/postgres-corpus-disk-reclaim-20261002T023317/outputs/T003-snapshot-after.json; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/ml/04-observe-volumes.json"
   ]
  }
 ],
 "current_assessment": "El volumen durable del corpus desapareció y la reconciliación creó uno vacío sin avisar; preserved no mide contenido"
}
```

## OBSERVATION

- El corpus (1675 documentos, 9981 chunks el 2026-10-02) ya no existe: thyrox-postgres-data se creó 2026-10-03T10:04:25 (observe volumes; PG_VERSION nacido 10:04:32) y local-control-plane-ready-full-20261003T100423 registró action=created volumes=thyrox-postgres-data:created. La reconciliación trata un volumen durable ausente como algo que crear, sin rehusar ni avisar de pérdida de datos; y volumes=…:preserved (0928) sólo mide el enganche. Quien lo borró antes de las 10:04 no está registrado. — `.claude/jobs/local-control-plane-ready-full-20261003T100423/outputs/salida.log; .claude/workbench/postgres-corpus-disk-reclaim-20261002T023317/outputs/T003-snapshot-after.json; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/outputs/ml/04-observe-volumes.json`

## ASSESSMENT HISTORY

- 2026-10-03T22:11:29: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

El volumen durable del corpus desapareció y la reconciliación creó uno vacío sin avisar; preserved no mide contenido
