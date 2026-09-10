```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Síntesis final (Phase 1: ANALYZE)
Scope: 14 proyectos de referencia → patrones para THYROX
```

# Síntesis: 14 Proyectos → Patrones para THYROX

## Los 14 proyectos organizados por utilidad para THYROX

### Tier 1: Referencia directa (usar como modelo)

| # | Proyecto | Por qué Tier 1 | Qué tomar |
|---|----------|---------------|-----------|
| 10 | **agentic-framework** | Es lo que THYROX quiere ser | Lessons L-NNNN, HUMAN_NEEDED, 3 capas, graduated enforcement, L-0002 (instructions <100 líneas) |
| 14 | **valet** | Mejor disciplina de documentación | .beans/ con YAML, design+plan pairs, specs con boundary rules, locked decisions |
| 1 | **spec-kit** | Framework de specs más completo | 1 dir/feature, constitution, checklists, spec→plan→tasks pipeline |

### Tier 2: Referencia conceptual (tomar conceptos, no implementación)

| # | Proyecto | Por qué Tier 2 | Qué concepto tomar |
|---|----------|---------------|-------------------|
| 7 | **Cortex-Template** | Arquitectura más ambiciosa | focus.md + now.md, L0-L3 layers, PATHS.md, checkpoint <50 líneas, scribe pattern |
| 8 | **trae-agent** | Mejor tracking automático | Trajectory recording, sequential thinking tool, task_done verificado |
| 9 | **build-ledger** | Mejor gobernanza | Append-only log, research "truths", structured handoffs 10-section |
| 4 | **oh-my-claude** | Mejor autonomía | Decision gate (switching cost), STV trace before code |

### Tier 3: Referencia de simplificación (inspirar simplicidad)

| # | Proyecto | Por qué Tier 3 | Qué lección de simplicidad |
|---|----------|---------------|--------------------------|
| 2 | **claude-pipe** | Mejor ratio esfuerzo/resultado | PRD+BUILD_SPEC (12KB) → código funcional. Zero overhead. |
| 12 | **ClaudeViewer** | Mejor organización mínima | .serena/memories (6 módulos, 20-50 líneas c/u). Proyecto más pequeño = más limpio. |
| 11 | **almanack** | Mejor filosofía | Principios > procedimientos. Errors → reglas permanentes. |

### Tier 4: Referencia parcial (un concepto específico)

| # | Proyecto | Concepto específico |
|---|----------|-------------------|
| 3 | **claude-mlx-tts** | Hooks como enforcement automático. Docs por audiencia (6 capas). |
| 6 | **clawpal** | 48 planes inmutables con fecha. Design+impl pairs. TDD en plan. cc.md como feedback loop. |
| 5 | **conv-temp** | 3 tiers de memoria (essential/contextual/archive). Compresión inevitable. |
| 13 | **cc-warp** | Genérico→Especializado. "Primitivos, no frameworks." 7 niveles de documentación. |

---

## Los 10 patrones convergentes que THYROX debe adoptar

### Patrón 1: Instructions cortas, contexto bajo demanda
**Confirmado por:** agentic-framework (L-0002), ClaudeViewer (.serena), Cortex (L0-L3), conv-temp (3 tiers)

**Regla:** CLAUDE.md + SKILL.md juntos < 150 líneas de instrucciones primarias. Todo lo demás en references/ cargado bajo demanda.

**Estado THYROX:** SKILL.md (288 líneas) + CLAUDE.md (~200 líneas) = ~488 líneas. Demasiado.

**Acción:** Reducir CLAUDE.md a <50 líneas (reglas puras). SKILL.md a <100 líneas (flujo esencial). Todo lo demás en references/.

---

### Patrón 2: Work items con YAML metadata
**Confirmado por:** valet (.beans/), agentic-framework (F-NNNN), clawpal (planes con fecha)

**Regla:** Cada work item es un archivo .md con YAML frontmatter (status, type, priority, depends_on).

**Estado THYROX:** epics/ sin metadata YAML. analysis/ con archivos sueltos sin estructura.

**Acción:** Adoptar formato bean: YAML frontmatter + Problem + Design + Acceptance Criteria.

---

### Patrón 3: Design + Plan separados
**Confirmado por:** valet (40+ pairs), clawpal (design+impl), claude-pipe (PRD+BUILD_SPEC), spec-kit (spec→plan→tasks)

**Regla:** Separar "QUÉ y POR QUÉ" (design) de "CÓMO paso a paso" (plan). No mezclar.

**Estado THYROX:** analysis/ mezcla diagnósticos con strategies con tasks.

**Acción:** Specs con boundary rules (permanentes) + Plans con tasks+checkboxes (archivables).

---

### Patrón 4: Errors → Lessons → Reglas permanentes
**Confirmado por:** agentic-framework (L-NNNN), almanack ("add rule to CLAUDE.md"), build-ledger (truths)

**Regla:** Cada error produce: 1) Lesson estructurado (What/Why/Action/Insight), 2) Regla en CLAUDE.md o SKILL.md que previene recurrencia.

**Estado THYROX:** ERR-001 a ERR-023 documentados pero NO convertidos en reglas. ERR-002 se repitió como ERR-006 porque la regla no se retroalimentó.

**Acción:** Convertir los errores más críticos en reglas. Adoptar formato L-NNNN.

---

### Patrón 5: Enforcement automático > documental
**Confirmado por:** agentic-framework (16 pre-commit gates), claude-mlx-tts (hooks), oh-my-claude (decision gates), build-ledger (CLAIM/RELEASE)

**Regla:** Si depende de disciplina, no funciona. Las reglas importantes necesitan hooks, scripts, o gates que BLOQUEEN.

