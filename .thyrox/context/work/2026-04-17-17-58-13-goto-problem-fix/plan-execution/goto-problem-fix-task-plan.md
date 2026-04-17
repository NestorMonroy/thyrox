```yml
created_at: 2026-04-17 19:30:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Stage 8 — PLAN EXECUTION
author: NestorMonroy
status: Borrador
version: 1.4.0
```

# Task Plan — goto-problem-fix (ÉPICA 41)

> **Generado desde:** `plan/goto-problem-fix-plan.md`
> **Alcance:** 30 problemas en 4 clusters — migración parcial acumulada ÉPICAs 29/31/35/39
> **Ruta crítica:** T-001 → T-002 → T-003 → T-004 (Batch 1) → Batches 2-5 en paralelo

> **v1.4.0** — Actualizado tras sesión de naming + terminología. Cambios:
> - Terminología "cajón" → "stage directory" en metadata-standards.md
> - Sub-análisis del WP reorganizados bajo domain subdirectories (`analyze/coverage/`, `analyze/naming/`)
> - T-023/T-024/T-025: nuevo Batch B7 — auditoría y fix de skill templates (E-1)
> - Regla de flat namespace collapse y taxonomía de 3 niveles documentadas

> **v1.3.0** — Actualizado tras `analyze/coverage/discover-to-plan-execution-coverage.md`. Cambios:
> - T-015: agregar comportamientos no-lineales (BABOK, RM/PPS state machines, RUP milestones, SP ciclo, artefactos ×11) (Gap F-1)
> - T-017: agregar greps A-1/A-3/A-6/B-2/B-4 (Gap F-3)
> - T-021: corregir hooks reales — `close-wp.sh` es script manual, no StopHook (Gap F-2 bloqueante)
> - B1 header: agregar nota de referencias Tier 1 (Gap F-4)

> **v1.2.0** — Actualizado tras `analyze/audit-coverage-review.md`. Cambios:
> - T-009: agregar cifras exactas 47 referencias + 23 agentes (Gap R-1)
> - T-011: agregar documentación de `.thyrox/registry/` como fuente de verdad (Gap R-2)
> - T-015: aclarar campo interno `steps:` en YAMLs (Gap R-4)
> - T-021: nueva tarea — documentar hooks en ARCHITECTURE.md (Gap R-3)

> **v1.1.0** — Actualizado tras `analyze/task-plan-coverage-review.md`. Cambios:
> - T-001: agregar declaración `PROJECT_ROOT` + paths absolutos (Gap 1 bloqueante)
> - T-007: especificar destino `state-management.md` (Gap 5)
> - T-009: agregar prerequisito lectura previa + opción de split (Gap 3 bloqueante)
> - T-011: reemplazar "Patrón 3+5" por descripción concreta (Gap 4)
> - T-013: cambiar "Actualizar" → "Crear `/DECISIONS.md`" en raíz (Gap 2 bloqueante)
> - T-018: incluir `focus.md` (Gap 7)
> - T-020: nueva tarea ROADMAP.md (Gap 6)

---

## Convención de tarea

Opción C — tareas genéricas con trazabilidad a problema raíz.
Formato: `T-NNN Descripción (ID-problema)`

---

## B1 — Scripts (ruta crítica)

> Orden interno: close-wp.sh primero (más bugs), luego session-start.sh, luego session-resume.sh.
> Prerequisito de todos los demás batches: si los scripts están rotos, los docs describen comportamiento incorrecto.
> **Leer antes de editar:** `.claude/references/state-management.md` (reglas de now.md) y `.claude/references/hooks.md` (semántica SessionStart/PostCompact).

