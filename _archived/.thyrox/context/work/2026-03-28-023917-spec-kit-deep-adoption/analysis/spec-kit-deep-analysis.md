```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis profundo (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/spec-kit/
Scope: Flujos completos, conexiones, mecanismos de calidad
```

# Análisis Profundo: spec-kit — Flujos y Conexiones

## Resumen

spec-kit tiene 3 capas de calidad que THYROX aún no tiene: **flujos encadenados** (un comando produce el input del siguiente), **mecanismos de prevención** (gates que bloquean malos outputs), y **enforcement cruzado** (cada artefacto valida los anteriores).

---

## 1. Cadena de Comandos (Pipeline)

```
specify → plan → tasks → implement
   ↑         ↑       ↑        ↑
   │         │       │        └── checklists verificados antes de ejecutar
   │         │       └── analyze (readonly, detecta inconsistencias)
   │         └── constitution check (gate mandatorio)
   │
   └── clarify (resuelve ambigüedades en spec)
```

**Cada comando produce exactamente lo que el siguiente necesita:**
- specify → spec.md (requerimientos) → input de plan
- plan → plan.md + research.md + data-model.md + contracts/ → input de tasks
- tasks → tasks.md (lista ejecutable) → input de implement
- implement → código + tests

**THYROX no tiene esta cadena.** Nuestras fases producen documentos, pero no hay validación de que el output de Phase N sea suficiente para Phase N+1.

---

## 2. Mecanismos que Previenen Bad Output

### 2.1 [NEEDS CLARIFICATION] como first-class citizen

spec-kit marca ambigüedades explícitamente:
- Máximo 3 markers en spec
- Plan DEBE resolverlos todos antes de avanzar
- Si persisten → clarify command los resuelve interactivamente
- Tasks.md NO puede contener [NEEDS CLARIFICATION]

**THYROX no tiene este concepto.** Nuestras specs pueden tener ambigüedades implícitas que se descubren en ejecución.

### 2.2 Checklist como gate pre-implementación

implement.md verifica:
1. Escanea checklists/ completo
2. Cuenta items total/completados/incompletos
3. Si hay incompletos → PARA y pregunta al usuario
4. Solo continúa con aprobación explícita

**THYROX ahora tiene spec-quality-checklist pero no está integrado como gate automático en el flujo.**

### 2.3 Constitution como autoridad suprema

- Plan DEBE pasar constitution check antes de Phase 0 research
- Plan RE-CHEQUEA constitution después de Phase 1 design
- Analyze flaggea violaciones como CRITICAL
- Violaciones requieren justificación documentada en "Complexity Tracking"

**THYROX ahora tiene constitution template pero no tiene double-check (pre y post design).**

### 2.4 Analyze como readonly validator

analyze.md es un comando que NO modifica nada. Solo detecta:
- Duplicaciones entre requisitos
- Ambigüedades (adjetivos vagos sin métricas)
- Underspecification (requisitos sin outcome medible)
- Constitution alignment violations
- Coverage gaps (requisitos sin tasks)
- Inconsistencias (terminology drift)

Máx 50 findings, con severidad CRITICAL/HIGH/MEDIUM/LOW.

**THYROX tiene detect scripts para links/refs pero no tiene un "analyze" que valide consistencia semántica entre documentos.**

---

## 3. Data Flow: Cómo los campos fluyen entre templates

### User Stories → Task Phases

```
spec.md: User Story 1 [P1] "Login"
  ├── Independent Test
  ├── Acceptance Scenarios (Given/When/Then)
  └── Priority: P1
      ↓
tasks.md: Phase 3: User Story 1 — Login (P1) 🎯 MVP
  ├── Goal: [extraído del Independent Test]
  ├── Tests for US1 (T010-T012)
  └── Implementation for US1 (T013-T018)
```

### Requirements → Tasks (trazabilidad)

```
spec.md: FR-001 "System MUST authenticate users"
      ↓
plan.md: Technical Context → "bcrypt for password hashing"
      ↓
tasks.md: T005 [P] "Implement password hashing library (bcrypt)"
      ↓
checklist.md: CHK004 "Passwords hashed with bcrypt, not plaintext"
```

### Priority → Execution Order

| Priority | spec.md | tasks.md | Execution |
|----------|---------|----------|-----------|
| P1 | User Story 1 | Phase 3 🎯 MVP | Primero |
| P2 | User Story 2 | Phase 4 | Segundo |
| P3 | User Story 3 | Phase 5 | Último |

