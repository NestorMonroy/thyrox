```yml
work_package_id: 2026-04-08-02-05-03-context-hygiene
closed_at: 2026-04-08 03:30:00
project: THYROX
source_phase: Phase 7 — TRACK
total_lessons: 7
author: Claude
```

# Lessons Learned: context-hygiene

## Propósito

Capturar qué aprendió el equipo durante este work package — qué funcionó, qué falló, y qué regla generalizable se puede extraer para no repetir el error o para replicar el éxito.

---

## Lecciones

### L-075: Los archivos de estado se congelan cuando Phase 7 no los menciona explícitamente

**Qué pasó**

focus.md, now.md y project-state.md quedaron congelados en FASE 15 durante 4 FASEs completas. Phase 7 nunca instruyó actualizarlos, por lo que el olvido se volvió sistemático.

**Raíz**

Ausencia de instrucción explícita en Phase 7. Lo que no está en el flujo no se hace. Las actualizaciones manuales dependen de recordatorio humano, no de proceso.

**Fix aplicado**

Tabla REQUERIDA en Phase 7 de SKILL.md con contenido mínimo por archivo al cerrar WP: now.md (null), focus.md (FASE completada + próximo paso), project-state.md (ejecutar update-state.sh).

**Regla**

Cuando un artefacto debe actualizarse al cerrar un WP, ponerlo como checklist obligatorio en Phase 7 — no asumir que se recordará.

---

### L-076: Un trigger map explícito elimina la ambigüedad sobre cuándo actualizar qué

**Qué pasó**

No había documentación que describiera qué archivo actualizar en qué momento. Cada sesión interpretaba diferente qué "actualizar el estado" significaba.

**Raíz**

Falta de contrato explícito entre eventos del flujo y archivos de estado. La responsabilidad estaba implícita en la frase "Actualizar focus.md + now.md" del flujo de sesión.

**Fix aplicado**

`references/state-management.md` con tabla trigger × archivo × contenido mínimo. Referenciado desde SKILL.md Phase 7.

**Regla**

Cuando hay 3+ archivos de estado que deben sincronizarse, documentar la tabla evento→archivo→contenido mínimo en un reference dedicado.

---

### L-077: project-state.md generado por script es más fiable que mantenido manualmente

**Qué pasó**

project-state.md tenía "6 agentes" cuando eran 9. La versión decía "1.2.0" cuando era 1.6.0. Mantenido a mano, diverge del estado real del repo.

**Raíz**

project-state.md era un archivo de texto libre que alguien debía actualizar manualmente en cada FASE. Sin automatización, el drift es inevitable.

**Fix aplicado**

`scripts/update-state.sh` que lee el estado real del repo (agentes de `.claude/agents/`, versión de CHANGELOG.md, FASEs de ROADMAP.md) y sobrescribe project-state.md. Phase 7 lo invoca como paso REQUERIDO.

**Regla**

Cuando un archivo de estado puede derivarse del repo, automatizarlo con un script — no mantenerlo manualmente.

---

### L-078: Las gates de fase deben actualizar now.md::phase al recibirlas, no "después"

**Qué pasó**

Las gates de Phase (⏸ GATE HUMANO) aprobaban el avance pero no instruían actualizar now.md. El campo `phase` quedaba en el valor anterior hasta que alguien lo recordara.

**Raíz**

Las gates eran puntos de parada pero no de actualización. La instrucción de actualización era parte del flujo general, no de la gate específica.

**Fix aplicado**

Cada ⏸ GATE HUMANO en SKILL.md ahora incluye: "Al recibir aprobación: actualizar `context/now.md::phase` a Phase N."

**Regla**

Cuando hay un evento de transición de estado, la instrucción de actualizar el estado debe estar en el propio evento — no en un paso posterior que puede olvidarse.

---

### L-079: FASE vs Phase es una fuente de confusión recurrente sin glosario

**Qué pasó**

El usuario preguntó "¿por qué existe la FASE 19 si estamos en la Phase 4?" — dos términos similares con significados completamente distintos usados sin definición formal.

**Raíz**

El framework usaba ambos términos desde el inicio pero nunca los definió formalmente en un lugar visible. El contexto solo se entendía implícitamente con experiencia.

**Fix aplicado**

Tabla glosario en CLAUDE.md (FASE/Phase/WP/SP-NNN con ejemplos concretos) y nota de nomenclatura en SKILL.md con enlace al glosario.

**Regla**

Cuando dos términos se parecen pero significan cosas distintas, definirlos en el primer documento que se lee — no asumir que el contexto los aclara.

---

### L-080: La spec revisada por el usuario produce un WP más robusto

**Qué pasó**

La spec inicial de context-hygiene tenía 3 user stories: "fix now + add to Phase 7". El usuario la rechazó y pidió 5 USs que cubrieran trigger map + automatización + glosario.

**Raíz**

La spec inicial era demasiado estrecha — resolvía el síntoma (archivos desactualizados) sin abordar la causa (ausencia de triggers y automatización).

**Fix aplicado**

La spec revisada con 5 USs capturó el problema completo. El WP produjo state-management.md + update-state.sh + phase-gate instructions + glosario.

**Regla**

Cuando el usuario rechaza la spec, no ajustar en los márgenes — reformular desde la causa raíz identificada en Phase 1.

---

### L-081: session-start.sh lee now.md — mantener now.md actualizado es crítico para cold-boot

**Qué pasó**

session-start.sh leía now.md para mostrar WP activo y próxima tarea. Con now.md congelado, el cold-boot mostraba información errónea (o nada).

**Raíz**

now.md era la fuente de verdad para session-start.sh, pero no había proceso que garantizara su actualización. La cadena de dependencia era: now.md → session-start.sh → contexto de sesión.

**Fix aplicado**

Instrucciones en Phase 1 (al crear WP), en cada gate de fase, y en Phase 7 (al cerrar WP) para actualizar now.md. state-management.md documenta la cadena completa.

**Regla**

Cuando un script de arranque depende de un archivo, ese archivo debe ser el primer elemento del trigger map — y su actualización debe estar en cada transición de estado relevante.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| Lo que no está en el flujo no se hace | L-075, L-078 | Agregar como checklist en la fase donde ocurre, no en documentación separada |
| Archivos manuales divergen del estado real | L-076, L-077 | Automatizar con script cuando el contenido puede derivarse del repo |
| Términos similares sin definición producen confusión | L-079 | Glosario formal en el primer documento leído |

---

## Qué replicar

- **Trigger map como reference dedicado**: state-management.md es el contrato explícito evento→archivo. Aplicar este patrón a otros contratos implícitos del framework.
- **Scripts de regeneración**: update-state.sh como modelo para otros archivos que pueden derivarse del repo (e.g., agente-list.md, tech-debt-summary.md).
- **Spec revisada por el usuario**: el rechazo de spec produjo un WP más completo. El gate de Phase 4 (spec) es valioso — no apresurar su aprobación.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-006 | pm-thyrox thin orchestrator — workflow_* commands ya existen (70%); completar delegación cuando SKILL.md llegue ~600 líneas | media | thin-orchestrator |
| TD-007 | Phase 1 Step 0 — END USER CONTEXT trigger map antes del análisis técnico | baja | phase-zero |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