- [ ] **T-001** Fix `close-wp.sh` (A-4 + A-5 + A-6): agregar al inicio `PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"` y `NOW_FILE="${PROJECT_ROOT}/.thyrox/context/now.md"`; agregar patrones `sed -i'' -e` para `stage:`, `flow:`, `methodology_step:` (con retrocompat `phase:`); agregar cleanup bash-puro del body `# Contexto` con `head`/`printf`/`mv` (DS-02, sin python3); agregar llamada `bash "${PROJECT_ROOT}/.claude/scripts/update-state.sh" || true` al final (A-4, A-5, A-6)
- [ ] **T-002** Fix `session-start.sh` (A-1 + GAP-02): eliminar fallback líneas 61-63; comprimir comentarios L9-12→1 línea, eliminar separador L37, eliminar L40-41 — resultado exacto: 120 líneas (A-1, GAP-02)
- [ ] **T-003** Fix `session-resume.sh` (A-2 + A-3): reemplazar línea 36 para leer `stage:` primero con fallback `phase:` (mismo patrón que session-start.sh L48-49); eliminar bloque fallback líneas 46-48 (A-2, A-3)
- [ ] **T-004** Validar sintaxis y líneas: `bash -n .claude/scripts/close-wp.sh && bash -n .claude/scripts/session-start.sh && bash -n .claude/scripts/session-resume.sh && wc -l .claude/scripts/session-start.sh`
- [ ] **T-005** Commit B1: `fix(goto-problem-fix): fix session scripts phase→stage migration A-1..A-6 GAP-02`

---

## B2 — Documentación de estado (state-management + methodology_step)

> Puede ejecutarse en paralelo con B3, B4 y B5 después de completar B1.
> D-1 documenta el comportamiento que A-5 implementa — hacerlo post-fix para documentar la solución real.

- [ ] **T-006** Actualizar `.claude/references/state-management.md` (D-1): agregar sección `## # Contexto body` documentando que es LLM-managed, que `close-wp.sh` lo resetea al cerrar WP con el patrón `head`/`printf`, y su formato canónico; agregar campos `flow` y `methodology_step` con sus valores válidos en la tabla de campos YAML (D-1)
- [ ] **T-007** En el mismo `state-management.md`, agregar subsección `### methodology_step — namespacing por coordinator` con tabla completa: namespace, coordinator, pasos válidos para los 11 coordinators (`dmaic:define..control`, `pdca:plan..act`, `ba:planning..solution-evaluation`, `rup:inception..transition`, `rm:elicitation..management`, `pm:initiating..closing`, `lean:define..control`, `bpa:identify..monitor`, `pps:clarify..evaluate`, `sp:context..adjust`, `cp:initiation..evaluate`) (D-4)
- [ ] **T-008** Commit B2: `docs(goto-problem-fix): document now.md body and methodology_step namespacing D-1 D-4`

---

## B3 — README

> Independiente de B2, B4 y B5. Leer README.md completo justo antes del Edit para garantizar contexto fresco.
> Si el Edit resulta demasiado extenso, dividir: T-009a (fixes puntuales B-1/B-2/B-3/B-4/B-5/B-6/B-9) y T-009b (reescritura de secciones B-7/B-8).

- [ ] **T-009** Leer `README.md` completo, luego aplicar todos los fixes B-1..B-9 en un Edit: renombrar `pm-thyrox`→`thyrox` (×5 ocurrencias), actualizar Quick Start con nota de migración `setup-template.sh` y alternativa correcta, corregir "Phase 1: ANALYZE"→"Stage 1: DISCOVER", reemplazar `/task:show`/`/task:next` por equivalentes actuales, actualizar árbol de directorios `.claude/context/`→`.thyrox/context/`, reemplazar "7 fases SDLC"→"12 stages THYROX" con descripción actualizada, agregar sección Coordinators nueva con tabla de 11 coordinators, actualizar versión a v2.8.0 y fecha actual, **actualizar cifras: "47 referencias, 23 agentes"** (B-1, B-2, B-3, B-4, B-5, B-6, B-7, B-8, B-9)
- [ ] **T-010** Commit B3: `docs(goto-problem-fix): update README for ÉPICA 29/31/35/39 migrations B-1..B-9`

---

## B4 — ARCHITECTURE.md

> Independiente de B2, B3 y B5.

