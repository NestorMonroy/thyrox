```yml
type: Plan
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 04:45:00
phase: Phase 3 — PLAN
reversibility: reversible
status: pendiente de aprobación
```

# Plan: Revisión Arquitectónica de pm-thyrox SKILL (FASE 21)

## Scope statement

Documentar la decisión arquitectónica de las 5 capas de pm-thyrox con un ADR formal,
y aplicar los cambios de menor impacto que no requieren migración masiva:
reducir pm-thyrox SKILL a catálogo, actualizar session-start.sh y CLAUDE.md.
La sincronización completa de /workflow_* commands queda como deuda técnica separada.

---

## In-scope

| ID | Entregable | Decisión de Phase 2 | Justificación de incluir |
|----|-----------|--------------------|-----------------------|
| S-01 | ADR en `.claude/context/decisions/` — 9 decisiones D-01..D-09, cláusula PTC, estado actual vs objetivo | D-01..D-09, D-05 | Artefacto permanente — documenta la decisión para sesiones futuras |
| S-02 | Actualizar `session-start.sh` — mostrar ambas rutas (SKILL + /workflow_*) con etiqueta de calidad actual | D-04, D-06 | Cambio pequeño (~15 líneas), impacto inmediato en UX del hook |
| S-03 | Añadir sección en `CLAUDE.md` — guía multi-skill (máx simultáneos, ordering, section owners disjuntos) | D-09 | ~10 líneas en CLAUDE.md; sin esto D-07/D-08 son solo teoría |
| S-04 | Reducir `pm-thyrox SKILL` a catálogo ~40-50 líneas — eliminar lógica de fase, dejar solo descripción + tabla escalabilidad + tabla /workflow_* | D-02 | Core de la decisión — sin esto la arquitectura sigue siendo monolítica |
| S-05 | Actualizar `technical-debt.md` — TD-006 con análisis corregido (5 hallazgos, errores de framing) + registrar TD-008 (sync /workflow_* commands) | D-03 | TD-006 necesita corregirse; TD-008 captura el trabajo pendiente |
| S-06 | Actualizar `skill-vs-agent-analysis.md` — conclusiones corregidas (SKILL probabilístico, CLAUDE.md como alternativa, multi-skill) | — | Artefacto de FASE 20 con errores documentados — corregir para trazabilidad |
| S-07 | Actualizar `references/conventions.md` — naming convention D-08: `now-{agent-name}.md` / `now-{skill-name}-{wp-id}.md` con tabla, ejemplos, y regla de section owner | D-08 | La convención está descrita en CLAUDE.md pero no en la referencia canónica donde se buscará |
| S-08 | Actualizar `references/skill-vs-agent.md` — tabla 5 capas, 3 rutas con calidad, 5 hallazgos externos, tabla de decisión SKILL vs command vs agente | D-01..D-09 | Referencia permanente para decisiones futuras — sin ella el análisis queda solo en el WP |
| S-09 | Añadir nota en `pm-thyrox SKILL.md` — ≤10 líneas antes de "Las 7 Fases": limitaciones de confiabilidad + referencia al ADR + arquitectura objetivo (thin cuando TD-008 completo) | D-06 | El framework debe ser honesto sobre sus propias limitaciones — sin ocultar el gap |

---

## Out-of-scope

| ID | Ítem | Por qué excluido |
|----|------|-----------------|
| OS-01 | Sincronización completa de los 7 /workflow_* commands con lógica actual de SKILL.md | Tarea grande (7 archivos × ~80-100 líneas de lógica actualizada cada uno). Requiere WP propio (TD-008). Sin sincronizar los commands, pm-thyrox SKILL NO puede reducirse a catálogo vacío — se haría en dos pasos: primero sincronizar, después reducir SKILL |
| OS-02 | Implementar el naming `now-{skill-name}-{wp-id}.md` en agentes existentes | Requiere actualizar las definiciones de agentes nativos. Scope de un WP de agentes |
| OS-03 | Benchmark empírico (SKILL vs CLAUDE.md vs baseline sin framework) | Requiere test harness, múltiples sesiones, métricas. R-04 queda pendiente |
| OS-04 | Migración completa: SKILL → thin orchestrator → /workflow_* como primario | Depende de OS-01 completado. No implementar sin sincronización previa |
| OS-05 | Actualizar los 9 agentes nativos para leer `now-{skill}-{wp}.md` | Scope de WP de agentes |

---

## Orden de ejecución y dependencias

