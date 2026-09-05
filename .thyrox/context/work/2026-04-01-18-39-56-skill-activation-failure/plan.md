```yml
Tipo: Phase 5 — DECOMPOSE
Work package: 2026-04-01-18-39-56-skill-activation-failure
Fecha: 2026-04-01
```

# Tareas: SKILL Activation Failure + Haiku Compatibility

Spec: [spec.md](spec.md) — 16 RF, 3 RNF, design exacto por archivo.

---

## Scope

**Dentro:** CLAUDE.md, session-start.sh, settings.json, SKILL.md (7 fases + escalabilidad)
**Fuera:** examples.md (T-DT-001, deuda técnica)

---

## Bloque A — Activación triple capa (D1)

- [x] [T-001] Reemplazar sección "Flujo de sesión" en CLAUDE.md con lenguaje OBLIGATORIO + instrucción Skill tool + fallback inline (R-1, R-2)
  - **Archivo:** [CLAUDE](.claude/CLAUDE.md)
  - **Done cuando:** contiene "OBLIGATORIO", "Skill tool → pm-thyrox", "Si el Skill tool no está disponible"
  - **Paralelo con:** T-002, T-004–T-010

- [x] [T-002] Crear `.claude/skills/pm-thyrox/scripts/session-start.sh` con detección de WP activo y mensaje de activación (R-3) [P]
  - **Archivo:** `.claude/skills/pm-thyrox/scripts/session-start.sh` (nuevo)
  - **Done cuando:** archivo existe, es ejecutable (`chmod +x`), imprime "REQUERIDO: Invocar Skill tool"
  - **Paralelo con:** T-001, T-004–T-010

- [x] [T-003] Configurar SessionStart hook en `.claude/settings.json` apuntando a session-start.sh (R-3)
  - **Archivo:** `.claude/settings.json` (crear si no existe)
  - **Done cuando:** settings.json contiene entrada `SessionStart` con comando `session-start.sh`
  - **Depende de:** T-002

---

## Bloque B — SKILL.md gates Baja Libertad (D2)

- [x] [T-004] SKILL.md Phase 1: 8 aspectos explícitos + definición de decisión arquitectónica + "REQUERIDO:" en template + exit criteria verificable (R-4, R-5, R-6, R-7) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:**
    - Paso 1 lista ≥8 aspectos nombrados (no dice solo "Investigar requisitos")
    - Paso ADR tiene ≥3 ejemplos de decisión arquitectónica
    - Línea de introduction.md.template contiene "REQUERIDO:"
    - Exit criteria menciona "introduction.md" + "NEEDS CLARIFICATION"
  - **Paralelo con:** T-001, T-002, T-005–T-010

- [x] [T-005] SKILL.md Phase 2: insertar PASO 0 "REQUERIDO: Leer solution-strategy.md" + aclarar que Key Ideas se basan en analysis/ (R-8) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:** Phase 2 tiene paso antes de "Key Ideas" con "REQUERIDO" y link a solution-strategy
  - **Paralelo con:** T-001, T-002, T-004, T-006–T-010

- [x] [T-006] SKILL.md Phase 3: agregar instrucción explícita de verificar WP + volver a Phase 1 si no existe (R-9) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:** paso 2 de Phase 3 menciona verificar context/work/ y acción si no existe
  - **Paralelo con:** T-001, T-002, T-004, T-005, T-007–T-010

- [x] [T-007] SKILL.md Phase 4: cambiar referencia spec-quality-checklist de sugestiva a "REQUERIDO: completar ANTES de Phase 5. NO avanzar" + exit criteria con [NEEDS CLARIFICATION] (R-10) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:** contiene "REQUERIDO: Completar" y "NO avanzar" en Phase 4; exit criteria menciona [NEEDS CLARIFICATION]
  - **Paralelo con:** T-001, T-002, T-004–T-006, T-008–T-010

- [x] [T-008] SKILL.md Phase 5: definir "work package activo = directorio más reciente en context/work/" en paso 1 (R-11) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:** paso 1 de Phase 5 tiene definición explícita de WP activo
  - **Paralelo con:** T-001, T-002, T-004–T-007, T-009–T-010

- [x] [T-009] SKILL.md Phase 6: especificar fuente de tareas (plan.md) + ERR-NNN con ruta y template + corregir numeración duplicada 1→6 (R-12, R-13, R-14) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:**
    - Paso 1 menciona "plan.md" explícitamente
    - Paso de error menciona "context/errors/" y "error-report.md.template"
    - Pasos numerados 1,2,3,4,5,6 sin repetición
  - **Paralelo con:** T-001, T-002, T-004–T-008, T-010

- [x] [T-010] SKILL.md Escalabilidad: agregar tabla explícita tamaño → fases activas → qué omitir (R-15) [P]
  - **Archivo:** [SKILL](.claude/skills/pm-thyrox/SKILL.md)
  - **Done cuando:** existe tabla o lista con ≥3 filas de tamaño de trabajo y fases correspondientes
  - **Paralelo con:** T-001, T-002, T-004–T-009

---

## Bloque C — Verificación no-degradación (RNF)

- [x] [T-011] Re-ejecutar `bash .claude/skills/pm-thyrox/scripts/run-functional-evals.sh` y verificar ≥40/40 (R-16)
  - **Done cuando:** script termina con resultado ≥40/40 (100%)
  - **Si baja:** revertir última tarea del Bloque B, diagnosticar, re-ejecutar
  - **Depende de:** T-004, T-005, T-006, T-007, T-008, T-009, T-010

---

## Deuda técnica (fuera de scope)

- [ ] [T-DT-001] Actualizar examples.md — nomenclatura de fases desactualizada (Phase 1=PLAN → ANALYZE)
  - **Prioridad:** baja, no bloquea compatibilidad Haiku

---

## Árbol de dependencias

```
T-001 ────────────────────────────────────────────────────────┐
T-002 → T-003                                                 │
T-004 ──┐                                                     ├──→ [CP-2] → T-011 → [CP-3]
T-005 ──┤                                                     │
T-006 ──┤                                                     │
T-007 ──┤                                                     │
T-008 ──┤                                                     │
T-009 ──┤                                                     │
T-010 ──┘                                                     │
──────────────────────────────────────────────────────────────┘
         ↑ [CP-1] después de T-001 + T-003
```

---

## Checkpoints

**CP-1** (después de T-001 + T-003):
- CLAUDE.md tiene lenguaje obligatorio → `grep -c "OBLIGATORIO" .claude/CLAUDE.md` ≥ 1
- settings.json tiene SessionStart → `grep -c "SessionStart" .claude/settings.json` ≥ 1
- session-start.sh es ejecutable → `test -x .claude/skills/pm-thyrox/scripts/session-start.sh`

**CP-2** (después de T-004 a T-010 — antes de evals):
- SKILL.md no supera 500 líneas → `wc -l .claude/skills/pm-thyrox/SKILL.md`
- Ningún "REQUERIDO:" en contenido de análisis (solo en gates) — revisión manual
- SKILL.md no tiene [NEEDS CLARIFICATION] → `grep -c "NEEDS CLARIFICATION" .claude/skills/pm-thyrox/SKILL.md` = 0

**CP-3** (después de T-011):
- Evals ≥ 40/40 → continuar a Phase 7: TRACK
- Si resultado < 40/40 → identificar tarea responsable, revertir, diagnosticar
