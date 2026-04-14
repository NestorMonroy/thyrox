```yml
ID work package: 2026-04-04-04-16-29-technical-debt-resolution
Fecha cierre: 2026-04-04
Proyecto: thyrox — PM-THYROX skill
Fase de origen: Phase 7 — TRACK
Total lecciones: 5
Fase: 7 - TRACK
```

# Lessons Learned: Technical Debt Resolution

---

## Lecciones

### L-025: grep en code-fenced blocks da falsos positivos en validación

**Qué pasó**

El CHECKPOINT-4 de T-025 reportó "FAIL" en SPEC-006 al encontrar `- [ ]` en `investigacion-referencias/analysis/valet-analysis.md` y `clawpal-analysis.md`. Los checkboxes estaban dentro de bloques de código markdown (```) como ejemplos de otras herramientas — no eran tareas reales del WP.

**Raíz**

El criterio de aceptación usó `grep -rn "^\- \[ \]" context/work/2026-03-2*/` sin excluir bloques de código. Grep no entiende markdown, solo patrones de texto.

**Fix aplicado**

Se ajustó el scope del grep de validación para apuntar exactamente a los 8 WPs target, excluyendo WPs fuera del scope original.

**Regla**

Cuando se escriben criterios de aceptación con grep para validar checkboxes markdown, usar paths específicos (no wildcards amplios) y documentar que el criterio puede tener falsos positivos en code-fenced blocks. Alternativamente, restringir el grep a archivos `*-task-plan.md` únicamente.

---

### L-026: Los WPs históricos tienen formatos heterogéneos — el análisis inicial debe hacer inventario de tipos de archivo

**Qué pasó**

La identificación inicial de "8 WPs históricos con checkboxes abiertos" se hizo correctamente, pero varios WPs tenían checkboxes en archivos `*-structure.md` y `*-tasks.md` (formato pre-SKILL.md moderno), no solo en `plan.md`. Si el análisis hubiera asumido solo `plan.md`, se habrían perdido archivos.

**Raíz**

El framework evolucionó entre sesiones. Los WPs de 2026-03-28 usaban nomenclatura antigua (`covariance-structure.md`, `spec-kit-adoption-tasks.md`). No hay garantía de consistencia en WPs históricos.

**Fix aplicado**

Se usó `grep -rn "^\- \[ \]" <WP-DIR>/` (recursivo en todo el directorio) para capturar todos los archivos del WP, independientemente de su nombre.

**Regla**

Cuando se cierra un WP histórico, hacer `grep -rn "^\- \[ \]" <WP-DIR>/` sobre el directorio completo — no asumir que los checkboxes están solo en el archivo de mayor jerarquía.

---

### L-027: El batch paralelo de edits (12 archivos simultáneos) es la forma correcta de cerrar WPs históricos

**Qué pasó**

Los 8 WPs históricos (T-005 a T-012) se cerraron en un único lote con `replace_all: true` aplicado en paralelo a 12 archivos simultáneamente. El proceso tomó segundos y no produjo errores.

**Raíz**

Las ediciones eran independientes entre sí (archivos distintos, mismo cambio: `- [ ]` → `- [x]`). No había dependencias que justificaran ejecución secuencial.

**Fix aplicado**

N/A — el approach funcionó correctamente.

**Regla**

Cuando múltiples archivos necesitan el mismo cambio idempotente (ej: marcar checkboxes), agruparlos en una sola llamada paralela con `replace_all: true`. No ejecutar en loops secuenciales cuando los archivos son independientes.

---

### L-028: Templates huérfanos requieren mapeo en 3 capas para ser descubribles

**Qué pasó**

Los 6 templates (`ad-hoc-tasks`, `analysis-phase`, `categorization-plan`, `document`, `project.json`, `refactors`) existían en `assets/` desde sesiones anteriores pero ningún modelo podía descubrirlos porque no tenían: (1) header `Fase:`, (2) referencia en SKILL.md, ni (3) condición de activación explícita.

**Raíz**

Los templates se crearon en distintos momentos sin un proceso de "integración al flujo". La creación del template y su documentación en el flujo eran dos pasos que no estaban acoplados.

**Fix aplicado**

Se estableció el mapeo en 3 capas: header `Fase:` en el template + referencia en SKILL.md (tabla + sección de fase) + condición explícita ("activar si >N"). Esto permite descubrir el template desde cualquier punto de entrada.

**Regla**

Al crear un nuevo template en `assets/`, completar simultáneamente: (1) agregar `Fase: N - NOMBRE` al frontmatter YAML, (2) agregar link en SKILL.md tabla de artefactos y sección de la fase correcta, (3) definir condición de activación. Sin estos 3 pasos, el template es invisible al flujo.

---

### L-029: Las referencias rotas en examples.md pasan desapercibidas porque nadie las lee como "source of truth"

**Qué pasó**

`references/examples.md` usaba nomenclatura de un sistema de 5 fases (Phase 1: PLAN, Phase 3: DECOMPOSE...) cuando el framework ya tenía 7 fases desde hace meses. El error existía sin detectarse.

**Raíz**

`examples.md` se trata como "documentación de apoyo", no como artefacto que deba pasar validación. Los scripts de validación (`validate-broken-references.py`, `validate-missing-md-links.sh`) validan links, no la coherencia semántica del contenido.

**Fix aplicado**

Se corrigió la nomenclatura (Phase 1-5 → Phase 3-7) y se agregó nota con los 7 nombres oficiales al inicio del documento.

**Regla**

Incluir `references/examples.md` en la checklist de actualización cuando se cambia la nomenclatura de fases. Los documentos de ejemplos son tan propensos a desactualizarse como los de especificación — tratar con la misma disciplina de revisión.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|---|---|---|
| Criterios de aceptación frágiles con grep | L-025 | Documentar limitación en conventions.md: grep no entiende markdown |
| Heterogeneidad de WPs históricos | L-026 | Para WP closures, siempre usar grep recursivo en el directorio completo |
| Templates sin integración al flujo | L-028 | ADR o checklist para creación de templates: los 3 pasos son REQUERIDOS |

---

## Qué replicar

- **Batch A/B/C con checkpoints**: La organización en batches con verificación grep entre cada uno es el patrón correcto para trabajo de "corrección a gran escala". Cada checkpoint es una afirmación verificable, no una opinión.
- **SPEC-00N con criterio grep exacto**: Cada SPEC tuvo su propio criterio de aceptación como comando grep ejecutable. Esto eliminó ambigüedad sobre qué significa "completado".
- **replace_all: true para checkboxes**: Para cerrar WPs históricos, `replace_all: true` sobre `- [ ]` es la técnica correcta — idempotente, rápida, y sin riesgo de introducir errores.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|---|---|---|---|
| T-DT-004 | `investigacion-referencias` WP tiene 3 checkboxes en code-blocks (falsos positivos en validación) — considerar note en el archivo | baja | micro task |
| T-DT-005 | `session-start.sh` hook reporta WP activo incorrecto (`skill-consistency` en lugar de `technical-debt-resolution`) — revisar lógica de detección | media | micro fix |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
