# H-THYROX-466

```json
{
 "finding_id": "H-THYROX-466",
 "created_at": "2026-10-03T22:11:29",
 "updated_at": "2026-10-03T22:11:29",
 "severity": "MEDIA",
 "initiative": "thyrox/functional-capability-audit",
 "status": "open",
 "source_ref": "src/packages/local-models/admittedEmbed.ts; src/packages/local-models/qualifyModel.ts:148; src/packages/semantic-search/spaces.ts:132",
 "observations": [
  {
   "fact": "admittedEmbed habla con /api/embed de la unidad Ollama del ticket; su único consumidor es runEmbeddingQualification, que nunca corrió (0 cualificaciones embedding) y no hay modelo de embeddings en el catálogo. Ningún paquete depende de @thyrox/semantic-search: el store sabe crear/activar espacios y guardar vectores, pero no hay productor que lleve vectores de admittedEmbed a putEmbedding. Resuelve la contradicción store implementado / productor ausente.",
   "evidence": "src/packages/local-models/admittedEmbed.ts; src/packages/local-models/qualifyModel.ts:148; src/packages/semantic-search/spaces.ts:132"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T22:11:29",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    "src/packages/local-models/admittedEmbed.ts; src/packages/local-models/qualifyModel.ts:148; src/packages/semantic-search/spaces.ts:132"
   ]
  }
 ],
 "current_assessment": "admittedEmbed existe y nada lo conecta al corpus: la orquestación de embeddings sólo la consume la cualificación"
}
```

## OBSERVATION

- admittedEmbed habla con /api/embed de la unidad Ollama del ticket; su único consumidor es runEmbeddingQualification, que nunca corrió (0 cualificaciones embedding) y no hay modelo de embeddings en el catálogo. Ningún paquete depende de @thyrox/semantic-search: el store sabe crear/activar espacios y guardar vectores, pero no hay productor que lleve vectores de admittedEmbed a putEmbedding. Resuelve la contradicción store implementado / productor ausente. — `src/packages/local-models/admittedEmbed.ts; src/packages/local-models/qualifyModel.ts:148; src/packages/semantic-search/spaces.ts:132`

## ASSESSMENT HISTORY

- 2026-10-03T22:11:29: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

admittedEmbed existe y nada lo conecta al corpus: la orquestación de embeddings sólo la consume la cualificación
