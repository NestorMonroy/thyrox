```yml
work_package_id: 2026-04-08-23-55-52-workflow-restructure
closed_at: 2026-04-09 02:48:38
project: THYROX
source_phase: Phase 7 — TRACK
total_lessons: 4
author: Claude
```

# Lessons Learned: workflow-restructure (FASE 23)

## Propósito

Capturar qué aprendió el equipo durante FASE 23 — migración de 7 `workflow_*.md` flat files a `workflow-*/SKILL.md` subdirectorios, actualización de referencias, adición de contenido faltante, y reducción de `pm-thyrox/SKILL.md` a ≤150 líneas.

---

## Lecciones

### L-094: UTF-8 encoding en Python `open()` — `errors="replace"` previene crash silencioso

**Qué pasó**

El script Python para añadir `owner:` a 24 archivos de `references/` falló en `commit-helper.md` con `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xc3`. El primer run había procesado 10 archivos exitosamente antes del crash.

**Raíz**

Python's `open()` por defecto usa el encoding del sistema (puede variar). El archivo `commit-helper.md` tenía caracteres UTF-8 multibyte (tildes, ñ) que el decodificador falló en leer sin la directiva correcta.

**Fix aplicado**

Añadir `encoding="utf-8", errors="replace"` a todas las llamadas `open()`. El segundo run procesó los 14 archivos restantes correctamente.

**Regla**

Cuando Python lee archivos Markdown del proyecto, siempre usar `encoding="utf-8", errors="replace"` en `open()` para evitar crash en caracteres multibyte.

---

### L-095: T-numbers en el DAG del task-plan deben validarse contra la tabla de tareas

**Qué pasó**

El task-plan inicial tenía en el DAG: `TD01[T-009 escalabilidad]` pero T-009 era `CLAUDE.md` y escalabilidad era T-013. El usuario detectó el error en revisión "revisa si se esta considerando TODO lo de Phase 4". También había un nodo fantasma `TD04[T-015 marcar TDs]` que no existía como tarea real.

**Raíz**

El DAG fue escrito en paralelo con la lista de tareas sin un paso de validación cruzada. Los T-numbers del DAG quedaron desfasados de los T-numbers reales.

**Fix aplicado**

Reescribir el DAG usando los T-numbers de la tabla de tareas como source of truth. Eliminar el nodo fantasma.

**Regla**

Después de crear el DAG en Phase 5, hacer un paso explícito de validación: cada nodo `T-NNN` en el DAG debe tener una fila correspondiente en la lista de tareas con ese mismo número.

---

### L-096: El target ≤150 líneas requiere contar ANTES de declarar T-016 completado

**Qué pasó**

T-016 se declaró completo después de escribir el SKILL.md reducido, pero el archivo resultó tener 176 líneas vs el target ≤150. Fue necesario hacer cortes adicionales (filas opcionales de artefactos, bloque de convención de nombres, nota legacy) para llegar a 148 líneas.

**Raíz**

La estimación de líneas se hizo antes de escribir el archivo. Al combinar las secciones conservadas (artefactos, estructura WP, naming, referencias), el total superó el target sin que hubiera una verificación de `wc -l` antes de marcar la tarea completada.

**Fix aplicado**

Verificar con `wc -l` inmediatamente después de escribir el archivo. Si supera el target, hacer cortes adicionales antes de hacer commit.

**Regla**

Cuando una tarea tiene un criterio de aceptación numérico (≤N líneas, ≤N bytes), verificar el criterio con la herramienta apropiada antes de marcar `[x]` y antes de hacer commit.

---

### L-097: ADRs son históricos — cambios van como addendum al final, no como edición directa

**Qué pasó**

T-011 requería actualizar `adr-016.md` con el cambio de nomenclatura (underscore → hyphen). La primera idea fue editar el cuerpo del ADR para reflejar el nuevo naming. El diseño correcto (DD-04) era añadir `## Addendum — FASE 23` al final.

**Raíz**

La inmutabilidad de los ADRs no está explícitamente documentada en la spec (solo en la tabla SKILL vs ADR de CLAUDE.md). En ausencia de instrucción explícita, la tendencia natural es editar el contenido existente.

**Fix aplicado**

Implementado como addendum al final del ADR, preservando el cuerpo histórico intacto.

**Regla**

Los ADRs una vez aprobados son inmutables. Para registrar cambios posteriores, añadir `## Addendum — FASE N (fecha)` al final. Nunca editar el cuerpo histórico del ADR.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| Verificación numérica post-escritura | L-096 | Añadir paso `wc -l` explícito en acceptance criteria de T-016 tipo |
| Validación cruzada DAG ↔ tarea list | L-095 | Añadir ítem de checklist en Phase 5: "Cada T-NNN del DAG existe en la lista de tareas" |

---

## Qué replicar

- **Bloque parallel con commits atómicos**: Los 4 bloques (M, R, TD, S) con commits separados por bloque facilitaron el tracking y los checkpoints del stop hook. Mantener este patrón para WPs multi-archivo.
- **Python scripts para operaciones batch**: Para operaciones repetidas sobre muchos archivos (como añadir `owner:` a 24 referencias), un script Python corto es más seguro y rápido que edits manuales o bash loops.
- **Review de gaps Phase 4 → Phase 5**: La revisión "revisa si se está considerando TODO lo de Phase 4" antes de aprobar el task-plan detectó 3 errores reales. Este gate de revisión explícita debe ser estándar.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-018 | execution-log — usar timestamp completo `YYYY-MM-DD HH:MM:SS` en frontmatter y headers | baja | standalone fix |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
