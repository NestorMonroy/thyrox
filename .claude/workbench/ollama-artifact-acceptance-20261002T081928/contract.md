# Contrato — TASK-THYROX-0900: aceptar artefactos de Ollama por digest y cualificar cada capacidad por separado

Autoridad arquitectónica: ADR-007 enmienda 1.16.0 (`kaupamex-docs`). Ejecuta:
la sesión propietaria del artefacto y del catálogo (ver README). Medido sobre
`origin/feature/ai-course-notes-l1@de4284e33`; quien ejecute re-mide antes del
primer rojo.

## 1. Reglas (generales: no son de Qwen ni de traducción)

```text
Ollama is an allowed artifact source.
Artifact acceptance != task qualification.
Artifact identity = exact artifact identified by digest.
Capability = artifact identity + qualification suite + qualification version.
```

- **Aceptación** decide si un artefacto concreto puede existir y ejecutarse en
  thyrox: identidad fija (sha256 del blob ejecutado), procedencia registrada,
  licencia declarada, formato y runtimes compatibles.
- **Cualificación** decide para qué capacidades ese artefacto está demostrado.
  Un artefacto aceptado tiene cero, una o varias cualificaciones independientes.
  Ninguna implica otra; un FAIL no invalida las demás ni el artefacto.
- `source = ollama` es una **fuente permitida**, nunca «cualificado para todo».
  Aceptación y capacidad son dos gates distintos.
- **Procedencia ≠ runtime.** `source` dice de dónde vino el artefacto;
  `compatibleRuntimes` dice qué runtime puede ejecutarlo. Un GGUF de origen
  Ollama puede declarar `llama.cpp` como compatible sólo si se cualifica o
  verifica en ese runtime.
- **Garantías no verificadas son información, no deuda.** Se registran en
  `provenanceNotes`; nunca bloquean aceptación, cualificación ni ejecución, ni
  abren un hallazgo, una condición de cierre o una cualificación pendiente.

## 2. Gaps medidas

| # | Requisito | Mecanismo existente | Veredicto | Evidencia |
|---|---|---|---|---|
| G1 | registrar el artefacto exacto y verificar su sha256 | `declareInstalledModel` | REUSE | `local-models/declareInstalledModel.ts:74,81` (`requireBlobDigest`) |
| G2 | metadata del formato | `readGgufMetadata` vía `catalogEntryFromGguf` | REUSE; el parser ad-hoc se descarta | `model-artifacts/ggufMetadata.ts`, `modelCatalog.ts:96` |
| G3 | licencia declarada | sólo en la ruta HF (`ExternalProvenance.license`, por defecto `undeclared`) y tomada de la ficha, no del GGUF; **0** lecturas de `general.license` en producción | EXTEND | `externalArtifact.ts:47,90` |
| G4 | notas de procedencia / garantías no verificadas | no existe en ninguna ruta | ADD (campo informativo) | `catalogEntry.ts:35-53` |
| G5 | runtimes compatibles separados de la fuente | implícito en `source`; la política sólo admite `runtime: 'ollama'` | EXTEND | `catalogEntry.ts:39`, `executionPolicy.ts:32,43` |
| G6 | identidad de la cualificación = artefacto + suite + versión | `latestFor` agrupa por `(model, scope)` y toma la más reciente por `measuredAt`; la versión de la suite no entra en la clave | EXTEND | `modelQualification.ts:149,168` |
| G7 | capacidades (`translation`, `code`, `summarization`, `tool-calling`…) | `LOCAL_TASK_CLASSES` son clases de **esfuerzo**: `mecanica`, `analisis`, `adversarial`, `frontera` | **DECISIÓN** | `modelQualification.ts:23` |
| G8 | un FAIL de una capacidad no invalida otra | `qualifiedModels` exige `passed(protocol) && passed(task)`: un `tool-calling@1` FAIL impide cualquier tarea | **EXTEND — decidido** (abajo) | `modelQualification.ts:202,215`; ADR-007 1.10.0 (`eligible = tool_protocol_compatible ∧ task_suite_passed`) |
| G9 | política por fuente | `executionPolicy` con selector `source` (`hf`/`ollama`) | REUSE | `executionPolicy.ts` |
| G10 | historial de cualificaciones | `qualificationStore` (solo-añadir, reemplazo atómico) | REUSE; no se diseña otro store | `local-models/qualificationStore.ts` |

**G8 — decidido por el ejecutor (2026-10-02): el protocolo se hace siempre, no
es requisito.** La cualificación de protocolo (`tool-calling@N`) se ejecuta y
se registra para todo artefacto, como una capacidad más, y **no es
prerrequisito de ninguna otra**. Una ruta que usa herramientas la exige porque
`tool-calling` es su capacidad. La regla queda
`eligible(ruta) = la capacidad que la ruta necesita pasó, en su versión`
(ADR-007 1.16.0).