**Estado THYROX:** TODO es "debería." EXIT_CONDITIONS dicen "PARAR" pero nada para realmente.

**Acción:** Al menos 1-2 hooks de Claude Code (pre-commit, stop) que verifiquen reglas críticas.

---

### Patrón 6: Focus + Now como estado de sesión
**Confirmado por:** Cortex (focus.md + now.md), cc-warp (foco_atual.md), valet (.beans/ status), ClaudeViewer (.serena)

**Regla:** 2 archivos para estado: focus.md (humano, dirección actual) + now.md (YAML, estado máquina).

**Estado THYROX:** project-state.md (desactualizado) + ROADMAP.md (grande) + work-logs (vacíos).

**Acción:** Reemplazar project-state.md con focus.md + now.md. Eliminar work-logs narrativos.

---

### Patrón 7: Locked decisions (no solo documented)
**Confirmado por:** valet (9 locked en CLAUDE.md), Cortex (KERNEL zones), build-ledger (truths)

**Regla:** Las decisiones más importantes son BLOQUEOS ACTIVOS, no registros históricos. "Decided. Do not revisit."

**Estado THYROX:** ADRs son registro. Nada impide cuestionar una decisión ya tomada.

**Acción:** Las top 5 decisiones (ANALYZE first, anatomía oficial, etc.) van como "LOCKED" en CLAUDE.md.

---

### Patrón 8: Boundary rules en documentos
**Confirmado por:** valet (specs), spec-kit (features), claude-pipe (scope in/out)

**Regla:** Cada documento dice QUÉ CUBRE y QUÉ NO CUBRE. Previene ambigüedad y duplicación.

**Estado THYROX:** Ningún documento tiene boundary rules. Todo se solapa.

**Acción:** Agregar "Scope" y "Not in Scope" a cada reference y spec.

---

### Patrón 9: Append-only log > work-logs narrativos
**Confirmado por:** build-ledger (LOG.md), trae-agent (trajectory), conv-temp (transcripts inmutables)

**Regla:** El registro de actividad es APPEND-ONLY y automático. No es un documento que alguien escribe al final.

**Estado THYROX:** work-logs manuales, obligatorios (ADR-012) pero vacíos (ERR-021).

**Acción:** Reemplazar work-logs con append-only LOG.md o trajectory automático.

---

### Patrón 10: Principios > Procedimientos
**Confirmado por:** almanack (mental models), Cortex (constitution), oh-my-claude (decision gate philosophy)

**Regla:** Documentar CÓMO PENSAR es más valioso que documentar QUÉ HACER. Los principios componen, los procedimientos caducan.

**Estado THYROX:** SKILL.md documenta fases (procedimiento). No documenta principios de pensamiento.

**Acción:** Constitution con 5-7 principios operacionales que aplican a TODO, no solo a PM.

---

## Mapa de acciones priorizadas

### Prioridad 1: Simplificar (antes de agregar)

| Acción | Impacto | Esfuerzo |
|--------|---------|----------|
| Reducir CLAUDE.md a <50 líneas (reglas + links) | Alto (L-0002) | Bajo |
| Reducir SKILL.md a <100 líneas (fases esenciales) | Alto | Medio |
| Reemplazar project-state.md con focus.md + now.md | Alto | Bajo |
| Eliminar work-logs narrativos, reemplazar con append-only LOG.md | Alto | Bajo |
| Convertir top 5 ERR en reglas permanentes en CLAUDE.md | Alto | Bajo |

### Prioridad 2: Estructurar

| Acción | Impacto | Esfuerzo |
|--------|---------|----------|
| Agregar YAML frontmatter a epics/ (status, type, priority) | Medio | Bajo |
| Crear constitution.md con 5-7 principios (no template, instancia real) | Alto | Medio |
| Agregar boundary rules a references (scope/not in scope) | Medio | Medio |
| Locked decisions en CLAUDE.md (top 5 ADRs como bloqueos) | Alto | Bajo |

### Prioridad 3: Enforcement

| Acción | Impacto | Esfuerzo |
|--------|---------|----------|
| Crear al menos 1 hook de Claude Code (stop hook para checklist) | Alto | Medio |
| Graduated enforcement: hard blocks vs soft warnings | Medio | Medio |

### Prioridad 4: Futuro (no ahora)

| Acción | De dónde viene |
|--------|---------------|
| .beans/ completo con design+plan pairs | valet |
| Specs por subsistema con boundary rules | valet, spec-kit |
| Sequential thinking como herramienta explícita | trae-agent |
| Decision gate por switching cost | oh-my-claude |
| Multi-agent coordination | Cortex, build-ledger |

---

## Lo que NO adoptamos (y por qué)

| Concepto | Proyecto | Por qué no |
|----------|----------|-----------|
| 90+ agentes | Cortex-Template | Overengineered para un skill |
| 5 capas de orquestación | cc-warp | Demasiada complejidad teórica |
| Multi-instance con CLAIM/RELEASE | build-ledger | THYROX es single-session |
| 24-agent support | spec-kit | Solo necesitamos Claude Code |
| Ralph loops autónomos | oh-my-claude | Requiere MCP servers |
| Trajectory recording automático | trae-agent | Requiere integración profunda |
| 7 niveles de documentación | cc-warp | 2-3 niveles son suficientes |
| Genérico→Especializado automático | cc-warp | Prematuro sin proyectos reales |
| BSI claims + pre-flight checks | Cortex | Solo para multi-instancia |
| Hooks de Cursor/Copilot | agentic-framework | Solo Claude Code por ahora |

---

**Última actualización:** 2026-03-28
