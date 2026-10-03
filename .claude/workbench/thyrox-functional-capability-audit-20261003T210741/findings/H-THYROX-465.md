# H-THYROX-465

```json
{
 "finding_id": "H-THYROX-465",
 "created_at": "2026-10-03T22:11:29",
 "updated_at": "2026-10-03T22:11:29",
 "severity": "MEDIA",
 "initiative": "thyrox/functional-capability-audit",
 "status": "open",
 "source_ref": "src/packages/local-models/hostCoordinatorComposition.ts:50,80; src/packages/local-models/transformers-runtime/transformers_runtime_server.py:145; .claude/jobs/build-transformers-runtime-20261002T030337/salida.log",
 "observations": [
  {
   "fact": "RUNTIME_BY_FORMAT envía safetensors a transformers y la composición registra TransformersRuntimeAdapter con localhost/thyrox-transformers-runtime:dev, pero el único build (2026-10-02) salió 1 al commitear una capa, observe images no la tiene y declaredImages no la declara: nada la reconstruye. El servidor sólo sirve seq2seq (MADLAD/T5); no hay endpoint de embeddings ni de clasificación.",
   "evidence": "src/packages/local-models/hostCoordinatorComposition.ts:50,80; src/packages/local-models/transformers-runtime/transformers_runtime_server.py:145; .claude/jobs/build-transformers-runtime-20261002T030337/salida.log"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T22:11:29",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    "src/packages/local-models/hostCoordinatorComposition.ts:50,80; src/packages/local-models/transformers-runtime/transformers_runtime_server.py:145; .claude/jobs/build-transformers-runtime-20261002T030337/salida.log"
   ]
  }
 ],
 "current_assessment": "El runtime de Transformers está integrado en el coordinador pero su imagen nunca se construyó y no está en el catálogo de imágenes"
}
```

## OBSERVATION

- RUNTIME_BY_FORMAT envía safetensors a transformers y la composición registra TransformersRuntimeAdapter con localhost/thyrox-transformers-runtime:dev, pero el único build (2026-10-02) salió 1 al commitear una capa, observe images no la tiene y declaredImages no la declara: nada la reconstruye. El servidor sólo sirve seq2seq (MADLAD/T5); no hay endpoint de embeddings ni de clasificación. — `src/packages/local-models/hostCoordinatorComposition.ts:50,80; src/packages/local-models/transformers-runtime/transformers_runtime_server.py:145; .claude/jobs/build-transformers-runtime-20261002T030337/salida.log`

## ASSESSMENT HISTORY

- 2026-10-03T22:11:29: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

El runtime de Transformers está integrado en el coordinador pero su imagen nunca se construyó y no está en el catálogo de imágenes