- [ ] **T-011** Actualizar `ARCHITECTURE.md` (B-10): agregar sección de arquitectura coordinator con las 4 capas (intake → routing-rules.yml → coordinators → artifact-ready signals), diagrama de flujo `methodology_step` → coordinator → worktree, campos `flow`/`methodology_step` en now.md, lista de 11 coordinators con su metodología y tipo de flujo (secuencial/cíclico/no-secuencial/state-machine/iterativo); **documentar `.thyrox/registry/` como fuente de verdad**: subdirectorios `agents/` y `methodologies/` (11 YAMLs), roles de `bootstrap.py` y `_generator.sh`, referencia a `routing-rules.yml`; corregir ADR-004: `pm-thyrox`→`thyrox` y "21 references"→"47" (B-10)
- [ ] **T-012** Commit B4: `docs(goto-problem-fix): update ARCHITECTURE.md with coordinator pattern B-10`

---

## B5 — DECISIONS.md + guías de metodología

> Independiente de B2, B3 y B4. Preferible después de B2 para que D-4 ya esté documentado.

- [ ] **T-013** Crear `DECISIONS.md` en la raíz del proyecto (el archivo no existe): tabla-índice de los 22 ADRs en `.thyrox/context/decisions/` con columnas: ADR, título, estado, ÉPICA donde se tomó la decisión, y link relativo al archivo (B-11)
- [ ] **T-014** Crear `.claude/references/methodology-selection-guide.md` (D-2): tabla de 11 metodologías con columnas: cuándo usar, tipo de flujo, señales de contexto que activan el coordinator, output principal, coordinador a invocar (D-2)
- [ ] **T-015** Crear `.claude/references/coordinator-integration.md` (D-3): contrato de invocación (cómo llamar a un coordinator via `@coordinator-name`), campos `now.md::flow` + `now.md::methodology_step`, ciclo de vida del coordinator (activate → steps → artifact-ready signal), sección `now.md::coordinators` para tracking multi-coordinator, `isolation: worktree` y su significado, ejemplo paso a paso con dmaic-coordinator; aclarar que el campo interno en YAMLs es `steps:` (no `phases:`); **documentar comportamientos no-lineales**: (a) BABOK no-secuencial (6 knowledge areas sin orden fijo, routing por contexto), (b) RM y PPS como state machines con retornos condicionales (RM: analysis→elicitation si gaps, validation→analysis si falla; PPS: evaluate→analyze si target no alcanzado), (c) RUP con milestones formales LCO/LCA/IOC/PD como tollgates, (d) SP con ciclo estratégico `sp:adjust → sp:analysis`; **tabla de artefactos producidos por cada uno de los 11 coordinators** (D-3)
- [ ] **T-016** Commit B5: `docs(goto-problem-fix): add methodology guides and DECISIONS.md index B-11 D-2 D-3`

---

## B6 — Infraestructura del framework (hooks + registry)

> Independiente de todos los demás batches. Documenta infraestructura existente que ningún batch anterior cubre.

- [ ] **T-021** Agregar sección "Hooks del framework" en `ARCHITECTURE.md` — **⚠ ejecutar DESPUÉS de T-011, ambos tocan el mismo archivo**: documentar los 3 hooks reales registrados en `.claude/settings.json` (SessionStart→session-start.sh, PostCompact→session-resume.sh, Stop→stop-hook-git-check.sh) con propósito de cada uno; documentar `close-wp.sh` como **script de cierre manual del WP** (no es un hook — se invoca explícitamente, no por evento); documentar `.thyrox/registry/` como fuente de verdad (subdirectorios, roles de bootstrap.py y _generator.sh) (Gap R-2 + Gap R-3)
- [ ] **T-022** Commit B6: `docs(goto-problem-fix): document hooks and registry infrastructure in ARCHITECTURE.md`

---

## Cierre

- [ ] **T-017** Verificar cobertura final — todos los greps deben retornar vacío excepto donde se indica:
  ```bash
  grep "pm-thyrox" README.md                                         # vacío
  grep "^phase:" .claude/scripts/session-resume.sh                   # vacío
  grep "^phase:" .claude/scripts/close-wp.sh                        # vacío
  grep "7 fases" README.md                                           # vacío
  grep "\.claude/context/" README.md                                 # vacío
  grep "19 guías\|25 templates" README.md                           # vacío
  grep "setup-template\.sh\|/task:show\|/task:next" README.md       # vacío
  grep "fallback\|ls -1.*work" .claude/scripts/session-start.sh     # vacío (A-1)
  grep "fallback\|ls -1.*work" .claude/scripts/session-resume.sh    # vacío (A-3)
  grep "update-state" .claude/scripts/close-wp.sh                   # con match (A-6)
  wc -l .claude/scripts/session-start.sh                            # ≤120
  ```
