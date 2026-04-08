```yml
type: Análisis
work_package: 2026-04-08-17-04-20-framework-evolution
created_at: 2026-04-08 17:04:20
phase: Phase 1 — ANALYZE
purpose: Integrar nueva documentación oficial de Claude Code con TDs prioritarios del proyecto
```

# Análisis: Framework Evolution — Integración documentación oficial + TDs (FASE 22)

## Objetivo

Dos inputs convergentes requieren análisis conjunto:

1. **Nueva documentación oficial** de Claude Code ("Extend Claude Code") — cambia varios supuestos de ADR-015
2. **TDs prioritarios** — TD-011 (alta), TD-008 (alta), TD-007 (media) — listos para implementar

El análisis determina cómo la nueva documentación afecta la estrategia de implementación de los TDs
y si se requieren correcciones a ADR-015 antes de ejecutarlos.

---

## Hallazgos — Nueva documentación oficial

### H-NEW-1: `.claude/rules/` — capa nueva no documentada en ADR-015

**Qué es:** Archivos en `.claude/rules/` que se cargan cada sesión como CLAUDE.md, pero con
soporte de `paths` frontmatter para scope por archivo/directorio.

**Comportamiento:**
- Sin `paths`: carga cada sesión (como CLAUDE.md)
- Con `paths: ["src/**/*.ts"]`: solo carga cuando Claude trabaja con archivos matching

**Impacto en ADR-015:**
La arquitectura de 5 capas documentada en ADR-015 está incompleta:
- Capa 1 actual: "CLAUDE.md (declarativo, siempre cargado)"
- Capa 1 real: "CLAUDE.md + `.claude/rules/` (declarativo, siempre cargado o path-scoped)"

`.claude/rules/` encaja entre CLAUDE.md (global) y SKILLs (on-demand): es always-loaded pero
puede ser más granular. No requiere invocación — es puramente declarativo.

**Relevancia para THYROX:** Baja en lo inmediato. No usamos rules/ hoy. Pero ADR-015 debe
actualizarse para no documentar una arquitectura incompleta.

---

### H-NEW-2: `disable-model-invocation: true` — corrección a H1 de ADR-015

**Qué hace:** Frontmatter en un skill. Con este flag:
- El skill es **invisible** al modelo (zero context cost)
- Solo se activa cuando el **usuario lo invoca** con `/<name>`
- Resultado: 100% determinístico desde perspectiva del usuario

**Corrección a ADR-015 H1:**
ADR-015 H1 dice: "triggering probabilístico — el SKILL puede no dispararse."
Esto es correcto pero incompleto. La documentación oficial muestra 3 modos de triggering:

| Modo | Cómo | Confiabilidad |
|------|------|---------------|
| Model-invocable (default) | Claude elige basado en relevancia de descripción | Probabilístico |
| User-invocable (`/<name>`) | Usuario invoca explícitamente | Determinístico |
| Hidden (`disable-model-invocation: true`) | Solo usuario, zero context cost | Determinístico, 0 overhead |

**Impacto crítico en TD-008:**
Los `/workflow_*` commands hoy viven en `.claude/commands/`. Podrían migrar a skills con
`disable-model-invocation: true`. Eso les daría:
- Invocación determinística solo por usuario (`/workflow_analyze`, etc.)
- Zero context cost (no saturan el budget de descriptions)
- Namespacing si se empaquetan como plugin
- Unificación de la arquitectura (elimina una categoría — "commands" desaparece)

Esto cambia fundamentalmente la estrategia de TD-008.

---

### H-NEW-3: SKILLs en subagents — carga completa, no on-demand

**Qué dice la doc:** Cuando un subagent tiene `skills:` en su frontmatter, esos skills se
**precargan completamente** al lanzar el subagent — no on-demand. El subagent tampoco hereda
los skills del agente padre.

**Impacto en TD-009:**
TD-009 planeaba implementar `now-{agent-name}.md` en las definiciones de agentes.
La doc agrega otra dimensión: cada agente debe declarar explícitamente sus `skills:` porque
NO hereda del padre. Los agentes de THYROX (task-executor, task-planner, etc.) necesitan
`skills: [pm-thyrox]` en su frontmatter para tener acceso a la metodología.

Esto amplía el scope de TD-009.

---

### H-NEW-4: Agent teams — nueva categoría peer-to-peer

**Qué es:** Múltiples sesiones Claude Code independientes con:
- Shared task list (auto-coordinación)
- Comunicación peer-to-peer entre sesiones (los subagents solo reportan al padre)
- Cada teammate es una instancia Claude independiente con su propio contexto

**Estado:** Experimental, disabled by default.

**Diferencia con subagents:**
- Subagent: hijo → padre (reporta resultados)
- Agent team: peer ↔ peer (mensajería directa entre sesiones)

**Impacto:** No afecta los TDs inmediatos. ADR-015 y skill-vs-agent.md deben documentarlo
como una categoría nueva en la tabla de mecanismos (actualmente solo tiene 3: SKILL, AGENT, COMMAND).

---

### H-NEW-5: Plugins — capa de packaging sobre la arquitectura de 5 capas

**Qué es:** Bundle instalable de skills + hooks + subagents + MCP. Skills de plugins son
namespaced (`/my-plugin:review`) para evitar conflictos. Distribuibles via marketplace.

