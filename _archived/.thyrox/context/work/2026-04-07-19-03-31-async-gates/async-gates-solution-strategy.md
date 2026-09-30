```yml
type: Estrategia de Solución
work_package: 2026-04-07-19-03-31-async-gates
created_at: 2026-04-07 19:03:31
status: En progreso
phase: Phase 2 — SOLUTION_STRATEGY
```

# Solution Strategy: async-gates

## Key Ideas

### Idea 1 — Stopping Point Manifest como artefacto de Phase 1
Cada WP debe producir, al inicio, una lista explícita de todos los puntos donde Claude va a detenerse. Este manifest vive en el archivo de análisis y es la "tabla de contenidos de las pausas" para el WP.

**Impacto:** Claude puede consultar el manifest en cualquier momento para saber si debe parar. Hace los gates predecibles para el usuario, no sorpresivos.

### Idea 2 — task-notification como trigger de gate, no como señal de auto-continuación
`<task-notification>` actualmente es un evento interno que Claude procesa y usa para continuar. Debe reinterpretarse como un evento que activa un gate: presentar → parar → esperar.

**Impacto:** Rompe el ciclo de "el usuario lanzó el WP y Claude corrió todo sin parar". Cada agente async completado es un checkpoint.

### Idea 3 — Calibración de gates por tipo de agente y reversibilidad
No todos los async-completion gates deben ser iguales. Un agente que modifica el repo requiere gate fuerte; uno que solo lee/investiga puede tener gate ligero (mencionar + opción de objetar).

**Impacto:** Evita la "fatiga de aprobación" — si cada micro-tarea requiere un "SI" explícito, el usuario termina aprobando todo sin leer. La calibración mantiene los gates significativos.

---

## Research

### Unknown 1 — ¿Dónde vive el Stopping Point Manifest?

**Alternativas investigadas:**

| Opción | Pros | Cons |
|--------|------|------|
| A: Sección dentro del analysis.md | Un solo archivo a leer, ya existe en Phase 1 | El análisis y el manifest tienen propósitos distintos |
| B: Archivo separado `{wp}-stopping-points.md` | Separación de concerns, fácil de actualizar en Phase 5 | Un archivo más por WP, overhead de creación |
| C: Sección en task-plan.md (Phase 5) | Junto al plan de ejecución donde más se usa | Se crea tarde — Phase 1 ya necesita algunos SPs |
| D: Tabla en el frontmatter del WP (YAML) | Structured, consultable programáticamente | YAML frontmatter no es legible para Claude in-context |

**Decisión:** Opción A — sección `## Stopping Point Manifest` dentro del `*-analysis.md`.

**Justificación:** Phase 1 ya produce el archivo de análisis. Añadir una sección al final es menos overhead que un nuevo archivo. La sección se actualiza en Phase 5 (pre-flight de paralelos) y en Phase 6 (al completar SPs). Un solo archivo a leer para saber el estado de gates.

---

### Unknown 2 — ¿Cómo instruir a Claude para parar en task-notification?

**Alternativas investigadas:**

| Opción | Pros | Cons |
|--------|------|------|
| A: Instrucción en Phase 6 SKILL.md | Donde Claude ejecuta y recibe notificaciones | SKILL.md ya es largo; puede ignorarse en context compactado |
| B: Instrucción en CLAUDE.md (nivel proyecto) | Siempre visible, no se compacta | Mezcla metodología con comportamiento de sesión |
| C: Formato imperativo en el manifest mismo | "Al completar SP-03: STOP — presentar X" | Claude debe consultar el manifest activamente |
| D: Combinación A + C | Instrucción general en SKILL.md + instrucción específica en cada SP | Redundancia positiva — dos lugares dicen lo mismo |

**Decisión:** Opción D — instrucción general en SKILL.md Phase 6 + cada SP en el manifest tiene su propia acción requerida.

**Justificación:** Un solo punto de instrucción puede ignorarse si el contexto está compactado. La redundancia aquí es una feature: si Claude olvida la regla general de SKILL.md, el manifest específico del WP lo recuerda para ese gate concreto.

---

### Unknown 3 — ¿Cómo calibrar la intensidad del gate async?

**Alternativas investigadas:**

| Criterio de calibración | Pros | Cons |
|------------------------|------|------|
| A: Todos los gates iguales (siempre fuerte) | Simple, predecible | Fatiga de aprobación para tareas pequeñas |
| B: Gate según reversibilidad del WP | Ya existe esta clasificación (FASE 18) | Un WP "documentation" puede tener agentes que modifican código |
| C: Gate según tipo de agente (executor vs explore) | Más granular — el tipo de agente refleja el riesgo | Requiere tabla de tipos, más a mantener |
| D: Gate según output del agente (modifica repo vs solo lee) | El criterio más preciso | Difícil de determinar antes de que el agente corra |
| E: Combinación B + C | Calibración en dos niveles | Complejidad manejable |

**Decisión:** Opción E — reversibilidad del WP define el nivel base, tipo de agente ajusta.

**Justificación:**

```
Nivel base por reversibilidad:
  documentation  → gates ligeros (mencionar + opción de objetar)
  reversible     → gates estándar (presentar resultado + esperar "SI")
  irreversible   → gates fuertes (presentar diff detallado + esperar confirmación)

Ajuste por tipo de agente:
  task-executor  → siempre gate estándar o fuerte (modifica repo)
  Explore/general→ bajar un nivel si WP es reversible (gate ligero)
  task-planner   → gate estándar (produce plan que guiará ejecución)
```

---

### Unknown 4 — ¿Cuándo se registran los SPs de async en el manifest?

**Alternativas investigadas:**