**THYROX no tiene mapping directo de prioridades a fases de ejecución.**

---

## 4. Scripts como automación determinística

### create-new-feature.sh
- Auto-detecta número secuencial (git branches + specs/)
- Crea branch + directorio + copia template
- Output JSON parseado por el comando

### setup-plan.sh
- Resuelve paths del feature (repo root, branch, spec dir)
- Copia plan template
- Prepara ambiente para planning

### check-prerequisites.sh
- Valida que feature dir existe
- Lista docs disponibles (research, data-model, contracts, etc.)
- Gate: falla si prerequisites faltan

### update-agent-context.sh
- Parsea plan.md → extrae tech stack
- Actualiza 22 archivos de agente con tecnologías activas
- Auto-detecta qué agentes existen

### common.sh (utilidades compartidas)
- resolve_template() → stack de resolución de 4 niveles
- get_feature_paths() → resolución de paths del feature
- Funciones de validación y JSON escaping

**THYROX tiene 6 scripts (detect/convert/validate) pero no tiene scripts de flujo (create feature, setup plan, check prerequisites, update context).**

---

## 5. Sistema de Hooks (extensibilidad)

```
before_specify → [ejecuta extensiones] → specify → after_specify → [ejecuta extensiones]
before_plan    → [ejecuta extensiones] → plan    → after_plan    → [ejecuta extensiones]
before_tasks   → [ejecuta extensiones] → tasks   → after_tasks   → [ejecuta extensiones]
before_implement → [ejecuta ext.]      → implement → after_implement → [ejecuta ext.]
```

Hooks pueden ser:
- **optional: true** → pregunta al usuario
- **optional: false** → se ejecuta automáticamente

**THYROX no tiene hooks.** Todo es manual.

---

## 6. Template Resolution (4 niveles)

```
1. .specify/templates/overrides/     ← project-local overrides
2. .specify/presets/<id>/templates/   ← presets (por prioridad)
3. .specify/extensions/<id>/templates/ ← extensions
4. .specify/templates/               ← core defaults
```

First match wins. Lower priority number = higher precedence.

**THYROX tiene 1 nivel:** assets/. No hay overrides ni presets.

---

## 7. Errores de THYROX detectados con este análisis profundo

| # | Error | Lo que spec-kit hace | THYROX gap |
|---|-------|---------------------|------------|
| ERR-012 | No hay cadena de inputs/outputs entre fases | Cada comando produce el input del siguiente | Fases son independientes |
| ERR-013 | No hay [NEEDS CLARIFICATION] mechanism | First-class citizen con máximo y resolución | Ambigüedades son implícitas |
| ERR-014 | No hay analyze command (validator semántico) | 6 tipos de detección, max 50 findings, readonly | Solo detect de links/refs |
| ERR-015 | No hay scripts de flujo (create feature, setup plan) | 5 scripts encadenados | Solo scripts de validación |
| ERR-016 | No hay double-check de constitution (pre + post design) | Check antes Y después de diseñar | Solo un check |
| ERR-017 | No hay mapping prioridad → fase de ejecución | P1→Phase 3 MVP, P2→Phase 4, P3→Phase 5 | Sin priorización formal |
| ERR-018 | No hay trazabilidad requirement → task → checklist | FR-001 → T005 → CHK004 | Documentos sueltos |

---

## 8. Qué adoptar vs qué no

### Adoptar (alto impacto, bajo esfuerzo)

1. **[NEEDS CLARIFICATION] markers** — Agregar convención a spec template y flujo
2. **Double constitution check** — Pre-design + post-design
3. **Trazabilidad en tasks** — Cada task referencia su requirement (FR-NNN)

### Evaluar (alto impacto, medio esfuerzo)

4. **Analyze command** — Script que valida consistencia entre spec/plan/tasks
5. **Scripts de flujo** — Al menos create-epic.sh y setup-plan.sh
6. **Priority → phase mapping** — Formalizar en tasks template

### No adoptar ahora (alto esfuerzo, bajo retorno para THYROX)

7. **Hooks system** — THYROX es un skill, no un CLI
8. **Template resolution stack** — 1 nivel es suficiente por ahora
9. **24-agent support** — THYROX solo necesita Claude Code
10. **Preset system** — Overcomplicado para un skill

---

**Última actualización:** 2026-03-28
