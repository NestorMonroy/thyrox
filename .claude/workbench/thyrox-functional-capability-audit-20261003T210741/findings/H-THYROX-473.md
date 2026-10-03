# H-THYROX-473

```json
{
 "finding_id": "H-THYROX-473",
 "created_at": "2026-10-03T23:27:56",
 "updated_at": "2026-10-03T23:27:56",
 "severity": "ALTA",
 "initiative": "thyrox/functional-capability-audit",
 "status": "open",
 "source_ref": "src/agents/agent_store.py:cmd_add_finding; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/evidence/store-revisions/",
 "observations": [
  {
   "fact": "findings_history es un upsert (ON CONFLICT DO UPDATE): reclasificar H-THYROX-470 y ampliar H-THYROX-469 borró sus textos previos en el store; se recuperaron de los blobs versionados de agent_store.sqlite3. Mientras el store no guarde revisiones, la historia de evaluaciones de la auditoría vive en findings/*.md del banco.",
   "evidence": "src/agents/agent_store.py:cmd_add_finding; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/evidence/store-revisions/"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T23:27:56",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    "src/agents/agent_store.py:cmd_add_finding; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/evidence/store-revisions/"
   ]
  }
 ],
 "current_assessment": "agregar-hallazgo --force sobrescribe la fila sin conservar la versión anterior: el store no guarda la historia de un hallazgo"
}
```

## OBSERVATION

- findings_history es un upsert (ON CONFLICT DO UPDATE): reclasificar H-THYROX-470 y ampliar H-THYROX-469 borró sus textos previos en el store; se recuperaron de los blobs versionados de agent_store.sqlite3. Mientras el store no guarde revisiones, la historia de evaluaciones de la auditoría vive en findings/*.md del banco. — `src/agents/agent_store.py:cmd_add_finding; .claude/workbench/thyrox-functional-capability-audit-20261003T210741/evidence/store-revisions/`

## ASSESSMENT HISTORY

- 2026-10-03T23:27:56: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

agregar-hallazgo --force sobrescribe la fila sin conservar la versión anterior: el store no guarda la historia de un hallazgo