| Momento | Pros | Cons |
|---------|------|------|
| A: Phase 1 — al crear el WP | Máxima anticipación | En Phase 1 no siempre se sabe qué agentes se van a lanzar |
| B: Phase 5 — pre-flight de paralelos | Ya se sabe exactamente qué agentes y qué hacen | Tarde para SPs de investigación en Phase 2-4 |
| C: Al lanzar cada agente (Phase 6 in-the-moment) | Máxima precisión | El manifest se construye mientras se ejecuta, sin visibilidad previa |
| D: Phase 1 registra SPs conocidos + Phase 5 completa | Cubre ambos casos | Requiere que el manifest sea un documento vivo |

**Decisión:** Opción D — manifest como documento vivo, registrado en dos momentos.

**Justificación:** Phase 1 puede anticipar SPs de investigación (si se planea lanzar agentes de análisis). Phase 5 es el momento obligatorio para registrar SPs de ejecución. El manifest se actualiza en ambas fases y en Phase 6 al marcar SPs completados.

---

## Fundamental Decisions

| ID | Decisión | Alternativas descartadas | Justificación |
|----|----------|--------------------------|---------------|
| D-01 | Stopping Point Manifest como sección en *-analysis.md | Archivo separado, sección en task-plan.md | Menor overhead, Phase 1 ya crea el archivo |
| D-02 | Instrucción en SKILL.md Phase 6 + acción en cada SP del manifest | Solo SKILL.md, solo manifest | Redundancia positiva contra context compaction |
| D-03 | Calibración gate = reversibilidad WP × tipo de agente | Todos iguales, solo por reversibilidad | Granularidad sin complejidad excesiva |
| D-04 | Manifest como documento vivo (Phase 1 + Phase 5 + Phase 6) | Solo Phase 1, solo Phase 5 | Cubre agentes de investigación y de ejecución |
| D-05 | task-notification reinterpretado como trigger de gate, no de auto-continuación | Auto-procesamiento actual | Principio de visibilidad — usuario ve resultados antes de que se usen |

---

## Cambios en SKILL.md

### Phase 1 — Añadir paso 9: Stopping Point Manifest

```markdown
9. Crear sección `## Stopping Point Manifest` en el archivo de análisis:
   — Registrar los gate-fase obligatorios (siempre aplican según SKILL.md)
   — Si el WP planifica agentes de investigación async: registrar SP-NNN por cada uno
   — Si hay ambigüedades de scope: registrar gate-decision correspondiente
   — Formato: tabla con columnas ID | Fase | Tipo | Evento | Acción requerida
```

### Phase 5 — Ampliar pre-flight de paralelos

```markdown
Pre-flight para paralelo (ANTES de lanzar agentes):
5. [NUEVO] Por cada agente que se lanzará en background:
   — Registrar SP-NNN en el Stopping Point Manifest del analysis.md
   — Incluir: qué agente, qué produce, qué presentar al usuario al completar
   — Hacer commit del manifest actualizado antes de lanzar el primer agente
```

### Phase 6 — Añadir manejo de task-notification

```markdown
Al recibir <task-notification>:
  1. Identificar el SP-NNN correspondiente en el Stopping Point Manifest
  2. Presentar al usuario: qué agente completó + resumen del resultado
  3. ⏸ GATE ASYNC — STOP: esperar confirmación antes de:
     — Usar el output para la siguiente decisión
     — Lanzar el siguiente agente en el pipeline
     — Continuar con la siguiente tarea del task-plan
  4. Intensidad del gate según calibración (reversibilidad × tipo):
     — Fuerte: presentar diff/resultado completo, esperar "SI" explícito
     — Estándar: presentar resumen, esperar confirmación
     — Ligero: mencionar que completó + "aviso si hay algún problema"
  5. Si el usuario aprueba: marcar SP como ✓ en el manifest, continuar
  6. Si el usuario señala un problema: crear ERR-NNN, ajustar plan
```

---

## Patrones aplicados

| Patrón | Aplicación |
|--------|-----------|
| **Gate Pattern** | Extender el patrón ya implementado (gate-fase, gate-operacion) al dominio async |
| **Living Document** | El Stopping Point Manifest se actualiza a lo largo del WP |
| **Redundant Safety** | Instrucción en SKILL.md + instrucción en cada SP del manifest |
| **Proportional Control** | Gates calibrados según riesgo real (no todos iguales) |

---

## Cómo lograr los Quality Goals

### QG1: Visibilidad para el usuario
- Approach: El usuario ve resultados de cada agente antes de que se usen
- Mecanismo: task-notification → presentar → STOP → esperar
- Tecnología: instrucciones en SKILL.md + Stopping Point Manifest

### QG2: Predecibilidad
- Approach: El usuario sabe de antemano dónde va a parar Claude
- Mecanismo: Stopping Point Manifest en Phase 1 (visible antes de ejecutar)
- Tecnología: sección en *-analysis.md, actualizado en Phase 5

### QG3: Sin fatiga de aprobación
- Approach: Gates calibrados — no todos son iguales
- Mecanismo: Calibración reversibilidad × tipo de agente
- Tecnología: tabla de calibración en SKILL.md Phase 6

### QG4: Robustez ante context compaction
- Approach: Instrucción redundante — SKILL.md + manifest específico del WP
- Mecanismo: El manifest vive en el repo, sobrevive a la compactación de contexto
- Tecnología: archivo en context/work/ + instrucción en SKILL.md

---

## Validación

- [x] Key ideas identificadas y articuladas
- [x] Decisiones fundamentales documentadas con alternativas descartadas
- [x] Alternativas investigadas con pros/cons
- [x] Justificaciones claras
- [x] Cambios específicos en SKILL.md definidos (Phase 1, 5, 6)
- [x] Calibración de gates definida
- [x] Coherencia con el análisis de Phase 1
- [x] Sin contradicción con FASE 18 (human-gates ya implementados)
