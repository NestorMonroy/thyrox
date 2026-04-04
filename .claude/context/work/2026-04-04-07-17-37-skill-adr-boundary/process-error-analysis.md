```yml
Tipo: Análisis de Errores de Proceso
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fecha: 2026-04-04
```

# Análisis de Errores de Proceso — skill-adr-boundary

## Propósito

Documentar los errores cometidos durante la ejecución de este WP,
identificar la causa raíz en el proceso (no en el contenido),
y proponer correcciones a la metodología para que no se repitan.

---

## Error E-001 — RC-003 presente en strategy, ausente en plan

### Que ocurrió

Phase 2 (solution-strategy.md) declaró explícitamente:
> "CLAUDE.md resuelve RC-001 y RC-003"

Phase 3 (plan.md) listó una sola tarea para CLAUDE.md:
> "CLAUDE.md — nueva seccion `## SKILL vs ADR — Regla de uso` (tabla 4 filas)"

Esa tarea resuelve RC-001. RC-003 (clarificar que "Locked Decisions" no son ADRs)
no se tradujo a ninguna tarea concreta. El plan fue aprobado con ese gap.

Phase 6 implementó el plan fielmente. RC-003 quedó sin implementar.
Se detectó solo en revisión post-cierre.

### Causa raíz

Al escribir Phase 3, las tareas se derivaron de "qué archivos toco"
(CLAUDE.md, SKILL.md, adr.md.template), no de "qué RC resuelve cada tarea."

No hubo una verificación explícita del tipo:
"¿Cada RC de prioridad Alta o Media tiene al menos una tarea asociada?"

### Dónde falló el proceso

```
Phase 2 → "CLAUDE.md resuelve RC-001 y RC-003"
                    |
                    v
Phase 3 → tarea: "nueva seccion SKILL vs ADR"   ← solo RC-001
          [RC-003 no mapeada a ninguna tarea]    ← GAP no detectado
                    |
                    v
Phase 6 → implementa el plan tal cual            ← correcto, pero plan incompleto
                    |
                    v
Phase 7 → WP cerrado                             ← RC-003 sin implementar
```

---

## Error E-002 — Phases 4 y 5 saltadas por clasificación incorrecta

### Que ocurrió

El WP fue clasificado como "Pequeño" basándose en:
- 5 tareas
- 3 archivos modificados
- 0 archivos nuevos

Con esa clasificación, Phase 4 (STRUCTURE) y Phase 5 (DECOMPOSE) fueron saltadas.

### Causa raíz

La clasificación "pequeño" se aplicó mirando la cantidad de archivos y tareas,
no la complejidad de trazabilidad. Este WP tenía 8 RC con prioridades distintas
que debían mapearse a tareas concretas. Eso requería DECOMPOSE.

Sin DECOMPOSE no hubo:
- Lista de tareas con trazabilidad RC → tarea
- Verificación de cobertura (¿cada RC tiene al menos una tarea?)
- Criterio de aceptación por tarea

Phase 5 (DECOMPOSE) es la fase que habría detectado E-001 al construir
la lista de tareas desde las RC hacia abajo, no desde los archivos hacia arriba.

### El riesgo de saltar phases

Saltar STRUCTURE y DECOMPOSE es válido cuando el trabajo es realmente mecánico
(ej: renombrar 3 archivos, aplicar un formato). No es válido cuando hay:
- Múltiples causas raíz (RC) con prioridades distintas
- Decisiones de "qué hacer" y "qué no hacer"
- Riesgo de gap de cobertura

---

## Error E-003 — Plan aprobado sin verificación de cobertura

### Que ocurrió

El usuario aprobó el plan con "SI" y Phase 6 arrancó. Antes de la aprobación,
no se presentó una tabla de trazabilidad RC → tarea que permitiera detectar
visualmente que RC-003 no tenía tarea asignada.

### Causa raíz

El plan.md listó tareas en formato "qué archivo toco" sin columna de trazabilidad.
Un plan correcto para un WP con múltiples RC debería incluir:

| Tarea | Archivo | Resuelve |
|-------|---------|---------|
| nueva seccion SKILL vs ADR | CLAUDE.md | RC-001 |
| clarificar Locked Decisions | CLAUDE.md | RC-003 |
| Step 8 lista SI/NO | SKILL.md | RC-002 |
| campo Uso: en frontmatter | adr.md.template | RC-006 |

Con esa tabla, el gap de RC-003 habría sido visible antes de la aprobación.

---

## Patrón común entre E-001, E-002, E-003

Los tres errores tienen la misma causa raíz profunda:

**Adelantarse a las phases.**

- E-002: saltar STRUCTURE y DECOMPOSE porque "se veía simple"
- E-001: en Phase 3 ya "saber" qué archivos tocar (saltarse la derivación desde RC)
- E-003: presentar el plan listo para aprobar sin construirlo desde las RC

En todos los casos, el resultado esperado de una phase se reemplazó
por intuición sobre lo que se iba a hacer. La phase se convirtió en
documentación de una decisión ya tomada, no en el proceso que genera la decisión.

---

## Correcciones propuestas

### C-001 — Tabla de trazabilidad obligatoria en plan.md cuando hay RC

Todo plan.md que derive de un análisis con RC debe incluir:

```markdown
## Trazabilidad RC → Tarea

| Tarea | Archivo | Resuelve RC |
|-------|---------|-------------|
| ... | ... | RC-00N |
```

Gate de salida de Phase 3: verificar que cada RC de prioridad Alta o Media
aparece en al menos una fila de la tabla.

### C-002 — Criterio explícito para saltar STRUCTURE/DECOMPOSE

Saltar Phase 4 y Phase 5 solo si se cumplen TODAS las condiciones:
1. El trabajo es puramente mecánico (renombrar, reformatear, mover)
2. No hay RC con prioridades distintas que mapear
3. Todas las tareas tienen criterio de aceptación trivial (verificable con grep)

Si hay RC → DECOMPOSE es obligatorio para verificar cobertura.

### C-003 — Verificación de cobertura antes de presentar plan al usuario

Antes de decir "aprobas el scope?", el modelo debe responder internamente:
"¿Cada RC Alta y Media tiene al menos una tarea en el plan?"
Si la respuesta es no → agregar la tarea antes de presentar.

---

## Estado de implementación de las correcciones

- [ ] C-001 — Agregar requisito de tabla de trazabilidad en SKILL.md Phase 3
- [ ] C-002 — Actualizar criterio de skip de STRUCTURE/DECOMPOSE en SKILL.md
- [ ] C-003 — Agregar gate de cobertura en SKILL.md Phase 3 (exit criteria)