**G7 — pendiente de decisión.** Propuesta: un eje de **capacidad** distinto del
de esfuerzo; una cualificación de tarea declara la capacidad que mide
(`translation`, `code`, …) y su suite versionada. El eje de esfuerzo sigue
sirviendo a `recommend(tipo, perfil)`. A7 queda bloqueada hasta que conste.

## 3. Tareas (TDD; rojo persistido contra la base, anulación por guarda)

| Id | Entrega | Archivos propios | Depende |
|---|---|---|---|
| A1 | `declareInstalledModel` persiste `license` desde `general.license` del GGUF (vía `readGgufMetadata`); ausente → `undeclared`, nunca inventada | `local-models/declareInstalledModel.ts`, `model-artifacts/catalogEntry.ts`, sus pruebas | — |
| A2 | campo opcional `provenanceNotes: string[]` en la entrada; `local-models-catalog declare --provenance-note <texto>` (repetible); **ningún** código de política, elegibilidad, scheduling o admisión lo lee | `catalogEntry.ts`, `catalogCommand.ts`, `declareInstalledModel.ts`, sus pruebas | A1 |
| A3 | campo `compatibleRuntimes: string[]` separado de `source`; la declaración desde Ollama escribe `['ollama']`; un runtime más se añade sólo con su cualificación o verificación registrada | `catalogEntry.ts`, `declareInstalledModel.ts`, `executionPolicy.ts`, sus pruebas | A1 |
| A4 | la clave de la cualificación incluye la suite (`id@versión`); `latestFor` no deja que una versión pise a otra; prueba explícita: con `translation@1` PASS y `tool-calling@1` FAIL, la primera sigue PASS y el artefacto sigue aceptado | `model-artifacts/modelQualification.ts`, su prueba | — |
| A5 | G8: `qualifiedModels` deja de exigir `passed(protocol)` para toda tarea; la elegibilidad pide la capacidad de la ruta. Pruebas: `tool-calling` FAIL + capacidad de tarea PASS → elegible para la ruta sin herramientas y no elegible para la ruta con herramientas; la cualificación de protocolo sigue ejecutándose y registrándose | `model-artifacts/modelQualification.ts`, `provider/src/cost/policy.ts`, sus pruebas | A4 |
| A7 | G7: eje de capacidad | `modelQualification.ts`, `provider/src/cost/policy.ts`, sus pruebas | **decisión del ejecutor pendiente** |
| A6 | registrar el Qwen real: declarar el blob exacto, licencia leída del GGUF, `compatibleRuntimes: ['ollama']`, la nota de §4, y la entrada de política con `source: 'ollama'` | catálogo y política de la sesión propietaria (datos, no código) | A1, A2, A3 |

Las cualificaciones del Qwen por capacidad vienen después de A6, por la suite
de cada capacidad; no forman parte de este contrato.

## 4. El Qwen actual

Artefacto ya declarado en el catálogo de la sesión propietaria:
`thyrox-library--qwen2.5-7b-instruct:q4_k_m-ollama-845dbda0ea48`, blob
`sha256:2bada8a7…`, 4 683 073 952 bytes, GGUF v3, `general.license = apache-2.0`,
339 tensores, `general.file_type = 15` (Q4_K_M).

`provenanceNotes`, verbatim:

```text
Upstream equivalence was not verified. No byte-by-byte or tensor-by-tensor comparison against Qwen/Qwen2.5-7B-Instruct-GGUF was performed.
Upstream equivalence may be verified in the future if a policy or use case explicitly requires that guarantee.
```

Sin condición de cierre. No es hallazgo, ni blocker, ni cualificación pendiente.

## 5. Prohibido en este contrato

- tensor hashing y comparación con los shards oficiales;
- cualquier parser GGUF fuera de `model-artifacts/ggufMetadata.ts` (el script
  ad-hoc en `python3` se descarta);
- un segundo store de cualificaciones;
- que `provenanceNotes` o `source` aparezcan en una condición de elegibilidad;
- convertir toda la metadata GGUF en campos obligatorios del catálogo: el
  catálogo guarda identidad y propiedades estables; los hechos del formato se
  leen de `ggufMetadata` cuando hacen falta.

## 6. Verificación

`verify/A<n>.sh`: alcance (`scope.sh` de 0743), rojo contra la base
(`red_against_base.sh` de 0743), suites de los paquetes tocados, y gates de §5:

- `git grep -nE "provenanceNotes" -- src/packages/provider src/packages/model-scheduling` → 0;
- `git grep -lE "b'GGUF'|'GGUF'|\"GGUF\"" -- src ':!src/packages/model-artifacts/ggufMetadata.ts' ':!**/__tests__/**'` → 0 nuevos;
- ninguna ruta de producción escribe `sha256` de tensores.

## 7. Ids

Reserva por sesión en H-THYROX-318 (`kaupamex-docs@da5438b04`): esta sesión
acuña `TASK-THYROX-0900+` y `H-THYROX-400+`; la propietaria conserva su
secuencia y no renumera trabajo vivo.
