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

## Spec Quality Checklist

- [x] Cada US tiene AC medibles (no "debe funcionar bien")
- [x] Sin `[NEEDS CLARIFICATION]` — scope claro desde Phase 3
- [x] Reversibilidad declarada: `reversible` — git revert recupera todos los cambios
- [x] US-02 AC-02.5 anticipa TD-008 con flag eliminable — no hardcodea el estado temporal
- [x] US-03 limita a ≤15 líneas — evita contaminar CLAUDE.md
- [x] US-05 preserva el documento original — solo añade sección al final
