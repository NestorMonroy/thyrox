```yml
project: THYROX — pm-thyrox framework
work_package: 2026-04-07-03-08-03-parallel-agent-conventions
created_at: 2026-04-07 03:08:03
updated_at: 2026-04-07 03:08:03
current_phase: Phase 1 — ANALYZE
open_risks: 6
mitigated_risks: 0
closed_risks: 0
author: Claude (agente paralelo)
```

# Risk Register: Convenciones para Ejecución Paralela de Agentes

## Propósito

Registrar, priorizar y trackear los riesgos identificados durante el work package `parallel-agent-conventions`. Un riesgo es una condición que **podría** impedir completar el trabajo con la calidad esperada.

> Diferencia con `error-report.md`: el error ya ocurrió. El riesgo es lo que **puede** ocurrir.
> Actualizar este documento en cada fase. Un riesgo no gestionado es una deuda oculta.

---

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado | Dueño |
|----|-------------|:------------:|:-------:|:---------:|--------|-------|
| R-001 | Dos agentes reclaman la misma tarea simultáneamente (sin estado `[~]`) | alta | alto | crítica | abierto | Claude |
| R-002 | Conflicto de escritura en `now.md` entre agentes paralelos | alta | medio | alta | abierto | Claude |
| R-003 | Conflicto de escritura en `ROADMAP.md` durante ejecución paralela | media | alto | alta | abierto | Claude |
| R-004 | Colisión de nombres de WP por timestamps en el mismo segundo | media | medio | media | abierto | Claude |
| R-005 | Convenciones propuestas rompen compatibilidad con WPs históricos | baja | alto | alta | abierto | Claude |
| R-006 | Sobrecarga cognitiva por aumento de complejidad del framework | media | medio | media | abierto | Claude |

**Severidad** = Probabilidad × Impacto:
- `crítica` = probabilidad alta + impacto alto
- `alta` = probabilidad alta + impacto medio, o media + alto
- `media` = combinaciones intermedias
- `baja` = probabilidad baja o impacto bajo

---

## Detalle de riesgos

### R-001: Dos agentes reclaman la misma tarea por ausencia de estado in-progress

**Descripción**

El task-plan solo tiene estados `[ ]` (pendiente) y `[x]` (completado). No existe estado intermedio que indique que un agente ya tomó la tarea pero aún no la completó. Dos agentes ejecutando en paralelo sobre el mismo task-plan pueden ambos leer `[ ] T-001` y comenzar a ejecutarla simultáneamente, produciendo trabajo duplicado o resultados inconsistentes.

**Probabilidad**: alta
**Impacto**: alto
**Severidad**: crítica
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- Dos commits con mensajes similares sobre la misma tarea T-NNN en un intervalo corto
- Un artefacto de WP aparece dos veces con contenidos distintos
- Un agente reporta haber completado una tarea que el otro agente aún marca como pendiente

**Mitigación**

- Introducir estado `[~]` (in-progress) con campo `agent_id` y timestamp de claim en el formato del task-plan
- El agente escribe `[~] [T-001] Descripción @agent-id (claimed: YYYY-MM-DD HH:MM:SS)` antes de ejecutar
- Hacer el claim atómico usando un commit git como mecanismo de serialización

**Plan de contingencia**

- Si ocurre duplicación: identificar qué agente completó la versión canónica via git log
- Revertir el work duplicado con `git revert`
- Marcar la tarea como completada y documentar la colisión en `context/errors/ERR-NNN.md`

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado durante dogfooding de ejecución paralela | Claude |

---

### R-002: Pérdida de estado de sesión por escritura concurrente en now.md

**Descripción**

`now.md` es un archivo único que registra el estado de la sesión actual: `current_work`, `phase`, `blockers`, `session_started_at`. Si N agentes escriben a `now.md` simultáneamente, el último en escribir sobreescribe el estado de los demás. En el mejor caso se pierde información; en el peor, git detecta un conflicto de merge que requiere intervención manual.

Evidencia directa de dogfooding: este agente recibió instrucciones explícitas de "NO modificar now.md" — workaround ad-hoc que no está codificado en el framework.

**Probabilidad**: alta
**Impacto**: medio
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- `now.md` muestra `current_work` de un WP que ya terminó (estado obsoleto)
- Conflicto de merge en `.claude/context/now.md` al hacer `git pull`
- Un agente reporta estar en Phase 3 pero `now.md` dice Phase 6

**Mitigación**

- Reemplazar `now.md` por patrón `now-{agent-id}.md` (un archivo por agente)
- `project-status.sh` agrega todos los `now-*.md` para la vista global
- Documentar que el patrón `now-{agent-id}.md` es la convención para ejecución paralela

**Plan de contingencia**

- Si `now.md` queda en estado conflictuado: identificar el estado real desde los artefactos de cada WP
- Resolver el conflicto manteniendo la entrada más reciente por campo
- Migrar a `now-{agent-id}.md` si el conflicto ocurre más de una vez

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado — evidencia directa del dogfooding | Claude |

---

### R-003: Conflicto de merge en ROADMAP.md por actualizaciones concurrentes

**Descripción**

ROADMAP.md es la fuente de verdad del progreso. Phase 6 requiere que cada agente actualice `[ ]` → `[x]` al completar tareas. Si dos agentes editan secciones diferentes de ROADMAP.md en paralelo y luego hacen commit, git puede detectar conflictos de merge en el mismo archivo, paralizando el flujo hasta intervención manual.

Evidencia directa: la instrucción "NO modificar ROADMAP.md" dada a este agente es el segundo workaround ad-hoc del mismo problema.