**Impacto para THYROX:** No relevante en lo inmediato. pm-thyrox podría eventualmente
empaquetarse como plugin para reutilizar en otros repos. Documentar en ADR-015 como
"Capa 5 potencial" o simplemente como nota.

---

## Análisis de impacto en TDs prioritarios

### TD-011 — Checklist atomicidad en SKILL.md Phase 5

**Impacto de nueva doc:** Ninguno. TD-011 es una adición de texto en SKILL.md.
**Veredicto:** Sin cambios de estrategia. Micro-tarea, ejecutar primero.

---

### TD-007 — Phase 1 Step 0: END USER CONTEXT

**Impacto de nueva doc:** Ninguno directo. Step 0 es independiente de la arquitectura de capas.
**Veredicto:** Sin cambios de estrategia. WP pequeño, ejecutar segundo.

---

### TD-008 — Sync /workflow_* commands con SKILL.md

**Impacto de nueva doc: ALTO. H-NEW-2 cambia la estrategia óptima.**

**Estrategia original (TD-008 tal como fue registrado):**
- Mantener /workflow_* en `.claude/commands/`
- Sincronizar su contenido con la lógica actual de SKILL.md
- Resultado: Capa 3 funcional

**Nueva estrategia posible (H-NEW-2):**
- Migrar /workflow_* de `.claude/commands/` a `.claude/skills/`
- Añadir `disable-model-invocation: true` en cada uno
- Resultado: skills determinísticos con zero context overhead

**Comparación:**

| Dimensión | Estrategia original (commands) | Nueva estrategia (skills hidden) |
|-----------|-------------------------------|----------------------------------|
| Invocación | `/<name>` desde commands/ | `/<name>` desde skills/ |
| Context cost | 0 (no cargan) | 0 (disable-model-invocation) |
| Arquitectura | Capa 3 separada | Capa 2 (hidden) — unifica capas |
| Migración existente | Sync contenido in-place | Mover archivos + añadir frontmatter |
| Complejidad | Media | Baja (solo mover + agregar 1 línea) |
| Namespacing futuro | No disponible | Disponible via plugins |

**Decisión de análisis:** La nueva estrategia (skills hidden) es superior. Elimina una categoría
arquitectónica (commands → skills), reduce complejidad, y es más alineada con el diseño oficial.
Requiere decisión formal → ADR-016.

---

## Hallazgos adicionales — Correcciones requeridas a ADR-015

| Item | Corrección necesaria |
|------|---------------------|
| H1 (probabilístico) | Matizar: 3 modos de triggering, no solo uno. `disable-model-invocation: true` = determinístico |
| Tabla 5 capas | Actualizar Capa 1 para incluir `.claude/rules/` como sublayer path-scoped |
| Tabla mecanismos en skill-vs-agent.md | Añadir "Agent teams" como categoría (peer-to-peer) |
| Capa 3 (/commands/) | Reevaluar si debe existir o migrar a Capa 2 (skills hidden) |

Estas correcciones no invalidan ADR-015 — lo refinan. ADR-015 Status permanece "Accepted".
Las correcciones viven como "Addendum 2026-04-08" dentro del mismo ADR.

---

## Propuesta de scope para FASE 22

### Bloque A — Correcciones a ADR-015 y referencias (≤3 tareas)
- Addendum en ADR-015: H1 matizado, `.claude/rules/` en tabla, agent teams como categoría
- `skill-vs-agent.md`: añadir agent teams, actualizar tabla de triggering

### Bloque B — TD-011 (micro, 1 tarea)
- Añadir checklist atomicidad en SKILL.md Phase 5

### Bloque C — TD-008 con nueva estrategia (mediano, 5-8 tareas)
- ADR-016: decisión de migrar /workflow_* de commands → skills hidden
- Migrar los 7 archivos + sincronizar contenido con SKILL.md lógica actual
- Actualizar session-start.sh (COMMANDS_SYNCED → reemplazar por nuevo flag o eliminar)

### Bloque D — TD-007 (pequeño, 2-3 tareas)
- Añadir Step 0 en Phase 1 de SKILL.md
- Crear template `*-context.md` para END USER CONTEXT

**Secuencia recomendada:** A → B → C → D (C es el más grande y necesita ADR-016 primero)

---

## Riesgos identificados

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|-------------|---------|------------|
| R-01 | Migrar commands → skills hidden rompe flujos existentes | Baja | Medio | Verificar que `/<name>` funciona igual desde skills/ |
| R-02 | Context overflow en TD-008 (7 archivos + sincronización) | Alta | Bajo | Batch de 2-3 tareas/sesión (L-085 aplicada) |
| R-03 | ADR-016 requiere más análisis del que estimamos | Media | Medio | Spike de 1 tarea para verificar `disable-model-invocation` en la práctica |
| R-04 | Bloque C desplaza a D indefinidamente | Media | Bajo | Ejecutar B (TD-011) antes, independiente de C |

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis presentado | ⏳ ACTUAL — esperar SI del usuario |
| SP-02 | 2→3 | gate-fase | Strategy aprobada | Esperar SI |
| SP-03 | 3→4 | gate-fase | Plan aprobado | Esperar SI |
| SP-04 | 4→5 | gate-fase | Spec aprobada | Esperar SI |
| SP-05 | 5→6 | gate-fase | Task-plan aprobado | Esperar SI |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas | Presentar, esperar SI |
