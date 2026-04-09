```yml
type: Análisis de Work Package
work_package: 2026-04-09-22-47-58-technical-debt-resolution
fase: FASE 29
created_at: 2026-04-09 22:48:00
version: 1.0
```

# Análisis — technical-debt-resolution (FASE 29)

## 1. Problema central

El framework pm-thyrox acumula 32 ítems de deuda técnica (TD-001..TD-032).
La mayoría afectan directamente la confiabilidad del ciclo SDLC: fases que se saltan,
documentos incompletos que pasan gates, artefactos de tracking desincronizados, y scripts
que necesitan reglas más robustas.

En las últimas 3 FASEs (26, 27, 28) el usuario tuvo que corregir manualmente:
- 4 transiciones de fase donde Claude propuso saltar fases obligatorias (TD-029)
- 4 gaps de Phase 6 no detectados automáticamente (TD-032)
- 1 reclasificación de WP que Claude no propagó (TD-028)
- 1 deep review de spec que encontró errores en datos que Claude asumió sin verificar (TD-031)

**Problema raíz unificado:** El framework tiene instrucciones correctas pero sin mecanismos
de refuerzo — ni en SKILL.md (instrucciones incompletas) ni en hooks (sin automatización).

---

## 2. Inventario completo de deuda técnica

### Estado de cada TD

| TD | Severidad | Estado | Descripción resumida | Área |
|----|-----------|--------|---------------------|------|
| TD-001 | media | [ ] | Timestamps incompletos en artefactos | conventions |
| TD-002 | alta | [ ] | Phase 3 no produce plan.md en WP | SKILL.md Phase 3 |
| TD-003 | baja | [ ] | Templates huérfanos sin flujo asignado | assets/ |
| TD-004 | alta | [ ] | SKILL.md supera ~700 líneas (confiabilidad) | arquitectura |
| TD-005 | media | [ ] | Arquitectura monolítica — evaluar alternativas | investigación |
| TD-006 | media | [ ] | pm-thyrox debe ser thin orchestrator | arquitectura |
| TD-007 | media | [ ] | Phase 1 sin Step 0 END USER CONTEXT | SKILL.md Phase 1 |
| TD-008 | alta | [ ] | /workflow_* commands desactualizados | commands/ |
| TD-009 | media | [ ] | now-{agent-name}.md no implementado en agentes | agents/ |
| TD-010 | baja | [ ] | Benchmark empírico SKILL vs CLAUDE.md | investigación |
| TD-011 | alta | [ ] | Task-plan sin granularidad atómica (instrucción débil) | SKILL.md Phase 5 |
| TD-016 | alta | [ ] | Phase 3 no verifica existencia de archivos | SKILL.md Phase 3 |
| TD-017 | media | [ ] | Criterios de cambio de FASE no documentados | CLAUDE.md |
| TD-018 | baja | [ ] | execution-log sin timestamp completo | conventions |
| TD-019 | alta | [-] | Nomenclatura workflow_* → RESUELTO FASE 23 | — |
| TD-020 | media | [-] | Escalabilidad en workflow_* → RESUELTO FASE 23 | — |
| TD-021 | media | [ ] | Phase N no mapea explícitamente a /workflow_* | pm-thyrox SKILL |
| TD-022 | baja | [ ] | Limitaciones conocidas no en workflow_* skills | workflow-*/SKILL.md |
| TD-023 | media | [-] | References sin propietario → RESUELTO FASE 23 | — |
| TD-024 | media | [-] | agent-spec.md desactualizado → RESUELTO FASE 23 | — |
| TD-025 | baja | [ ] | skill-authoring.md desactualizado | references/ |
| TD-026 | media | [ ] | ROADMAP.md supera límite Read tool | ROADMAP |
| TD-027 | alta | [ ] | Criterio auto-write vs validación humana | SKILL.md / settings |
| TD-028 | media | [ ] | Sin re-evaluación de tamaño WP post-estrategia | workflow-strategy/SKILL.md |
| TD-029 | alta | [ ] | Sin doble validación al transitar entre fases | todos workflow-*/SKILL.md |
| TD-030 | baja | [ ] | Análisis de impacto de renombrar Phase N | investigación |
| TD-031 | alta | [ ] | workflow-*/SKILL.md sin deep review pre-gate | todos workflow-*/SKILL.md |
| TD-032 | alta | [ ] | GAPs Phase 6 no prevenidos (4 tracking gaps) | workflow-execute/SKILL.md |
| TD-033 | alta | [ ] | now.md modificado por hook no se incluye en commits | workflow-*/SKILL.md |
| TD-034 | alta | [ ] | CHANGELOG.md supera límite Read tool (11,866 tokens) | CHANGELOG |
| TD-035 | media | [ ] | Sin regla de longevidad para archivos vivos | conventions |

