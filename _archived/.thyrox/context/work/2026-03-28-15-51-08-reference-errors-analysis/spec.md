```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: Resolver 6 Riesgos Activos de THYROX

## Los 6 Riesgos (del análisis de 14 proyectos)

1. **AP-01:** Sin enforcement ejecutable — EXIT_CONDITIONS decorativas
2. **AP-06:** Errores sin feedback loop a prevención (ERR-002 recurrió como ERR-006)
3. **AP-04:** Sin mecanismo de handoff humano persistente
4. **AP-10:** Sin eficiencia de tokens — lee archivos completos
5. **AP-05:** SKILL.md mezcla reglas con procedimientos
6. **AP-09:** Decision gates sin enforcement real

---

## Riesgo 1: AP-01 + AP-09 — Sin Enforcement Ejecutable

### Unknown: ¿Qué tipo de enforcement es viable en THYROX?

**Contexto actual:**
- Ya existe un stop-hook global (`~/.claude/stop-hook-git-check.sh`) que bloquea si hay commits sin push
- Ya existen scripts de validación: `verify-skill-mapping.sh`, `validate-phase-readiness.sh`
- Claude Code soporta hooks: PreToolUse, PostToolUse, Stop, Notification
- No hay pre-commit hooks del proyecto (solo Git LFS)

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Hooks de Claude Code (Stop hook que valida fase) | Se ejecuta automáticamente, bloquea si falla | Solo aplica al final de sesión, no durante el trabajo |
| B | Pre-commit git hook que valida convenciones | Se ejecuta en cada commit, previene errores | Puede ser molesto si es muy estricto, requiere bash |
| C | Script de validación manual (ejecutar antes de avanzar fase) | Simple, sin overhead, el usuario decide cuándo | Depende de disciplina — el mismo problema que queremos resolver |
| D | Hook PreToolUse que valida antes de escribir archivos | Previene errores en tiempo real | Puede ser intrusivo, ralentiza cada operación |
| E | Graduated: Stop hook (hard) + script manual (soft) | Balance entre enforcement y flexibilidad | Requiere 2 mecanismos |

**Evidencia de referencia:**
- agentic-framework: 16 pre-commit gates (hard blocks) — funciona pero puede ser excesivo
- claude-mlx-tts: Stop + Permission hooks — funciona bien
- THYROX ya tiene stop-hook global — demostrado que funciona (nos hizo push hace 20 minutos)

**Decisión: E — Graduated enforcement**
- **Hard (Stop hook):** Validar al cierre de sesión que focus.md + now.md estén actualizados y no haya work packages sin commit
- **Soft (script):** `validate-phase-readiness.sh` ya existe, usarlo como gate opcional antes de avanzar de fase
- **Justificación:** El stop-hook ya probó que funciona en THYROX. Añadir validaciones al hook existente es el camino de menor resistencia. No necesitamos 16 gates como agentic-framework.

---

## Riesgo 2: AP-06 — Errores sin Feedback Loop

### Unknown: ¿Cómo convertir ERR-NNN en prevención?

**Estado actual:**
- 28 errores documentados (ERR-001 a ERR-028) en `context/errors/`
- Formato libre, sin estructura obligatoria
- NO alimentan de vuelta al SKILL.md o CLAUDE.md
- ERR-002 recurrió como ERR-006 porque no hubo prevención

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Formato L-NNNN de agentic-framework (What/Why/Action/Insight) | Probado, incluye "qué hacer la próxima vez" | Requiere migrar 28 errores existentes |
| B | Cada error genera una regla en CLAUDE.md (almanack) | Directo, siempre visible | CLAUDE.md crece → instruction bloat (L-0002) |
| C | Errors feed back al SKILL.md como notas en la fase relevante | Prevención integrada en el flujo | SKILL.md crece |
| D | Script que al crear ERR-NNN pide campo "Prevención" obligatorio + valida que se linkee en SKILL.md | Automatizado, enforce que cada error tenga prevención | Requiere script nuevo |
| E | Evolucionar ERR-NNN a L-NNN: mismos archivos, estructura mejorada, campo "Prevención" obligatorio | Compatible con lo existente, mejora incremental | No enforce automático |

**Decisión: E + actualización gradual**
- Cambiar formato de ERR-NNN a incluir campos: **Qué pasó / Por qué / Prevención / Insight**
- Los errores NUEVOS usan el formato mejorado
- Los 28 existentes se migran cuando se toquen (no hacer migración masiva)
- Los errores que recurren (como ERR-002→ERR-006) se convierten en regla en SKILL.md
- **Justificación:** Migración gradual respeta "git as persistence" y no introduce overhead. Lo importante es el campo "Prevención" obligatorio.

---

## Riesgo 3: AP-04 — Sin Handoff Humano Persistente

### Unknown: ¿Necesita THYROX un HUMAN_NEEDED.md?

**Estado actual:**
- Cuando Claude necesita una decisión, lo dice en chat
- La petición se pierde al cerrar sesión o al cambiar de contexto
- No hay registro persistente de "qué espera del humano"

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | HUMAN_NEEDED.md global (agentic-framework) | Persistente, tipado, con impacto | Archivo adicional que mantener |
| B | Campo `blockers` en now.md (ya existe) | Ya existe, YAML, parte del flujo | Solo para la sesión actual, no cross-sesión |
| C | Sección "Pendiente del usuario" en focus.md | Visible al inicio de sesión, natural | Puede crecer sin límite |
| D | Template en assets/ para crear HUMAN_NEEDED cuando sea necesario | Solo se crea cuando hay bloqueantes, no archivo vacío | Requiere disciplina para crearlo |

**Decisión: B + C combinado**
- `now.md` ya tiene `blockers: []` — usarlo para sesión actual
- `focus.md` ya tiene "## Pendiente" — agregar subsección "### Decisiones pendientes del usuario" cuando haya
- **Justificación:** No crear archivo nuevo cuando los mecanismos existentes pueden extenderse. THYROX es single-developer, no multi-agente. La complejidad de HN-NNNN de agentic-framework es para 4 agentes concurrentes.

---

## Riesgo 4: AP-10 — Sin Eficiencia de Tokens

### Unknown: ¿Cómo reducir consumo de tokens sin perder funcionalidad?

**Estado actual:**
- Claude lee archivos completos cada vez
- Algunos references son 300-500+ líneas
- Ya se agregó TOC a references >300 líneas (sesión 2)

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Scripts token-eficientes como agentic-framework (`journal.sh recent`) | Output mínimo (200 vs 5000 tokens) | Requiere crear scripts para cada consulta frecuente |
| B | Módulos pequeños como ClaudeViewer (20-50 líneas) | Carga granular | Requiere refactorizar references |
| C | Progressive disclosure (SKILL.md ya hace esto) | Natural, ya implementado | No cubre state queries |
| D | Script `status.sh` que resume estado del proyecto en <50 líneas | Un solo comando para "¿dónde estamos?" | Solo resuelve un caso de uso |

**Decisión: C + D**
- Progressive disclosure ya implementado en SKILL.md (bueno, no tocar)
- Crear `scripts/project-status.sh` que lea focus.md + now.md + último work package y genere resumen <50 líneas
- **Justificación:** El caso más frecuente de lectura completa es "¿cuál es el estado?". Un script que lo resuma ahorra tokens en cada inicio de sesión. Los references ya tienen TOC para navegación selectiva.

---

## Riesgo 5: AP-05 — SKILL.md Mezcla Reglas con Procedimientos

### Unknown: ¿Qué partes de SKILL.md son constitution (L1) vs playbook (L2)?

**Estado actual de SKILL.md (191 líneas):**
- Líneas 1-4: Metadata YAML (L1)
- Líneas 6-13: Descripción + principio core + escala (L1 — constitution)
- Líneas 16-115: Las 7 fases con pasos (L2 — playbook)
- Líneas 117-134: Artefactos y dónde viven (L1 — rules)
- Líneas 136-151: Dónde buscar por dominio (L2 — reference)
- Líneas 153-175: Convenciones de naming (L1 — rules)
- Líneas 177-191: Troubleshooting (L2 — playbook)

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Separar en SKILL.md (L1) + references/playbook.md (L2) | Capas limpias | Rompe la anatomía oficial (SKILL.md debe ser autocontenido) |
| B | Reorganizar secciones en SKILL.md con separadores claros | No rompe anatomía, mejora legibilidad | Sigue siendo un solo archivo |
| C | Mover reglas a CLAUDE.md y dejar SKILL.md como playbook puro | Capas limpias, CLAUDE.md es L1 natural | CLAUDE.md crece (ahora 51 líneas → ~80) |
| D | No hacer nada — 191 líneas es manejable y está bajo 500 | Sin overhead, sin riesgo de romper | La mezcla persiste conceptualmente |

**Decisión: D — No hacer nada**
- 191 líneas está bien bajo el límite de 500
- CLAUDE.md ya tiene las locked decisions (L1 más importante)
- SKILL.md es un playbook con reglas inline — esto es aceptable en la anatomía oficial
- Separar crearía más archivos sin beneficio real a esta escala
- **Justificación:** Resolver esto sería overengineering (AP-07). cc-warp intentó separar todo en 5 capas y terminó con 4,397 archivos. La mezcla es tolerable en 191 líneas.

---

## Riesgo 6: (Merged con Riesgo 1)

AP-09 "Decision gates sin enforcement" se resuelve con la misma solución de AP-01: graduated enforcement (Stop hook hard + validate script soft).

---

## Resumen de Decisiones

| Riesgo | Decisión | Esfuerzo | Archivos a modificar |
|--------|----------|----------|---------------------|
| AP-01 + AP-09 | Graduated: extender stop-hook + usar validate-phase-readiness.sh | Medio | stop-hook script, posiblemente settings.json |
| AP-06 | Formato ERR mejorado con campo "Prevención" obligatorio | Bajo | Template de errores, errores nuevos |
| AP-04 | Usar blockers en now.md + sección en focus.md | Bajo | Documentar convención |
| AP-10 | Crear scripts/project-status.sh | Bajo | 1 script nuevo |
| AP-05 | No hacer nada (191 líneas es manejable) | Zero | Ninguno |

## Verificación contra principios del proyecto

- [x] ANALYZE first — Se hizo análisis de 14 proyectos antes de decidir
- [x] Anatomía oficial — No se rompe (SKILL.md sigue siendo autocontenido)
- [x] Git as persistence — No se crean archivos de backup
- [x] Markdown only — Todo es markdown
- [x] Single skill — Sigue siendo un solo pm-thyrox
- [x] Work packages with timestamp — Este análisis está en un work package timestamped
- [x] Conventional commits — Se seguirá en la implementación

---

## Siguiente Paso

→ Phase 3: PLAN — Definir scope y order de implementación de las 4 soluciones (AP-05 no requiere acción).
