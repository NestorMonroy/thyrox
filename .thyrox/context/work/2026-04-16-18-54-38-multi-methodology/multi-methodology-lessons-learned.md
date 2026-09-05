```yml
work_package_id: 2026-04-16-18-54-38-multi-methodology
closed_at: 2026-04-16 23:19:43
project: THYROX
source_phase: Phase 11 — TRACK/EVALUATE
total_lessons: 7
author: NestorMonroy
```

# Lessons Learned: multi-methodology (ÉPICA 40)

## Propósito

Capturar qué aprendió el equipo durante ÉPICA 40 — expansión del framework a 6 metodologías (RM, RUP, PMBOK, BABOK, PDCA, DMAIC) con 20 skills especializados, 7 coordinators, y CSO improvements.

---

## Lecciones

### L-001: "File has been modified since read" al editar en paralelo con scripts bash

**Qué pasó**

Al aplicar los `metadata.triggers` con un script bash (Cambio A), el script modificó 20 archivos. Inmediatamente después, intentar hacer `Edit` en uno de esos archivos (rup-elaboration/SKILL.md) falló con "File has been modified since read" porque la lectura previa ya no era válida.

**Raíz**

La herramienta `Edit` verifica que el contenido en memoria coincide con el archivo en disco. Un script bash externo modificó el archivo entre la lectura y el edit, rompiendo esa garantía.

**Fix aplicado**

Re-leer el archivo con `Bash sed -n` para encontrar el texto exacto del ancla, luego ejecutar el `Edit`. Funciona siempre que el texto ancla sea único.

**Regla**

Cuando un script bash modifica archivos, SIEMPRE re-leer antes de cualquier `Edit` sobre esos archivos. No asumir que la lectura previa sigue vigente.

---

### L-002: Namespaces inconsistentes entre skills inter-relacionados

**Qué pasó**

`ba-solution-evaluation/SKILL.md` tenía una referencia a `ba:baplanning` (línea 40) que no fue detectada en el Cambio 0 porque es una referencia cruzada entre skills, no un campo de frontmatter. El deep-review la encontró.

**Raíz**

El Cambio 0 actualizó los campos propios de cada skill (name, methodology_step, artifacts) pero no hizo búsqueda de texto libre dentro del cuerpo de los documentos para referencias cruzadas.

**Fix aplicado**

Deep-review post-implementación con agente independiente; fix inmediato con Edit específico.

**Regla**

Cuando se hace un rename de namespace, hacer `grep -r "old-name"` en TODO el directorio `.claude/skills/` antes de declarar el cambio completo. Las referencias cruzadas no se detectan solo con edición de los archivos renombrados.

---

### L-003: El contrato `metadata.triggers` requiere comillas consistentes

**Qué pasó**

Al revisar los triggers de varios skills, algunos usaban comillas dobles y otros simples. El YAML es válido en ambos casos, pero la consistencia visual es importante para mantenibilidad.

**Raíz**

El script Python de inserción masiva usó el patrón que ya existía en cada archivo, heredando inconsistencias de los templates originales.

**Fix aplicado**

No se corrigió en este WP (impacto cosmético). Documentado para ÉPICA futura.

**Regla**

Los scripts de inserción masiva deben normalizar el formato. Definir una convención explícita: comillas dobles en todos los valores de `metadata.triggers`.

---

### L-004: Tier 2 threshold de 300 líneas requiere criterio adicional

**Qué pasó**

`pm-monitoring/SKILL.md` quedó en 277 líneas después del Cambio C — por encima del ideal pero justificado porque el contenido restante es denso (EVM formulas en tabla). El número de líneas solo no es suficiente para decidir el split.

**Raíz**

El criterio "más de 300 líneas" es necesario pero no suficiente. Un archivo de 250 líneas de tablas densas puede ser más difícil de usar que uno de 350 líneas de texto narrativo.

**Fix aplicado**

Se aplicó el split parcial (extraer EVM detallado a references/), aceptando que 277 líneas es el mínimo viable para pm-monitoring.

**Regla**

El criterio Tier 2 debe combinar: líneas (>300) Y presencia de secciones de referencia (tablas de fórmulas, checklists extensos, catálogos) que no son instrucciones procedurales. La instrucción es siempre en SKILL.md; el material de referencia va a references/.

---

### L-005: Script Python como herramienta de emergencia para bulk edits