**Pendientes reales: 27** (35 total − 4 resueltos ya — TDs 033-035 agregados en FASE 29 Phase 1)

---

## 3. Deep Review — Análisis de cada TD pendiente

### 3A. TD Items que tocan workflow-*/SKILL.md (ALTA prioridad operacional)

**TD-029 — Sin doble validación entre fases**
- Síntoma: Claude produce Phase N y propone Phase N+1 sin revisar si N está completo
- Impacto: Contradicciones pasan a fases siguientes; usuario corrige manualmente
- Fix: Agregar sección "Validación pre-gate" en CADA workflow-*/SKILL.md (7 archivos)
- Costo: Medio — 7 ediciones de SKILL.md con lógica de validación específica por fase
- Bloqueado por: nada. Ejecutable ahora.

**TD-031 — Sin deep review pre-gate**
- Síntoma: Spec-checklist marcado 20/20 sin leer archivos reales
- Impacto: Errores de especificación llegan a Phase 6 (costosos de corregir)
- Fix: Agregar sección "Deep review pre-gate" en CADA workflow-*/SKILL.md
- Costo: Medio — superpone parcialmente con TD-029
- Relación con TD-029: TD-029 = validación de COMPLETITUD de la fase. TD-031 = verificación de VERACIDAD contra archivos reales. Son distintos pero van juntos.

**TD-028 — Sin re-evaluación de tamaño WP**
- Síntoma: WP clasificado pequeño en Phase 1; Phase 2 expande scope a mediano; Claude no propaga
- Impacto: Claude salta Phase 3/4/5 obligatorias para WPs medianos
- Fix: Agregar sección "Re-evaluación de tamaño" en workflow-strategy/SKILL.md
- Costo: Bajo — 1 sección en 1 archivo

**TD-032 — GAPs Phase 6 tracking**
- Síntoma: Checkboxes [ ], execution-log ausente, ROADMAP sin entrada, SP-Manifest sin actualizar
- Impacto: Estado del WP inconsistente al entrar a Phase 7
- Fix Plano A: Instrucciones reforzadas en workflow-execute/SKILL.md (pre-flight checklist obligatorio)
- Fix Plano B: hooks automáticos (project-status.sh guard para ROADMAP, session-start guard para execution-log)
- Costo: Plano A bajo, Plano B medio
- Decisión de diseño requerida: ¿implementar Plano A sólo, o A+B?

**TD-011 — Atomicidad en task-plan (instrucción débil)**
- Estado actual: El checklist de atomicidad fue agregado en FASE 28 (workflow-decompose/SKILL.md lo tiene)
- Verificar: si ya está en el SKILL.md actual o solo en el plan (puede ser TD ya resuelto parcialmente)
- Fix: Confirmar con grep; si falta, agregar

### 3B. TD Items que tocan pm-thyrox/SKILL.md + Phase definitions

**TD-002 — Phase 3 sin plan.md**
- Estado actual: El artifact plan.md YA existe (FASE 23+ lo usa). ¿Está el template? ¿Está la instrucción?
- Verificar: `ls .claude/skills/workflow-plan/assets/` y grep en workflow-plan/SKILL.md
- Fix: Si falta instrucción o template → agregar. Si ya existe → marcar TD como resuelto.

**TD-007 — Step 0 END USER CONTEXT**
- Síntoma: Phase 1 analiza sin identificar primero quién es el END USER real
- Impacto: Análisis técnicamente correcto pero desconectado del beneficiario
- Fix: Agregar Step 0 en workflow-analyze/SKILL.md (escalado por tamaño WP)
- Costo: Bajo — 1 sección en 1 archivo

**TD-016 — Phase 3 no verifica existencia de archivos**
- Síntoma: Plan asume que archivo existe; Phase 6 falla con "file not found"
- Fix: Agregar validación en workflow-plan/SKILL.md antes de cerrar In-Scope
- Costo: Bajo — 1 regla en 1 archivo

**TD-017 — Criterios de cambio de FASE**
- Síntoma: Usuario no sabe cuándo/cómo se cierra una FASE
- Fix: Agregar en CLAUDE.md glosario + en workflow-track/SKILL.md instrucción de cierre
- Costo: Bajo

### 3C. TD Items que tocan ROADMAP y convenciones

**TD-026 — ROADMAP.md supera límite Read tool**
- Estado actual: ROADMAP.md ya supera 10000 tokens (verificado en FASE 28)
- Fix candidato más simple: crear ROADMAP-history.md con FASEs 1-26, ROADMAP.md con FASEs 27+
- Impacto del fix: Todas las instrucciones que referencian ROADMAP.md deben actualizarse
- Costo: Medio — split + update references

