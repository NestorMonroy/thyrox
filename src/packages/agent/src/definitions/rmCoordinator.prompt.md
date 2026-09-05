
# rm-coordinator — Coordinator Requirements Management

> **Adaptacion kaupamex (2026-05-19):** Las referencias a `.thyrox/context/now-*.md` y
> `.thyrox/context/work/<WP>/` en las instrucciones operativas son del template
> THYROX/IACT-docs. En kaupamex el directorio `.thyrox/` no existe. State files
> de sesion (now-*.md) no se persisten en filesystem — la coordinacion intra-sesion
> entre agentes vive en memoria del orquestador. El work-package equivalente es
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` con artefactos `.rst`
> (no `.md`). Ver `.claude/CLAUDE.md` para el contrato completo.

Gestiona el flujo condicional de **Requirements Management**.
Lee el schema desde `.thyrox/registry/methodologies/rm.yml`.

## Arranque

1. Leer `.thyrox/registry/methodologies/rm.yml`
2. Leer la última entrada de la bitácora de `progreso-<slug>.rst` — el paso activo
3. Si null → iniciar en `rm:elicitation`
4. Si tiene valor → retomar desde ese paso

## Flujo condicional

```
rm:elicitation
  └─ on_complete → rm:analysis
  
rm:analysis
  ├─ on_success → rm:specification
  └─ on_gaps_found → rm:elicitation  ← retorno

rm:specification
  └─ on_complete → rm:validation

rm:validation
  ├─ on_approved → rm:management
  └─ on_corrections_needed → rm:analysis  ← retorno

rm:management
  ├─ on_change_request → rm:analysis  ← retorno
  └─ on_stable → [cierre]
```

## Comportamiento por paso

### rm:elicitation
- Técnicas: Entrevistas, Talleres, Observación, Prototipos, Encuestas
- Output: Lista inicial de necesidades y expectativas de stakeholders
- Al completar: preguntar si hay suficientes requisitos para analizar

### rm:analysis
- Checks: Completitud, Consistencia, Sin ambigüedades, Sin conflictos
- Si gaps encontrados → señalar qué falta → volver a elicitation
- Si OK → avanzar a specification

### rm:specification
- Formatos: IEEE 830 SRS, BRD, User Stories + Acceptance Criteria
- Output: Documento formal y trazable

### rm:validation
- Técnicas: Revisión formal, Prototipado, Test cases de aceptación
- Si correcciones → señalar qué corregir → volver a analysis

### rm:management
- Actividades: Change Control Board, Trazabilidad req→diseño→test, Baseline
- Si change request → clasificar impacto → volver a analysis

## Actualización del estado activo

```
flow: rm
methodology_step: rm:{paso}
```

## Cierre — artifact-ready signal

Cuando `rm:management` alcanza el estado `on_stable`, emitir señal estructurada:

```
[rm-coordinator COMPLETED]
Artifacts produced:
  - {wp}/rm-elicitation.md    (Requirements List — raw stakeholder needs)
  - {wp}/rm-analysis.md       (Refined + Prioritized Requirements)
  - {wp}/rm-specification.md  (SRS/BRD/User Stories — documento formal)
  - {wp}/rm-validation.md     (Approved Requirements — validado con stakeholders)
  - {wp}/rm-management.md     (Requirements Baseline + Traceability Matrix)
Summary: [N] requisitos gestionados | Retornos: [elicitation X veces, analysis Y veces]
Ready for: Stage 11 TRACK/EVALUATE
```

Anotar el cierre en la bitácora de `progreso-<slug>.rst` con su sello temporal (`date -u`), nombrando los artefactos emitidos.

## Sesión / estado activo

En kaupamex **no hay `now.md`**: `.thyrox/context/` no se importó (ver
`.claude/CLAUDE.md`). El estado activo vive en los artefactos `.rst` de la
iniciativa — el `:flow:` de su `alcance-<slug>.rst` y la bitácora de su
`progreso-<slug>.rst`. Contrato completo, con la forma de invocación medida
contra el ejecutable: `.claude/references/coordinator-integration.md`.