```
S-05  (TD actualizado — prerequisito para S-04 y S-06, sin dependencias)
S-06  (análisis corregido — informativo, no bloquea nada)
  ↓
S-01  (ADR — necesita tener claras las decisiones, puede ir en paralelo con S-02/S-03)
S-02  (session-start.sh — independiente)
S-03  (CLAUDE.md — independiente)
  ↓
S-04  (reducir pm-thyrox SKILL — ADVERTENCIA: reducir SKILL solo si OS-01 está fuera de scope.
       Reducir la SKILL AHORA sin sincronizar commands significa que los users que usen
       /workflow_* tendrán instrucciones desactualizadas Y pm-thyrox SKILL no tendrá
       la lógica completa. Esto hace Ruta 1 inutilizable y Ruta 2 mala.)
```

### ⚠ Decisión de scope crítica para S-04

**El problema:** D-02 dice "reducir pm-thyrox SKILL a catálogo". Pero si se hace ANTES de
sincronizar /workflow_* commands, el resultado es peor que el estado actual:
- Ruta 1 (SKILL): sin lógica de fase → Claude improvisa → calidad mínima
- Ruta 2 (/workflow_*): outdated → calidad baja
- **Resultado neto: pérdida de calidad en ambas rutas**

**La solución correcta:**
```
Opción A (este WP): Reducir SKILL parcialmente — eliminar solo la redundancia,
  mantener la lógica esencial hasta que OS-01 esté completo.
  SKILL pasa de ~430 líneas a ~200 líneas (no a 40).
  
Opción B (diferir S-04): No tocar SKILL hasta que TD-008 (sync /workflow_*) esté completo.
  Este WP entrega solo ADR + session-start.sh + CLAUDE.md + TDs.
```

**Recomendación: Opción B.** La reducción de SKILL sin sincronizar commands es un anti-patrón
(D-06: la arquitectura no oculta sus gaps). Hacerlo produciría un sistema peor.
S-04 se convierte en el primer entregable del WP que ejecute TD-008.

---

## In-scope revisado (post-corrección S-04)

| ID | Entregable | Estado |
|----|-----------|--------|
| S-01 | ADR de arquitectura D-01..D-09 | ✓ En scope |
| S-02 | `session-start.sh` actualizado | ✓ En scope |
| S-03 | `CLAUDE.md` sección multi-skill | ✓ En scope |
| S-04 | Reducir pm-thyrox SKILL | ✗ Movido a TD-008 WP |
| S-05 | `technical-debt.md` actualizado (TD-006 corregido + TD-008 nuevo) | ✓ En scope |
| S-06 | `skill-vs-agent-analysis.md` corregido | ✓ En scope |

**Reversibilidad:** `reversible` — todos los cambios son en archivos de texto recuperables con `git revert`.

---

## Deuda técnica — items out-of-scope registrados

Los siguientes ítems out-of-scope quedan registrados como TDs para ejecución futura:

| TD | Origen OS | Descripción | Trigger |
|----|----------|-------------|---------|
| TD-008 | OS-01 + OS-04 | Sincronizar 7 /workflow_* commands con lógica actual de SKILL.md (gates, Stopping Point Manifest, calibración, state-management). Una vez completado, ejecutar S-04: reducir pm-thyrox SKILL a catálogo ~40 líneas | Cuando haya bandwidth — es el prerequisito para Opción B (determinístico total) |
| TD-009 | OS-02 + OS-05 | Implementar patrón `now-{agent-name}.md` / `now-{skill-name}-{wp-id}.md` en las definiciones de agentes nativos existentes (agent-spec.md + 9 agentes) | Al abrir WP de agentes (cuando TD-008 esté completo) |
| TD-010 | OS-03 | Benchmark empírico: SKILL vs CLAUDE.md vs baseline sin framework — 3 tareas equivalentes, métricas de calidad de output | Cuando haya caso de uso real que justifique el tiempo |

*Estos TDs se añaden a `technical-debt.md` en la tarea S-05 (Phase 6).*

---

## Criterios de éxito

1. ADR firmado con las 9 decisiones, cláusula PTC, y estado actual vs objetivo documentado
2. `session-start.sh` muestra las dos rutas con su calidad actual ("calidad alta HOY" vs "[outdated]")
3. `CLAUDE.md` incluye la guía de multi-skill (máx 2-3 simultáneos, cuándo secuenciar)
4. TD-006 corregido con los 5 hallazgos + errores de framing del análisis anterior
5. TD-008 registrado con descripción completa del trabajo pendiente (sync /workflow_*)
6. `skill-vs-agent-analysis.md` tiene conclusiones corregidas con referencia a este WP