**Probabilidad**: media
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- Conflicto de merge en `ROADMAP.md` al hacer `git merge` o `git pull`
- ROADMAP.md desactualizado respecto al work real (como sucede en la sesión actual)
- Un agente ve tareas marcadas `[x]` que no ejecutó

**Mitigación**

- Cada agente registra su progreso en `{wp}/{nombre-wp}-execution-log.md` durante la ejecución
- ROADMAP.md se actualiza solo al cierre de la sesión, por un agente designado como "escritor"
- Alternativamente: definir secciones de ROADMAP.md como propiedad exclusiva de cada agente (particionamiento por WP)

**Plan de contingencia**

- Si ocurre conflicto de merge: resolver manualmente tomando la unión de los cambios (ambas tareas marcadas `[x]`)
- Si el conflicto es frecuente: considerar un ROADMAP por WP que se agrega al ROADMAP global al cierre

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado — segundo workaround ad-hoc observado | Claude |

---

### R-004: Colisión de identificadores de WP por timestamps en el mismo segundo

**Descripción**

Los work packages usan el timestamp como identificador único (`YYYY-MM-DD-HH-MM-SS-nombre`). Si dos agentes crean WPs en el mismo segundo (como sucede con `2026-04-07-03-08-03-agent-format-spec` y `2026-04-07-03-08-03-parallel-agent-conventions`), los prefijos temporales son idénticos. Comandos como `ls context/work/ | sort | tail -1` ya no son deterministas para identificar "el WP más reciente".

**Probabilidad**: media
**Impacto**: medio
**Severidad**: media
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- Dos directorios en `context/work/` con el mismo prefijo de timestamp
- Un agente reporta trabajar en el WP equivocado porque la detección por "más reciente" es ambigua
- Scripts que asumen unicidad de timestamp producen resultados no deterministas

**Mitigación**

- Añadir `agent-id` como sufijo adicional al nombre del WP cuando se crea en contexto paralelo
- Documentar que los WPs en paralelo deben tener nombres distintos (el nombre ya actúa como desambiguador)
- Actualizar la convención de detección: usar el nombre completo del WP, no solo el timestamp

**Plan de contingencia**

- Si ya hay colisión: el nombre diferente (`agent-format-spec` vs `parallel-agent-conventions`) ya actúa como desambiguador
- Actualizar scripts que dependen del timestamp para usar el path completo como identificador

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado — caso real observado en sesión actual | Claude |

---

### R-005: Las convenciones propuestas rompen compatibilidad con WPs históricos

**Descripción**

THYROX tiene 30+ WPs históricos con formatos preexistentes (task-plans sin `[~]`, artefactos sin `agent_id`). Si las nuevas convenciones de ejecución paralela requieren modificar el formato de los task-plans o los nombres de archivos, los WPs históricos quedan en un estado incompatible que requeriría migración masiva.

**Probabilidad**: baja
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- Scripts de validación fallan en WPs anteriores a la nueva convención
- La documentación del framework requiere "migrar todos los WPs existentes"
- Phase 5 o Phase 6 de un WP histórico falla al verificar el formato del task-plan

**Mitigación**

- Diseñar las convenciones como extensiones opcionales del formato actual, no reemplazos
- Aplicar el principio de retrocompatibilidad: `[ ]` y `[x]` siguen siendo válidos; `[~]` es estado adicional opt-in
- Documentar explícitamente que las convenciones de paralelo aplican solo a WPs nuevos creados en modo paralelo

**Plan de contingencia**

- Si hay incompatibilidad: agregar nota de versión en la convención ("aplica a WPs creados desde 2026-04-07")
- Crear script de migración opcional (no obligatorio) para WPs activos que se quieran modernizar

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado como riesgo de diseño | Claude |

---

### R-006: Sobrecarga cognitiva por aumento de complejidad del framework

**Descripción**

El framework pm-thyrox tiene como valor central la simplicidad operacional: Markdown, git, y reglas claras. Introducir convenciones de coordinación paralela (per-agent state, claim protocols, ADR namespacing) puede aumentar la carga cognitiva hasta el punto donde modelos con menor capacidad (Haiku) no puedan seguir el framework correctamente, o donde los usuarios humanos necesiten documentación adicional para entender el estado del sistema.

**Probabilidad**: media
**Impacto**: medio
**Severidad**: media
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- Un modelo Haiku omite el protocolo de claim al ejecutar tareas
- La sección de "Parallel Execution" en SKILL.md supera las 50 líneas
- Usuarios reportan confusión al intentar monitorear el estado de múltiples agentes

**Mitigación**

- Diseñar las convenciones de paralelo como un "modo opt-in" claramente delimitado
- Mantener el caso de uso normal (un agente, un WP) sin cambios en su flujo
- Limitar la sección de paralelo en SKILL.md a un bloque conciso con referencia a `references/parallel-execution.md` para detalles
- Validar las convenciones con un modelo Haiku antes de considerar la fase completa

**Plan de contingencia**

- Si el framework se vuelve demasiado complejo: separar las convenciones de paralelo en un reference dedicado
- Mantener el camino feliz (ejecución secuencial) sin fricción adicional

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado como riesgo de diseño del framework | Claude |

---

## Riesgos cerrados

| ID | Descripción | Cómo se cerró | Fecha cierre |
|----|-------------|---------------|-------------|
| — | Sin riesgos cerrados aún | — | — |

---

## Checklist de gestión

- [x] Riesgos identificados en Phase 1 antes de planificar
- [x] Cada riesgo tiene señales de alerta definidas
- [x] Cada riesgo tiene plan de contingencia (no solo mitigación)
- [ ] Registro actualizado al final de cada fase
- [ ] Riesgos materializados referenciados en `context/errors/ERR-NNN.md`
