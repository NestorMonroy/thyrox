```yml
type: Requirements Spec
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 05:00:00
phase: Phase 4 — STRUCTURE
reversibility: reversible
```

# Requirements Spec: Revisión Arquitectónica de pm-thyrox SKILL (FASE 21)

## Overview

Documentar la decisión arquitectónica de 5 capas para pm-thyrox con un ADR formal,
actualizar session-start.sh y CLAUDE.md para reflejar la realidad multi-skill,
y corregir la deuda documental del análisis previo (FASE 20).

---

## US-01: ADR de la arquitectura de 5 capas

**Como** desarrollador que trabaja en sesiones futuras de THYROX,
**quiero** un ADR firmado que documente las 9 decisiones arquitectónicas (D-01..D-09),
**para** no tener que reconstruir el razonamiento de por qué la arquitectura es como es.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-01.1 | El ADR está en `.claude/context/decisions/adr-NNN.md` usando el template existente |
| AC-01.2 | Documenta el contexto: 5 hallazgos externos (SKILLs probabilísticas, PTC, truncación, prompt injection, CLAUDE.md alternativa) |
| AC-01.3 | Documenta las 9 decisiones D-01..D-09 con su justificación |
| AC-01.4 | Incluye tabla de capas (Capa 0..4) con triggering, overhead y actualización |
| AC-01.5 | Incluye cláusula de revisión PTC explícita (D-05) |
| AC-01.6 | Documenta estado actual vs estado objetivo: qué funciona hoy, qué requiere TD-008 |
| AC-01.7 | El ADR tiene estado `Accepted` y fecha |

---

## US-02: session-start.sh refleja la realidad de las dos rutas

**Como** usuario que inicia una sesión de Claude Code,
**quiero** que el hook me muestre las dos opciones disponibles (SKILL vs /workflow_*) con su calidad actual,
**para** poder elegir informadamente sin leer documentación adicional.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-02.1 | Si hay WP activo con phase: Phase N → muestra "WP activo + fase + próxima tarea" |
| AC-02.2 | Muestra "Opción A (calidad alta HOY): invocar pm-thyrox SKILL" |
| AC-02.3 | Muestra "Opción B (determinístico): /workflow_N  [outdated — esperar TD-008]" con el command correcto para la fase actual |
| AC-02.4 | Si no hay WP activo → muestra las dos opciones para iniciar Phase 1 |
| AC-02.5 | Cuando TD-008 esté completo, la etiqueta "[outdated]" debe poder eliminarse sin cambiar el resto del script (flag o variable) |
| AC-02.6 | El script sigue leyendo `now.md` dinámicamente — sin valores hardcoded |

---

## US-03: CLAUDE.md incluye guía de uso multi-skill

**Como** usuario que quiere usar múltiples skills en paralelo,
**quiero** encontrar en CLAUDE.md las restricciones y reglas de orquestación multi-skill,
**para** no degradar la calidad del output por saturación del context window.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-03.1 | CLAUDE.md tiene una sección `## Multi-skill orchestration` (nueva, no reemplaza nada) |
| AC-03.2 | La sección indica el límite recomendado: máx 2-3 skills simultáneos |
| AC-03.3 | La sección explica cuándo secuenciar (si un skill necesita output del otro) |
| AC-03.4 | La sección explica el principio de section owners disjuntos |
| AC-03.5 | La sección describe el naming convention para checkpoints: `now-{skill-name}-{wp-id}.md` |
| AC-03.6 | La sección ocupa ≤15 líneas (no contaminar CLAUDE.md con lógica detallada) |

---

## US-04: technical-debt.md actualizado con análisis corregido

**Como** maintainer del framework pm-thyrox,
**quiero** que TD-006 refleje el análisis corregido y que TD-008, TD-009, TD-010 estén registrados,
**para** que las sesiones futuras encuentren el contexto completo sin re-derivarlo.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-04.1 | TD-006 tiene sección "Corrección 2026-04-08": los 5 hallazgos externos + errores de framing del análisis original |
| AC-04.2 | TD-006 actualiza el trigger: ya no es "cuando llegue a ~600 líneas" sino "cuando TD-008 esté completo" |
| AC-04.3 | TD-008 registrado: sync /workflow_* commands — descripción, impacto, prerequisito para S-04 |
| AC-04.4 | TD-009 registrado: patrón `now-{agent-name}.md` / `now-{skill-name}-{wp-id}.md` en agentes |
| AC-04.5 | TD-010 registrado: benchmark empírico SKILL vs CLAUDE.md vs baseline |

---

## US-05: skill-vs-agent-analysis.md con conclusiones corregidas

**Como** lector del análisis de FASE 20,
**quiero** que el documento indique explícitamente qué conclusiones fueron incorrectas y por qué,
**para** no reproducir los mismos errores de framing en análisis futuros.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-05.1 | El documento tiene una sección `## Corrección — 2026-04-08 (FASE 21)` al final |
| AC-05.2 | La sección lista las 3 conclusiones incorrectas del análisis original |
| AC-05.3 | Para cada conclusión incorrecta: indica la corrección y referencia al ADR de FASE 21 |
| AC-05.4 | El documento original no se modifica — solo se añade la sección de corrección al final |

---

## US-06: references/conventions.md formaliza el naming multi-skill (D-08)