**TD-001 y TD-018 — Timestamps**
- Fix: Agregar regla en conventions.md + validación en validate-session-close.sh
- Costo: Bajo

### 3D. TD Items de arquitectura (grandes, requieren WP propio)

**TD-004 — SKILL.md supera ~700 líneas**
- Estado: pm-thyrox/SKILL.md actualmente tiene ~200 líneas (pm-thyrox ya fue reducido en FASEs 22-23)
- Verificar tamaño real con wc -l antes de priorizar
- Puede ser TD ya resuelto parcialmente

**TD-008 — /workflow_* commands desactualizados**
- Los commands en `.claude/commands/` son flat .md files (Capa 3, sin frontmatter SKILL)
- Los workflow-*/SKILL.md en `.claude/skills/` son los que tienen la lógica actual
- Pregunta: ¿qué son exactamente los "commands" hoy? ¿siguen existiendo o fueron reemplazados por los skills?
- Costo: WP propio separado (FASE 30)

**TD-005, TD-006 — Arquitectura monolítica / thin orchestrator**
- Requieren WP de investigación propio — no implementar en esta FASE
- Dependientes de TD-008

**TD-027 — Auto-write vs human gate**
- Ya parcialmente resuelto por FASE 26 (write-gates) y settings.json
- Verificar qué queda por definir

### 3E. TD Items de investigación/análisis (baja urgencia)

**TD-010** — benchmark empírico (solo si hay caso de uso real)
**TD-030** — rename Phase N (análisis de impacto antes de decidir)
**TD-025** — skill-authoring.md update (baja severidad)
**TD-022** — limitaciones en workflow-* (baja severidad)

---

## 4. Clasificación del WP

**Tamaño inicial:** Mediano-Grande (20+ archivos afectados, múltiples áreas)
**Fases obligatorias:** Todas las 7 (Phase 1..7)

**Alcance real — solo lo que se puede atacar en esta FASE:**

Hay 3 categorías:
1. **Ejecutable ahora** (instrucciones en SKILL.md): TD-007, TD-011, TD-016, TD-017, TD-028, TD-029, TD-031, TD-032-A
2. **Ejecutable con scripts**: TD-026 (ROADMAP split), TD-032-B (hooks), TD-001/TD-018 (validaciones)
3. **WP propio separado** (grandes): TD-008, TD-004/006, TD-005, TD-027 (parcial)

**Decisión de scope:** Esta FASE se enfoca en la categoría 1 + parcialmente 2.
Categoría 3 se registra como próximas FASEs (30, 31...).

---

## 5. Bugs identificados (root causes)

| Bug | Root cause | Fix propuesto |
|-----|-----------|---------------|
| B-01 | workflow-*/SKILL.md no tiene validación pre-gate | TD-029 + TD-031 |
| B-02 | workflow-strategy/SKILL.md no re-evalúa tamaño WP | TD-028 |
| B-03 | workflow-execute/SKILL.md falta pre-flight checklist explícito | TD-032-A |
| B-04 | workflow-plan/SKILL.md no verifica existencia de archivos | TD-016 |
| B-05 | workflow-analyze/SKILL.md falta Step 0 END USER CONTEXT | TD-007 |
| B-06 | CLAUDE.md no documenta ciclo de vida de FASE | TD-017 |
| B-07 | ROADMAP.md > 10000 tokens (inlegible en 1 Read) | TD-026 |
| B-08 | project-status.sh no verifica ROADMAP entry del WP activo | TD-032-B |
| B-09 | session-start.sh no alerta si execution-log falta en Phase 6 | TD-032-B |

---

## 6. Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|-------------|---------|-----------|
| R-01 | Editar 7 SKILL.md simultáneamente causa conflictos de section owner | baja | medio | Secuenciar por archivo, no paralelo |
| R-02 | Instrucciones de validación pre-gate alargan SKILL.md hasta el límite TD-004 | media | alto | Medir wc -l antes y después; si supera 200 líneas → usar referencias |
| R-03 | ROADMAP split rompe links existentes en otros archivos | media | alto | Verificar con grep antes de mover |
| R-04 | TD items marcados "resueltos" en TD-019..TD-024 realmente no lo están | baja | medio | Verificar con grep cada uno antes de cerrar |
| R-05 | Scope creep — intentar resolver TD-008 (grande) dentro de esta FASE | media | alto | TD-008 = FASE 30 explícitamente |

---

## 7. Stopping Point Manifest (WP mediano)

| SP-ID | Gate | Descripción |
|-------|------|-------------|
| SP-01 | Phase 2→3 | Validar estrategia antes de planificar |
| SP-02 | Phase 5→6 | Autorizar ejecución de cambios en SKILL.md (GATE OPERACION) |
| SP-03 | Phase 6→7 | Confirmar que todos los cambios son correctos | pendiente |