**Qué pasó**

Para insertar `metadata.triggers` en 20 archivos simultáneamente, ni la herramienta `Edit` (que requiere leer cada archivo) ni `sed` (frágil con YAML multiline) eran ergonómicos. Se usó Python inline vía `Bash`.

**Raíz**

No había herramienta nativa para "insertar bloque YAML después de campo X en N archivos".

**Fix aplicado**

Script Python3 con `open()`/`replace()` que buscaba el campo `updated_at:` como ancla y insertaba el bloque `metadata:` antes de él.

**Regla**

Para bulk edits en 5+ archivos con estructura similar, usar Python inline es más seguro que intentar N llamadas paralelas a `Edit`. Documentar el pattern en references/tool-patterns.md.

---

### L-006: ADR inmutabilidad vs ejemplos desactualizados en documentación viva

**Qué pasó**

El deep-review encontró que `adr-thyrox-terminology-epic-stage.md` contenía ejemplos `pmbok:executing` y `babok:elicitation` después del Cambio F. Estos no debían cambiarse porque los ADRs son inmutables.

**Raíz**

Tensión entre la regla de inmutabilidad de ADRs y la corrección de ejemplos que ya no son representativos del estado actual del framework.

**Fix aplicado**

Mantener ADR sin cambios (regla de inmutabilidad prevalece). El agente del deep-review marcó esto correctamente como "aceptable — ADR inmutable".

**Regla**

Los ADRs capturan el contexto de la decisión en su momento. Cuando un namespace cambia, solo se actualiza documentación viva (CLAUDE.md, SKILL.md, README). Los ADRs quedan como registro histórico exactamente como fueron escritos.

---

### L-007: deep-review post-implementación encuentra lo que la implementación no ve

**Qué pasó**

Después de 6 commits con Cambios 0-F completados, el deep-review de agente independiente encontró 3 gaps en 10 minutos: referencia cruzada en ba-solution-evaluation, 2 ejemplos en CLAUDE.md y README.md con namespaces viejos.

**Raíz**

Durante la implementación, el foco está en los archivos que se están editando. Los archivos que sirven como "documentación de referencia" (glosario en CLAUDE.md, ejemplos en README.md) quedan fuera del radar natural de edición.

**Fix aplicado**

Agente deep-review con checklist explícito contra el CSO improvements plan. Gaps corregidos en commit `fix(multi-methodology): deep-review gaps`.

**Regla**

Para cualquier cambio de namespace o rename con impacto cross-cutting, SIEMPRE ejecutar deep-review con agente independiente antes de cerrar el WP. El agente externo no tiene el sesgo de "ya lo revisé mientras lo implementaba".

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| Modificación externa invalida estado de lectura | L-001 | Documentar en tool-patterns.md: re-leer siempre después de scripts bash |
| Referencias cruzadas escapan a rename local | L-002 | Agregar step "grep cruzado" al SKILL de rename/refactor |
| Bulk edits requieren Python, no N×Edit | L-005 | Documentar pattern Python inline en tool-patterns.md |
| deep-review encuentra lo que implementación no ve | L-007 | Hacer deep-review obligatorio antes de Stage 11 en WPs de tipo "refactor/rename" |

---

## Qué replicar

- **CSO improvements plan como documento de trabajo**: Tener el plan en `cso-improvements-plan.md` dentro del WP con Cambios A-F enumerados fue clave para no perder contexto entre sesiones. Replicar en cualquier WP con múltiples cambios relacionados.
- **Coordinators con registry YAML**: El patrón `thyrox-coordinator` + YAML dinámico en `.thyrox/registry/methodologies/` escala bien. Agregar nueva metodología = crear un YAML, no modificar código de coordinator.
- **Tier 2 con references/ subdirectory**: El split pm-planning/pm-monitoring demostró que reducir 30% del tamaño mejora usabilidad sin perder contenido. Aplicar proactivamente en nuevos skills grandes.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-new-1 | Normalizar comillas en metadata.triggers (algunos skills usan simple, otros doble) | baja | chore-normalization |
| TD-new-2 | pm-monitoring (277L) aún por encima del ideal Tier 2 — revisar si hay más secciones extractables | baja | tier2-monitoring |
| TD-new-3 | Documentar pattern Python inline en references/tool-patterns.md | media | platform-references-expansion (ÉPICA 37) |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