**Como** desarrollador que trabaja con múltiples skills o agentes en paralelo,
**quiero** encontrar en `references/conventions.md` el naming convention canónico para archivos de estado,
**para** no tener que deducirlo de CLAUDE.md ni de un ADR.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-06.1 | `references/conventions.md` tiene una sección `## State files — naming conventions` (nueva o ampliada) |
| AC-06.2 | Documenta los 3 tipos de archivo con su patrón, quién escribe y qué contiene: `now.md` / `now-{agent-name}.md` / `now-{skill-name}-{wp-id}.md` |
| AC-06.3 | Incluye ejemplos concretos: `now-task-executor.md`, `now-security-audit-wp-auth.md` |
| AC-06.4 | Explica la regla de section owner por archivo (quién es responsable de cada tipo) |
| AC-06.5 | La sección referencia `references/state-management.md` (trigger map de FASE 20) para no duplicar |

---

## US-07: references/skill-vs-agent.md refleja el análisis actualizado

**Como** desarrollador que necesita decidir si crear un SKILL, un agente nativo, o un /workflow_* command,
**quiero** que `references/skill-vs-agent.md` incluya la arquitectura de 5 capas, las 3 rutas, y los hallazgos sobre confiabilidad,
**para** tomar la decisión correcta sin repetir el análisis de FASE 21.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-07.1 | El documento incluye la tabla de las 5 capas con triggering, overhead y actualización |
| AC-07.2 | El documento explica las 3 rutas para ejecutar una fase y su calidad actual (SKILL=alta/probabilístico, /workflow_* HOY=baja/determinístico, /workflow_* post-TD-008=alta/determinístico) |
| AC-07.3 | El documento documenta los 5 hallazgos externos sobre SKILLs (triggering probabilístico, PTC, truncación, prompt injection, CLAUDE.md alternativa) con sus fuentes |
| AC-07.4 | El documento incluye la tabla de decisión: cuándo usar SKILL vs /workflow_* command vs agente nativo |
| AC-07.5 | El documento referencia el ADR de FASE 21 para el razonamiento completo |
| AC-07.6 | El documento distingue entre la naturaleza de CLAUDE.md (guía declarativa siempre cargada) vs SKILL (probabilístico on-demand) vs command (determinístico user-triggered) |

---

## US-08: pm-thyrox SKILL.md referencia el ADR y sus limitaciones conocidas

**Como** Claude Code al invocar pm-thyrox SKILL,
**quiero** que el propio SKILL.md tenga una nota sobre sus limitaciones de confiabilidad y el ADR que documenta la arquitectura objetivo,
**para** que el framework sea honesto sobre su propio estado — sin ocultar el gap entre hoy y el objetivo.

### Acceptance Criteria

| ID | Criterio |
|----|---------|
| AC-08.1 | SKILL.md tiene una sección `## Limitaciones conocidas y arquitectura objetivo` (antes de "Las 7 Fases") |
| AC-08.2 | La sección menciona que el triggering del SKILL es probabilístico y que session-start.sh + CLAUDE.md compensan |
| AC-08.3 | La sección referencia el ADR de FASE 21 para la decisión arquitectónica completa |
| AC-08.4 | La sección menciona que la arquitectura objetivo es: SKILL thin + /workflow_* actualizados (cuando TD-008 esté completo) |
| AC-08.5 | La sección ocupa ≤10 líneas — no expandir SKILL.md innecesariamente |
| AC-08.6 | La nota NO modifica ninguna de las 7 fases ni sus instrucciones — es solo un preámbulo informativo |

---

## Spec Quality Checklist

- [x] Cada US tiene AC medibles (no "debe funcionar bien")
- [x] Sin `[NEEDS CLARIFICATION]` — scope claro desde Phase 3
- [x] Reversibilidad declarada: `reversible` — git revert recupera todos los cambios
- [x] US-02 AC-02.5 anticipa TD-008 con flag eliminable — no hardcodea el estado temporal
- [x] US-03 limita a ≤15 líneas — evita contaminar CLAUDE.md
- [x] US-05 preserva el documento original — solo añade sección al final
- [x] US-06 referencia state-management.md — no duplica el trigger map
- [x] US-07 documenta los 5 hallazgos externos con fuentes — trazabilidad del análisis
- [x] US-08 limita a ≤10 líneas — SKILL.md crece solo con lo necesario

## Cobertura del análisis

| Concepto analizado | Cubierto en |
|-------------------|------------|
| 5 capas + triggering por capa | US-01 (ADR) + US-07 (referencia) |
| 3 rutas y calidad actual | US-02 (hook) + US-07 (referencia) |
| Humano en el loop como feature | US-01 (ADR) |
| Multi-skill: límites y coordinación | US-03 (CLAUDE.md) + US-06 (conventions) |
| Naming `now-{agent-name}.md` / `now-{skill-name}-{wp-id}.md` | US-06 (conventions) |
| 5 hallazgos externos (artículo + análisis) | US-07 (skill-vs-agent reference) |
| PTC: ortogonal a hooks, no invalida arquitectura | US-01 (ADR) + US-07 |
| SKILL: limitaciones de confiabilidad | US-08 (SKILL.md) + US-07 |
| Errores de framing del análisis previo | US-05 (analysis corregido) + US-04 (TD-006) |
| TDs: TD-008/009/010 para trabajo futuro | US-04 (technical-debt.md) |
