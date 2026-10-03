# H-THYROX-469

```json
{
 "finding_id": "H-THYROX-469",
 "created_at": "2026-10-03T22:36:15",
 "updated_at": "2026-10-03T23:21:15",
 "severity": "MEDIA",
 "initiative": "thyrox/self-implementation",
 "status": "open",
 "source_ref": "src/packages/local-models/labCommandOptions.ts:4; src/packages/podman-execution/executionCommand.ts:27; src/packages/image-registry/declaredImages.ts:39",
 "observations": [
  {
   "fact": "DEFAULT_LAB_IMAGE localhost/thyrox-model-quantizer:dev y DEFAULT_EXECUTION_IMAGE localhost/thyrox-task-runner:dev no existen localmente; el build declarado etiqueta candidate-<commit> y el runner sólo está por digest publicado (THYROX_EXEC_IMAGE en .env). declaredImages declara 1 imagen (quantizer); runner y transformers no están declarados. Un clon sin .env falla. El límite de 8 GiB del import más el piso supera la holgura medida (ver H-THYROX-471). Funcionó con THYROX_QUANTIZER_IMAGE=…candidate-2027edfaf1a2 y 5.5 GiB.",
   "evidence": "src/packages/local-models/labCommandOptions.ts:4; src/packages/podman-execution/executionCommand.ts:27; src/packages/image-registry/declaredImages.ts:39"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T22:36:15Z",
   "previous": null,
   "new": "registrado",
   "reason": "el import busca el laboratorio por :dev y pide 8 GiB",
   "evidence": [
    "evidence/store-revisions/H-THYROX-469@f7d65244e.json"
   ]
  },
  {
   "timestamp": "2026-10-03T23:21:15Z",
   "previous": "registrado",
   "new": "ampliado",
   "reason": "el mismo patrón :dev aparece en DEFAULT_EXECUTION_IMAGE; el catálogo declara una sola imagen; la causa de los 8 GiB pasa a H-THYROX-471",
   "evidence": [
    "evidence/store-revisions/H-THYROX-469@HEAD.json",
    "outputs/dims/04-images-jobs.txt"
   ]
  }
 ],
 "current_assessment": "Las imágenes por defecto se nombran por tags :dev fuera del catálogo declarado: laboratorio de import y runner de ejecución; además el import pide 8 GiB que la admisión no concede"
}
```

## OBSERVATION

- DEFAULT_LAB_IMAGE localhost/thyrox-model-quantizer:dev y DEFAULT_EXECUTION_IMAGE localhost/thyrox-task-runner:dev no existen localmente; el build declarado etiqueta candidate-<commit> y el runner sólo está por digest publicado (THYROX_EXEC_IMAGE en .env). declaredImages declara 1 imagen (quantizer); runner y transformers no están declarados. Un clon sin .env falla. El límite de 8 GiB del import más el piso supera la holgura medida (ver H-THYROX-471). Funcionó con THYROX_QUANTIZER_IMAGE=…candidate-2027edfaf1a2 y 5.5 GiB. — `src/packages/local-models/labCommandOptions.ts:4; src/packages/podman-execution/executionCommand.ts:27; src/packages/image-registry/declaredImages.ts:39`

## ASSESSMENT HISTORY

- 2026-10-03T22:36:15Z: None → **registrado** — el import busca el laboratorio por :dev y pide 8 GiB
- 2026-10-03T23:21:15Z: registrado → **ampliado** — el mismo patrón :dev aparece en DEFAULT_EXECUTION_IMAGE; el catálogo declara una sola imagen; la causa de los 8 GiB pasa a H-THYROX-471

## CURRENT ASSESSMENT

Las imágenes por defecto se nombran por tags :dev fuera del catálogo declarado: laboratorio de import y runner de ejecución; además el import pide 8 GiB que la admisión no concede
