```yml
Tipo: Phase 3 — PLAN
Work package: 2026-04-01-18-39-56-skill-activation-failure
Fecha: 2026-04-01
```

# Plan: SKILL Activation Failure + Haiku Compatibility

Implementar las 3 decisiones de Phase 2: triple capa de activación (D1),
Baja Libertad en gates del SKILL (D2), work package en Phase 1 (D3).

---

## Scope

**Dentro:**
- CLAUDE.md — flujo de sesión obligatorio con triple capa
- session-start.sh — nuevo script de inicio de sesión
- settings.json — configurar SessionStart hook
- SKILL.md — gates Baja Libertad en las 7 fases + escalabilidad

**Fuera (deuda técnica):**
- examples.md desactualizado — issue separado, no bloquea

---

## Tareas

### Bloque A — Activación (D1)

- [ ] [T-001] Actualizar CLAUDE.md: flujo de sesión con lenguaje OBLIGATORIO + Skill tool + fallback (D1 capa 1)
- [ ] [T-002] Crear .claude/skills/pm-thyrox/scripts/session-start.sh (D1 capa 2) [P]
- [ ] [T-003] Configurar SessionStart hook en settings.json (D1 capa 2) — depende de T-002

### Bloque B — SKILL.md gates Baja Libertad (D2)

- [ ] [T-004] SKILL.md Phase 1: 8 aspectos explícitos + definir decisión arquitectónica + REQUERIDO template + exit criteria verificable (H1.1, H1.2, H1.3, H1.4) [P]
- [ ] [T-005] SKILL.md Phase 2: PASO 0 REQUERIDO solution-strategy + Key Ideas desde analysis/ (H2.1, H2.2) [P]
- [ ] [T-006] SKILL.md Phase 3: verificación WP con ls + volver a Phase 1 si no existe (H3.1) [P]
- [ ] [T-007] SKILL.md Phase 4: spec-quality-checklist REQUERIDO antes de Phase 5 + exit criteria (H4.1, H4.2) [P]
- [ ] [T-008] SKILL.md Phase 5: WP activo = más reciente en context/work/ (H5.1) [P]
- [ ] [T-009] SKILL.md Phase 6: fuente de tareas plan.md + ERR-NNN con ruta y template + renumerar pasos (H6.1, H6.2, H6.3) [P]
- [ ] [T-010] SKILL.md Escalabilidad: tabla explícita tamaño → fases activas → qué omitir (HE.1) [P]

### Bloque C — Verificación (mitigación riesgo degradación)

- [ ] [T-011] Re-ejecutar run-functional-evals.sh — verificar baseline 40/40 se mantiene (depende de T-004 a T-010)

### Deuda técnica (fuera de scope)

- [ ] [T-DT-001] Actualizar examples.md — nomenclatura de fases desactualizada (Phase 1=PLAN → ANALYZE)

---

## Paralelismo

Los bloques A y B son independientes entre sí: T-001, T-002, T-004 a T-010 pueden
ejecutarse en paralelo. T-003 depende de T-002. T-011 depende de todos los T-004 a T-010.

```
T-001 ──────────────────────────────────────────────────────────┐
T-002 → T-003                                                   │
T-004 ──┐                                                       │
T-005 ──┤                                                       ├──→ T-011
T-006 ──┤                                                       │
T-007 ──┤                                                       │
T-008 ──┤                                                       │
T-009 ──┤                                                       │
T-010 ──┘                                                       │
────────────────────────────────────────────────────────────────┘
```

---

## Checkpoints

- **CP-1** después de T-001, T-003: Verificar que CLAUDE.md y hook funcionan en sesión nueva
- **CP-2** después de T-004 a T-010: Revisar SKILL.md manualmente — ningún "REQUERIDO" restringe casos válidos
- **CP-3** después de T-011: Evals 40/40 → continuar. Si baja → revertir tarea problemática y diagnosticar
