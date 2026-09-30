```yml
work_package_id: 2026-04-08-03-51-36-skill-architecture-review
closed_at: 2026-04-08
project: THYROX — pm-thyrox framework
source_phase: Phase 7 — TRACK
total_lessons: 5
author: Claude (FASE 21)
```

# Lessons Learned: Skill Architecture Review (FASE 21)

## Propósito

Capturar qué aprendió el equipo durante FASE 21 — la revisión arquitectónica de pm-thyrox que
produjo ADR-015, la arquitectura de 5 capas, y la corrección de 3 conclusiones incorrectas del
análisis previo (FASE 20).

---

## Lecciones

### L-082: El análisis de arquitectura debe enumerar explícitamente las alternativas — no solo la elegida

**Qué pasó**

El análisis de FASE 20 concluyó "SKILL es la única opción viable" sin evaluar CLAUDE.md como
alternativa. La conclusión era incorrecta y fue refutada en FASE 21 con evidencia externa.
El error no fue en la lógica — fue en no listar todas las opciones antes de elegir.

**Raíz**

El template de análisis no requiere una tabla de opciones exhaustiva como primer paso.
El analista va directamente a la solución preferida sin forzarse a enumerar alternativas.

**Fix aplicado**

ADR-015 usa tabla de 4 opciones (A/B/C/D) con dimensiones explícitas antes de la decisión.
La opción elegida (C) solo se justifica después de comparar con las descartadas.

**Regla**

Cuando se analiza una decisión arquitectónica, listar TODAS las alternativas en tabla antes de
elegir — incluyendo las "obvias" que se descartarán — porque la omisión de una alternativa
es el error más difícil de detectar en revisión.

---

### L-083: Un spec con pocas User Stories puede parecer completo y no serlo — usar una cobertura explícita

**Qué pasó**

El spec inicial de FASE 21 tenía 5 User Stories. El usuario detectó que no cubría todos los
conceptos analizados. Al revisar, faltaban US-06 (conventions.md), US-07 (skill-vs-agent.md)
y US-08 (SKILL.md limitaciones) — 3 de 8 USs (37%) estaban ausentes.

**Raíz**

El spec se creó partiendo de los artefactos "principales" sin verificar que cada concepto
analizado en Phase 1-2 tuviera un US correspondiente. Sin una tabla de cobertura, los gaps
son invisibles hasta que alguien los señala.

**Fix aplicado**

Se añadió tabla de cobertura al spec: fila = concepto analizado, columna = US responsable.
Cualquier concepto sin US asignado es un gap visible antes de aprobar el spec.

**Regla**

Cuando se crea un requirements-spec, añadir tabla de cobertura (concepto → US) como último
paso antes de presentarlo. Si una fila queda vacía, falta un US.

---

### L-084: Las tareas del task-plan deben ser atómicas en el momento de creación — no después

**Qué pasó**

El task-plan inicial de FASE 21 tenía 8 tareas que agrupaban múltiples operaciones (e.g.
"actualizar technical-debt.md" = 4 TDs distintos). El usuario detectó el problema y se
expandió a 16 tareas. La corrección tomó una iteración adicional y retraso en la ejecución.

**Raíz**

La regla de atomicidad (1 tarea = 1 operación en 1 ubicación) no estaba en el checklist
de Phase 5 DECOMPOSE. La atomicidad se aprendió de WPs anteriores pero no se formalizó.

**Fix aplicado**

Se registró TD-011: añadir checklist de atomicidad en SKILL.md Phase 5.
El checklist: (a) 1 ubicación por tarea, (b) sin "y" conectando operaciones, (c) falla independiente.

**Regla**

Cuando se crea un task-plan, aplicar el checklist de atomicidad tarea por tarea antes de
presentarlo. Una tarea que contenga "y" o una lista es señal de que necesita dividirse.

---

### L-085: El context window overflow es predecible — planificar el batch size antes de ejecutar

**Qué pasó**

Al ejecutar el task-plan de 16 tareas en secuencia, el contexto se llenó después de T-004.
El usuario tuvo que elegir entre estrategias de mitigación (batch, archivado, resumen).
La interrupción en T-004 no causó pérdida de trabajo pero sí fricción y overhead de re-setup.

**Raíz**

No había estimación de costo de contexto por tarea antes de comenzar Phase 6.
Un task-plan con 16 tareas + commits + lecturas de archivos acumula contexto rápidamente.

**Fix aplicado**

El usuario eligió la estrategia "batch de 2 tareas por sesión" que probó ser efectiva.
Las sesiones subsiguientes comenzaron con el hook mostrando la próxima tarea pendiente.

**Regla**

Cuando un task-plan tiene más de 8 tareas, planificar el batch size antes de Phase 6:
estimar ~2-4 tareas por sesión según complejidad. Registrarlo en la cabecera del task-plan.

---

### L-086: Los errores de framing en análisis deben corregirse en el mismo artefacto — no solo en el ADR

**Qué pasó**

ADR-015 documentó las 3 conclusiones incorrectas del análisis de FASE 20. Sin embargo,
`skill-vs-agent-analysis.md` seguía mostrando las conclusiones originales sin corrección.
Un lector que leyera el análisis original sin leer el ADR recibiría información incorrecta.

**Raíz**

La convención de "ADR como única fuente de verdad de la decisión" no especificaba qué hacer
con documentos fuente que contienen errores de framing corregidos por el ADR.

**Fix aplicado**

T-010 añadió sección "Corrección 2026-04-08 (FASE 21)" directamente en `skill-vs-agent-analysis.md`
con las 3 correcciones y referencia a ADR-015 para el razonamiento completo.

**Regla**

Cuando un ADR corrige conclusiones de un análisis previo, añadir sección "Corrección" al final
del documento fuente — no solo en el ADR. El documento fuente debe ser auto-consistente para
un lector que no siga referencias.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| **Completitud sin cobertura explícita** | L-082, L-083 | Añadir tablas de cobertura en análisis y spec: opciones vs criterios, conceptos vs USs |
| **Granularidad insuficiente en creación** | L-084 | Checklist de atomicidad en Phase 5 (TD-011 pendiente en SKILL.md) |
| **Overhead de corrección tardía** | L-082, L-085, L-086 | Las correcciones en el momento de creación cuestan menos que las correcciones post-aprobación |

---

## Qué replicar

- **Tabla de 4 opciones en ADRs (ADR-015):** Comparar opciones explícitamente antes de elegir.
  Usar en cualquier ADR donde haya más de una alternativa técnica real.

- **Flag de control en scripts (COMMANDS_SYNCED):** Un booleano en el script permite cambiar
  el comportamiento sin restructurar el código. Aplicar a otros flags de estado condicional.

- **Estrategia de batch de sesión:** 2-4 tareas por sesión para task-plans grandes previene
  overflow sin perder trazabilidad. El hook muestra la próxima tarea pendiente automáticamente.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-008 | Sync /workflow_* commands con lógica actual de SKILL.md (prerequisito para D-02) | Alta | workflow-commands-sync |
| TD-009 | Implementar patrón now-{agent-name}.md en definiciones de agentes nativos | Media | agent-format-spec-v2 |
| TD-010 | Benchmark empírico SKILL vs CLAUDE.md vs baseline | Baja | (cuando haya caso de uso real) |
| TD-011 | Añadir checklist de atomicidad en SKILL.md Phase 5 DECOMPOSE | Alta | siguiente WP de mantenimiento |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
