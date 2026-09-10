```yml
work_package_id: 2026-04-09-22-47-58-technical-debt-resolution
closed_at: 2026-04-10 04:30:00
project: THYROX
source_phase: Phase 7 — TRACK
total_lessons: 5
author: Claude
```

# Lessons Learned: technical-debt-resolution (FASE 29)

## Propósito

Capturar qué aprendió el equipo durante FASE 29 — qué funcionó, qué falló, y qué regla generalizable se puede extraer para no repetir el error o para replicar el éxito.

---

## Lecciones

### L-118: Rename scope creep — archivos en subdirectorios de skills no estaban en el plan

**Qué pasó**

T-014 (verificación post-rename) encontró ~20 archivos adicionales con `pm-thyrox` que no estaban
en el scope original del plan: `workflow-*/references/*.md`, `thyrox/scripts/*.py`, `sphinx/SKILL.md`,
`context/project-state.md`, etc. El plan de Phase 3/4 solo listaba CLAUDE.md, scripts/, workflow-*/SKILL.md,
references/*.md (`.claude/references/`). No se consideraron los subdirectorios de skills.

**Raíz**

El inventario de Phase 1 ANALYZE buscó "pm-thyrox" en categorías pero no hizo un `grep -rl` exhaustivo.
La verificación post-rename del plan era un checkpoint de corrección, no de descubrimiento.

**Fix aplicado**

Fase 6 EXECUTE extendió el scope: se actualizaron todos los archivos activos encontrados en T-047.
ADRs y archivos WP históricos se dejaron intencionalmente como registros históricos correctos.

**Regla**

Cuando un rename afecta a más de 3 directorios, ejecutar `grep -rl "term" .claude/ --include="*.md" --include="*.sh" --include="*.py" --include="*.json" | grep -v context/work/ | grep -v context/decisions/` en Phase 1 ANALYZE y incluir el resultado completo en el plan de Phase 5. No confiar en categorías manuales.

---

### L-119: SPEC-006 criterion unreachable — criterio de tamaño incorrecto para technical-debt.md

**Qué pasó**

SPEC-006 en Phase 4 STRUCTURE estableció: "wc -c technical-debt.md < 25,000 bytes después de mover TDs [-]".
El archivo tenía 55K bytes con 35+ TDs. Remover 4 TDs ([-]) equivalía a ~5K bytes, resultando en 54.8K.
El criterio era algebraicamente imposible para el scope planificado.

**Raíz**

Phase 4 asumió que los TDs [-] (4 entradas) representaban la mayor parte del archivo. No se calculó
el tamaño real de los 4 TDs vs el total. El criterio se estableció antes de medir.

**Fix aplicado**

T-042 documentó el error como "planning gap". El trabajo técnico fue correcto (4 TDs movidos al WP resolved).
El criterio fue anotado en el task-plan como incorrecto, sin bloquear el avance.

**Regla**

Cuando se establece un criterio de tamaño de archivo en SPEC, medir el tamaño actual y calcular cuánto
se reduciría con el scope planificado ANTES de escribir el criterio. Criterio correcto: "wc -c después de
quitar TDs [-] = actual - tamaño_de_esos_TDs_especificos". Nunca poner < 25K sin verificar que es alcanzable.

---

### L-120: Context compaction mid-WP sin pérdida de progreso — el resumen de sesión preservó el estado

**Qué pasó**

La sesión se compactó a mitad del Phase 6 EXECUTE (después del commit T-042 pero antes de Lote 5).
La nueva sesión retomó desde el resumen sin pérdida de información. El commit pendiente (T-042)
fue identificado en el resumen como "próximo paso" con el comando exacto.

**Raíz**

Los commits convencionales frecuentes (cada Lote) y el task-plan actualizado con [x] por tarea
permitieron que el resumen fuera suficientemente preciso para retomar sin ambigüedad.

**Fix aplicado**

La sesión nueva retomó directamente ejecutando el commit pendiente.

**Regla**

Commits frecuentes (cada 3-7 tareas) + task-plan con [x] por tarea + now.md::phase actualizado
son suficientes para retomar después de compaction sin preguntar al usuario. No es necesario crear
"checkpoints manuales" adicionales.

---

### L-121: Verificación post-rename requiere grep en 3 capas: activos, WP archive, ADRs

**Qué pasó**

El grep de verificación T-014 del plan original no distinguía entre archivos activos (que deben
actualizarse), archivos WP históricos (que deben preservarse como registros), y ADRs (que son
inmutables). El resultado de T-047 fue 921 hits totales vs 0 hits en activos.

**Raíz**

El plan no estableció qué subset del repo debía tener 0 hits. "0 resultados en grep" es ambiguo
cuando hay cientos de archivos históricos que correctamente mencionan el nombre antiguo.

**Fix aplicado**

T-047 ejecutó grep con filtros: `grep -v context/work/ | grep -v context/decisions/` para
verificar solo archivos activos no-ADR. Resultado: 2 archivos (historical bodies), aceptable.

**Regla**

Cuando un rename tiene archivos históricos (WP archives, ADRs), el criterio de verificación debe
especificar explícitamente: "0 resultados en archivos ACTIVOS (excluir context/work/ y context/decisions/)".
Incluir el comando exacto en el task-plan desde Phase 5.

---

### L-122: {wp}-changelog.md y {wp}-technical-debt-resolved.md — primeros WPs en usar los nuevos artefactos Phase 7

**Qué pasó**

FASE 29 fue el primer WP en crear los artefactos `{wp}-changelog.md` y `{wp}-technical-debt-resolved.md`
(D2 y D3, introducidos en T-017 de este mismo WP). El proceso fue bootstrapped: los templates
se crearon y se usaron en el mismo WP.

**Raíz**

El WP creó sus propios artefactos de Phase 7 antes de que existieran los templates. Esto es correcto
metodológicamente (el WP que introduce algo nuevo lo aplica primero).

**Fix aplicado**

Los artefactos fueron creados manualmente siguiendo el template. Resultado: `technical-debt-resolved.md`
con 10 TDs registrados, `lessons-learned.md` y `wp-changelog.md` en Phase 7.

**Regla**

Cuando un WP introduce nuevos artefactos de Phase 7, el primer uso es el WP mismo. La calidad del
template se valida en ese primer uso. Si el template requiere ajuste, actualizarlo antes de cerrar
Phase 7 del WP que lo introdujo.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| Plan scope incompleto en renames masivos | L-118, L-121 | Phase 1 ANALYZE debe incluir grep exhaustivo para renames; criterio de verificación debe excluir archivos históricos explícitamente |
| Criterios de tamaño sin medición previa | L-119 | SPEC debe calcular delta antes de establecer umbral numérico |
| Commits frecuentes = compaction resilience | L-120 | Confirmar que commits + task-plan [x] son suficientes para retomar — no añadir overhead extra |

---

## Qué replicar

- **Commits por Lote (~7 tareas)**: Granularidad perfecta para el resumen de sesión y para el WP changelog.
- **task-plan con notas de planning errors**: Documentar en el task-plan cuando un criterio fue incorrecto en lugar de bloquearse — permite avanzar con evidencia.
- **Verificación en 3 capas (activos / WP archive / ADRs)**: Distinguir qué debe cambiar vs qué debe preservarse como registro histórico.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| — | technical-debt.md sigue siendo 55K bytes (no se redujo significativamente) | baja | Un WP futuro podría archivar TDs cerrados masivamente |
| — | FASE 27 (agentic-loop) sigue en Phase 1 gate 1→2 pendiente | alta | Retomar FASE 27 como siguiente WP |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
