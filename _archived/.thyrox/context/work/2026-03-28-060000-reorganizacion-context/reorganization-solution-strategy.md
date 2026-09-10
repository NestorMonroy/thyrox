```yml
Fecha: 2026-03-28
Proyecto: THYROX — Reorganización final
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: Reorganización de context/

## Research Step

### Unknown 1: ¿Qué hacer con los 25+ archivos en analysis/?

**Alternativas:**
- A) Moverlos a work/ como paquetes retroactivos — costoso, rompe historial
- B) Archivarlos como están y empezar limpio con work/ — simple, preserva historial
- C) Dejar analysis/ como está y crear work/ para trabajo FUTURO — no limpia nada

**Decisión:** B) Archivar analysis/ y empezar work/ limpio.
**Justificación:** Los 25+ archivos son registro histórico de esta sesión. No vale la pena reorganizarlos. El valor está en que el PRÓXIMO trabajo siga la estructura correcta.

### Unknown 2: ¿Eliminar epics/ y work-logs/?

**Alternativas:**
- A) Eliminar ambos — drástico
- B) Mantener epics/ vacío y eliminar work-logs/ — inconsistente
- C) Archivar contenido actual, eliminar directorios, usar work/ para todo — limpio

**Decisión:** C) Archivar y unificar en work/.
**Justificación:** epics/ tiene 1 epic (thyrox-documentation con 8 docs). work-logs/ tiene 1 log. Ambos migran a work/. Futuro trabajo va directo a work/.

### Unknown 3: ¿Cómo reducir CLAUDE.md y SKILL.md?

**Alternativas:**
- A) Reescribir ambos desde cero — riesgo de perder contenido
- B) Mover secciones a references/ dejando solo links — progresivo
- C) Crear CLAUDE.md nuevo (reglas puras) y SKILL.md nuevo (flujo mínimo) — radical pero limpio

**Decisión:** C) Nuevos archivos limpios. El contenido actual se preserva en references/.
**Justificación:** L-0002 de agentic-framework: "doubling length destroys compliance." No se puede podar incrementalmente — hay que empezar con lo esencial.

## Constitution Check

- ✅ Markdown only
- ✅ Git as persistence
- ✅ Single skill
- ✅ Anatomía oficial (scripts/, references/, assets/)

## Artefactos

| Acción | Archivo | Tipo |
|--------|---------|------|
| Crear | context/focus.md | Estado actual (operacional) |
| Crear | context/now.md | Estado sesión YAML (operacional) |
| Crear | context/constitution.md | Principios (estratégico, instanciado) |
| Crear | context/work/ | Directorio para trabajo futuro |
| Reescribir | CLAUDE.md | <50 líneas (reglas + locked decisions) |
| Reescribir | SKILL.md | <100 líneas (flujo esencial) |
| Archivar | context/analysis/ → context/work/2026-03-27-100000-thyrox-consolidation/ | Todo el trabajo de esta sesión como 1 work package |
| Archivar | context/epics/ → dentro del work package | El epic de documentación |
| Eliminar | context/work-logs/ | Reemplazado por work/ |

## Siguiente Paso

→ Phase 3: PLAN
