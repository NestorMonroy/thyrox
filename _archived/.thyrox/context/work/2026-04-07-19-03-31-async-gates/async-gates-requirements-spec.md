```yml
type: Especificación de Requisitos
work_package: 2026-04-07-19-03-31-async-gates
created_at: 2026-04-07 19:03:31
status: En progreso
phase: Phase 4 — STRUCTURE
```

# Requirements Spec: async-gates

## Overview

Añadir a SKILL.md tres mecanismos para que Claude se detenga en puntos de parada definidos, con énfasis en la completitud de agentes asíncronos en background. Los cambios son puramente de metodología (texto en SKILL.md) — no código.

---

## User Stories

### US-01 — Stopping Point Manifest en Phase 1

**Como** usuario que inicia un WP,
**quiero** que Phase 1 produzca una tabla de todos los puntos donde Claude va a parar,
**para** saber de antemano cuándo y por qué Claude me pedirá input antes de continuar.

**Acceptance Criteria:**
- AC-01.1: SKILL.md Phase 1 tiene un paso explícito (paso 9) que instruye crear la sección `## Stopping Point Manifest` en el `*-analysis.md`
- AC-01.2: El formato del manifest es una tabla con columnas: `ID | Fase | Tipo | Evento | Acción requerida`
- AC-01.3: El manifest incluye siempre los gate-fase obligatorios (1→2, 2→3, 4→5, 5→6)
- AC-01.4: Si el WP planifica agentes async, cada uno tiene una fila SP-NNN en el manifest
- AC-01.5: Los tipos válidos son: `gate-fase`, `async-completion`, `gate-operacion`, `gate-decision`

---

### US-02 — Pre-flight registra SPs de agentes async

**Como** Claude ejecutando Phase 5 (DECOMPOSE),
**quiero** que el pre-flight de paralelos incluya registrar cada agente async en el manifest,
**para** que el manifest esté completo antes de que empiece la ejecución.

**Acceptance Criteria:**
- AC-02.1: SKILL.md Phase 5 pre-flight tiene instrucción explícita: por cada agente background planificado, registrar SP-NNN en el manifest antes de lanzarlo
- AC-02.2: Cada SP de agente async incluye: qué agente, qué produce, qué presentar al usuario al completar
- AC-02.3: El manifest actualizado se commitea antes de lanzar el primer agente

---

### US-03 — Gate en task-notification

**Como** usuario con agentes corriendo en background,
**quiero** que cuando un agente termine, Claude me presente el resultado y espere mi confirmación,
**para** poder revisar el output antes de que se use para la siguiente decisión o tarea.

**Acceptance Criteria:**
- AC-03.1: SKILL.md Phase 6 tiene instrucción explícita: al recibir `<task-notification>` → identificar SP → presentar resultado → STOP → esperar
- AC-03.2: Claude no lanza el siguiente agente ni continúa con la siguiente tarea hasta recibir confirmación
- AC-03.3: Si el usuario señala un problema → crear ERR-NNN y ajustar el plan
- AC-03.4: Al aprobar → marcar el SP como `✓` en el manifest

---

### US-04 — Calibración de gates async

**Como** usuario,
**quiero** que la intensidad del gate varíe según el riesgo real (no todos iguales),
**para** no tener que aprobar explícitamente cada micro-tarea de solo lectura.

**Acceptance Criteria:**
- AC-04.1: SKILL.md Phase 6 tiene tabla de calibración con dos ejes: reversibilidad del WP × tipo de agente
- AC-04.2: Los niveles de gate son: `fuerte` (diff completo + "SI" explícito), `estándar` (resumen + confirmación), `ligero` (mencionar + opción de objetar)
- AC-04.3: `task-executor` siempre tiene gate estándar o fuerte
- AC-04.4: WP `documentation` con agente Explore/investigación → gate ligero

---

### US-05 — Nota metodológica Phase 2 vs Phase 3

**Como** Claude ejecutando la metodología,
**quiero** que SKILL.md Phase 3 incluya una nota que distinga Phase 2 (cómo) de Phase 3 (qué),
**para** no mezclar decisiones estratégicas con declaración de scope.

**Acceptance Criteria:**
- AC-05.1: SKILL.md Phase 3 tiene nota explícita: "Phase 2 define el cómo; Phase 3 define el qué"
- AC-05.2: La nota especifica que Phase 2 puede orientar el scope pero no lo declara formalmente

---

### US-06 — Este WP como primer ejemplo canónico

**Como** referencia futura,
**quiero** que el analysis.md de este WP tenga un Stopping Point Manifest completo,
**para** servir como ejemplo canónico del formato.

**Acceptance Criteria:**
- AC-06.1: `async-gates-analysis.md` tiene sección `## Stopping Point Manifest` con tabla completa
- AC-06.2: El manifest incluye los gate-fase de este WP (1→2, 2→3, 3→4, 4→5, 5→6) ya completados o pendientes

---

## Tabla de trazabilidad Scope → User Story

| Scope item | User Story | Acceptance Criteria |
|-----------|-----------|-------------------|
| S-01: paso 9 en Phase 1 | US-01 | AC-01.1 |
| S-02: formato del manifest | US-01 | AC-01.2, AC-01.3, AC-01.4, AC-01.5 |
| S-03: pre-flight Phase 5 | US-02 | AC-02.1, AC-02.2, AC-02.3 |
| S-04: task-notification Phase 6 | US-03 | AC-03.1, AC-03.2, AC-03.3, AC-03.4 |
| S-05: tabla de calibración | US-04 | AC-04.1, AC-04.2, AC-04.3, AC-04.4 |
| S-06: manifest en este WP | US-06 | AC-06.1, AC-06.2 |
| S-07: nota Phase 2 vs Phase 3 | US-05 | AC-05.1, AC-05.2 |
| S-08: lecciones + CHANGELOG | — | (Phase 7 obligatorio) |

---

## Spec Quality Checklist

- [x] Todas las user stories tienen acceptance criteria verificables
- [x] Sin marcadores `[NEEDS CLARIFICATION]`
- [x] Tabla de trazabilidad completa (todos los S-NN tienen al menos una fila)
- [x] Out-of-scope explícito en el plan (OS-01 a OS-05)
- [x] Sin ambigüedad en los cambios a SKILL.md (cada AC dice exactamente qué debe decir el texto)
- [x] WP clasificado como `documentation` — cambios solo en context/work/ y SKILL.md
