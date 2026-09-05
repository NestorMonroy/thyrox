```yml
Fecha: 2026-03-27
Proyecto: THYROX
Tipo: PRD (Phase 4: STRUCTURE)
Autor: Claude Code + Human
Estado: Borrador
```

# PRD: Completar documentación THYROX (FASE 3 del ROADMAP)

## Overview

Completar la documentación del framework THYROX para que sea coherente, validada, y lista para reutilización. Esto incluye optimizar SKILL.md, actualizar docs públicos, y ejecutar validación final.

---

## User Stories

**Como developer** que usa THYROX por primera vez, quiero que SKILL.md sea conciso (<500 líneas) para que Claude Code lo cargue eficientemente sin desperdiciar tokens.

**Como contributor** que llega al proyecto, quiero que ARCHITECTURE.md y CONTRIBUTING.md reflejen el estado real para no perder tiempo con información incorrecta.

**Como CI/CD pipeline**, quiero que los scripts validate-* retornen exit 0 para confirmar integridad del proyecto.

---

## Acceptance Criteria

### SKILL.md Optimización
- [x] SKILL.md tiene ≤500 líneas
- [x] Contenido movido a references/ está correctamente enlazado
- [x] Todas las secciones esenciales se mantienen (7 fases, commands table, exit conditions, where outputs live)

### Documentación Pública
- [x] ARCHITECTURE.md refleja decisiones reales del proyecto (no aspiracionales)
- [x] CONTRIBUTING.md describe el flujo de trabajo actual con THYROX
- [x] CHANGELOG.md documenta v0.1.0 y v0.2.0 con trabajo real

### Validación
- [x] `validate-missing-md-links.sh` retorna exit 0
- [x] `validate-broken-references.py` retorna exit 0 (o solo documentales)
- [x] Todas las transiciones entre fases verificadas

---

## Technical Approach

### SKILL.md → <500 líneas

Secciones actuales (~1050 líneas):
1. Metadata + intro (~45 líneas) — mantener
2. 7 Phases (~350 líneas) — mantener core, mover detalles
3. Natural Language Commands (~20 líneas) — mantener
4. File Locations (~45 líneas) — mantener
5. Where Outputs Live (~30 líneas) — mantener
6. ROADMAP format (~25 líneas) — mantener
7. Git Commit format (~25 líneas) — mantener
8. Example Workflow (~90 líneas) — mover a references/examples.md
9. Key Principles (~15 líneas) — mantener
10. Tips & Best Practices (~15 líneas) — mantener
11. Differences from CCPM (~15 líneas) — mantener
12. When NOT to Use (~10 líneas) — mantener
13. Recursos Avanzados (~75 líneas) — mover a references/
14. Exit Conditions (~25 líneas) — mantener resumen, mover detalle
15. Escalabilidad (~80 líneas) — mover a references/
16. Sub-Agents (~60 líneas) — mover a references/
17. Tracking & Metrics (~30 líneas) — mover a references/
18. Troubleshooting (~15 líneas) — mantener
19. Next Steps (~10 líneas) — mantener

**Mover a references:** ~335 líneas (Example Workflow, Recursos Avanzados, Escalabilidad, Sub-Agents, Tracking)
**Resultado estimado:** ~1050 - 335 = ~715 líneas. Necesita más reducción.
**Reducción adicional:** Compactar Phase descriptions eliminando redundancia.

### ARCHITECTURE.md

Reescribir para reflejar:
- Estructura real: pm-thyrox/ con scripts/references/assets
- Decisiones reales: Markdown only, git only, single skill, ANALYZE first
- Eliminar secciones aspiracionales (Node.js, PostgreSQL, Docker — no implementados)

### CONTRIBUTING.md

Reescribir para reflejar:
- Flujo de trabajo con THYROX (7 fases)
- Conventional Commits como están implementados
- Eliminar prerrequisitos aspiracionales (npm, jest — no existen)

---

## Out of Scope

- Implementar api/ y build/ (son sub-proyectos futuros)
- CI/CD pipeline (FASE 4 del ROADMAP)
- Generalizar como template reutilizable (FASE 4 del ROADMAP)

---

## Siguiente Paso

→ Pasar a Phase 5: DECOMPOSE (descomponer en tasks atómicas)