- [ ] **T-018** Actualizar `now.md` y `focus.md`: stage → `Stage 11 — TRACK/EVALUATE`, cuerpo al estado post-ÉPICA 41
- [ ] **T-019** Commit cierre + push: `chore(goto-problem-fix): advance to Stage 11 TRACK/EVALUATE` + `git push -u origin claude/check-merge-status-Dcyvj`
- [ ] **T-020** Actualizar `ROADMAP.md`: marcar ÉPICA 41 con todos los stages completados, WP real `2026-04-17-17-58-13-goto-problem-fix`, estado COMPLETADO y fecha de cierre

---

## DAG de dependencias

```
T-001 (close-wp.sh A-4+A-5+A-6)
T-002 (session-start.sh A-1+GAP-02)  ──→ T-004 (validar) ──→ T-005 (commit B1)
T-003 (session-resume.sh A-2+A-3)                                     │
                                                                       ↓
                   ┌───────────────────────────────────────────────────┤
                   │              │                │                   │
             T-006 (D-1)   T-009 (README)   T-013 (DECISIONS)   T-021 (hooks)
             T-007 (D-4)   T-010 (B3)       T-014 (guide D-2)   T-022 (B6)
             T-008 (B2)    T-011 (ARCH)     T-015 (guide D-3)
                           T-012 (B4)       T-016 (B5)
                   └───────────────────────────────────────────────────┘
                                                │
                                   T-017 (verificar) → T-018 (now+focus) → T-019 (push) → T-020 (ROADMAP)
```

---

## Stopping Points

| SP | Tarea | Condición de parada |
|----|-------|---------------------|
| SP-B1 | Pre-T-005 | T-004 debe pasar: `bash -n` sin errores en 3 scripts Y `wc -l session-start.sh` muestra ≤120 |

---

## B7 — Skill templates (metadata-standards alignment)

> Independiente de todos los demás batches. Auditar y actualizar templates de skills que usan
> terminología "cajón" o no reflejan la taxonomía de 3 niveles (stage directory → domain subdirectory → artifact).

- [ ] **T-023** Auditar todos los `assets/*.md.template` en skills `workflow-*`: listar los que referencian "cajón", usan estructura plana sin domain subdirectories, o tienen ejemplos de naming invertido (`{type}-{content}.md`); producir tabla con: skill, template, hallazgo, fix requerido (E-1)
- [ ] **T-024** Aplicar fixes en templates afectados: reemplazar "cajón" → "stage directory", actualizar ejemplos de naming al patrón correcto, agregar nota de domain subdirectories donde aplique (E-1)
- [ ] **T-025** Commit B7: `docs(goto-problem-fix): align skill templates with stage-directory naming convention E-1`

---

## Out-of-scope

- Índice de referencias (47 docs) y agents (23) → ÉPICA 42
- Reescritura completa de scripts (solo fixes quirúrgicos)
- Migración big-bang de terminología histórica en docs pre-ÉPICA 39

---

## Resumen de progreso

| Batch | Tareas | Completadas | Pendientes |
|-------|--------|-------------|------------|
| **B1 — Scripts** | 5 | 0 | 5 |
| **B2 — State docs** | 3 | 0 | 3 |
| **B3 — README** | 2 | 0 | 2 |
| **B4 — ARCHITECTURE.md** | 2 | 0 | 2 |
| **B5 — DECISIONS + guides** | 4 | 0 | 4 |
| **B6 — Hooks + registry** | 2 | 0 | 2 |
| **B7 — Skill templates** | 3 | 0 | 3 |
| **Cierre** | 4 | 0 | 4 |
| **Total** | **25** | **0** | **25** |
