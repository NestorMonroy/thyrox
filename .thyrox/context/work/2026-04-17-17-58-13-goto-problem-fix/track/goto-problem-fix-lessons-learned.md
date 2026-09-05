```yml
created_at: 2026-04-18 01:58:20
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
total_lessons: 10
```

# Lessons Learned: goto-problem-fix (ÉPICA 41)

## Propósito

Capturar qué aprendió el equipo durante ÉPICA 41 — corrección de problemas goto en scripts de sesión, remediación de hallazgos de audit, y análisis de política de CHANGELOG/ROADMAP.

---

## Lecciones

### L-123: PAT-004 — checkbox `[x]` debe ir en el mismo commit que la implementación

**Qué pasó**

Al ejecutar B8/B9 se descubrió que varios checkboxes T-NNN en task-plans anteriores habían sido marcados `[x]` en commits separados de la implementación (o en commits de cierre de sesión), violando PAT-004.

**Raíz**

No había instrucción explícita en el framework que prohibiera el commit separado del checkbox. Era una convención implícita, no codificada.

**Fix aplicado**

`thyrox/SKILL.md` y `workflow-execute/SKILL.md` actualizados con instrucción explícita de PAT-004. La regla es: el `[x]` es parte del mismo Edit que implementa la tarea — no un paso posterior.

**Regla**

Cuando se completa una tarea T-NNN, el checkbox `[x]` y el código/artefacto van en el mismo commit. Nunca en commits separados porque el checkbox documenta el estado real de la implementación, no una intención.

---

### L-124: Flat namespace collapse en stage directories — usar domain subdirectories desde el inicio

**Qué pasó**

El directorio `analyze/` acumuló 12+ artefactos de dominios distintos (coverage, naming, framework, proceso, templates, audit-design) en un solo nivel, haciendo imposible distinguir el eje temático de cada documento solo por su nombre.

**Raíz**

La regla de domain subdirectories existía pero solo se activaba cuando el problema era ya evidente. El umbral "≥3 sub-análisis o múltiples dominios" no tenía enforcement preventivo.

**Fix aplicado**

Se reorganizó `analyze/` en 7 domain subdirectories. La regla se codificó explícitamente en `metadata-standards.md` con ejemplos del problema (flat namespace collapse) y la solución (domain subdir).

**Regla**

Cuando un stage directory va a recibir más de 2 documentos de dominios distintos, crear los domain subdirectories ANTES de crear el primer artefacto. El costo de reorganizar retroactivamente es mayor que el costo de estructurar bien desde el inicio.

---

### L-125: El execution-log debe crearse al inicio del WP, no retroactivamente

**Qué pasó**

Al llegar a Stage 11 el WP no tenía `execution-log.md`. Fue necesario crearlo retroactivamente reconstruyendo commits y sesiones desde git log.

**Raíz**

El template del execution-log existe pero no hay instrucción en Stage 1 o Stage 8 que obligue a crearlo antes de ejecutar. Era un artefacto "para Stage 10" que nunca se creaba porque Stage 10 asumía que ya existía.

**Fix aplicado**

Se creó el execution-log retroactivo (2 sesiones). La instrucción de crear el execution-log al inicio de Stage 10 se verifica mediante la alerta B-09 de `session-start.sh`.

**Regla**

Cuando Stage 10 EXECUTE inicia, la primera acción es crear `execute/{wp}-execution-log.md` con la estructura de sesiones. No esperar a que haya entradas — el archivo vacío con encabezado ya es válido y previene el trabajo retroactivo.

---

### L-126: REGLA-LONGEV-001 era una regla de síntoma, no de causa raíz

**Qué pasó**

REGLA-LONGEV-001 ("si el archivo supera 25KB, mover historial a `-archive`") creó `CHANGELOG-archive.md` (475 líneas) y `ROADMAP-history.md` (921 líneas) que duplicaban historial ya disponible en git log.

**Raíz**

La regla resolvió el síntoma (archivo grande) sin atacar la causa raíz: el historial no debería acumularse en archivos de estado activo. I-002 (git es la única persistencia) ya prohibía esta duplicación — REGLA-LONGEV-001 era inconsistente con I-002.

**Fix aplicado**

`CHANGELOG-archive.md` y `ROADMAP-history.md` eliminados. REGLA-LONGEV-001 revisada en `conventions.md`: historial → git, no a `-archive`. Política de `CHANGELOG.md` raíz clarificada: solo en releases con `git tag vX.Y.Z`.

**Regla**

Cuando un archivo de estado activo supera el umbral, evaluar la causa: si es acumulación de historial, eliminar el historial (git lo tiene). Si es estado activo genuinamente grande, dividir por dominio semántico — nunca por antigüedad.

---

### L-127: Naming de agentes coordinadores debe coincidir con el namespace de methodology_step

**Qué pasó**

Los archivos `babok-coordinator.md` y `pmbok-coordinator.md` usaban el nombre largo del estándar (BABOK, PMBOK) pero el namespace en `now.md` era `ba:` y `pm:`. La inconsistencia hacía difícil trazar coordinator → metodología → steps.

**Raíz**

Los archivos se crearon en ÉPICA 40 siguiendo la convención "nombre del estándar" sin considerar que el namespace del `methodology_step` ya usaba el prefijo corto.

**Fix aplicado**

Rename a `ba-coordinator.md` y `pm-coordinator.md`. Actualizados: 2 agent files, routing-rules.yml, ARCHITECTURE.md, 3 references/, project-state.md.

**Regla**

El nombre de archivo de un coordinator (`{prefix}-coordinator.md`) debe coincidir con el prefijo del namespace en `methodology_step` (`{prefix}:step`). Si el estándar tiene nombre largo, usar el prefijo corto que ya aparece en los steps.

---

### L-128: Un WP puede contener N análisis, planes y perspectivas — no cerrar por inercia

**Qué pasó**

ÉPICA 41 comenzó como un "goto problem fix" y terminó conteniendo: análisis de causa raíz, corrección de scripts, remediation plan (B8/B9), workflow-audit skill, coverage analysis de 9 recomendaciones, rename de coordinators, y policy analysis de CHANGELOG/ROADMAP.

**Raíz**

La tendencia natural es cerrar el WP cuando la tarea original está completa. Pero I-011 establece que un WP solo se cierra cuando el ejecutor lo ordena explícitamente — y el ejecutor puede elegir acumular trabajo relacionado en el mismo WP.

**Fix aplicado**

El WP permaneció abierto y acumuló 7 dominios de análisis en `analyze/`, 2 task plans, y 40 commits. Se documentó explícitamente en `changelog-roadmap-policy-analysis.md` como patrón de WP multi-análisis.

**Regla**

Un WP es un contenedor de trabajo relacionado, no un contenedor de una sola tarea. Cuando emerge trabajo relacionado durante Stage 10 o Stage 11, es válido y preferible continuar en el mismo WP en lugar de crear uno nuevo. El WP se cierra cuando el ejecutor decide que el trabajo está completo.

---

### L-129: La auditoría de WP (`/thyrox:audit`) debe ejecutarse antes de Stage 12, no durante

**Qué pasó**

El primer audit del WP se ejecutó con Grade A 94% (1 FAIL, 3 PARTIAL). Fue necesario un ciclo de remediación (B8/B9) antes de poder cerrar limpiamente. El audit se ejecutó tarde en el ciclo.

**Raíz**

El skill `workflow-audit` fue creado en este mismo WP — no existía previamente. Al crearlo y usarlo por primera vez, naturalmente se ejecutó sobre un WP que ya tenía trabajo acumulado sin audit previo.

**Fix aplicado**

`thyrox/SKILL.md` actualizado con sección "Herramientas de calidad" que referencia `/thyrox:audit` como pre-requisito de Stage 12. El audit final fue Grade A 100%.

**Regla**

Ejecutar `/thyrox:audit` al inicio de Stage 11 TRACK/EVALUATE (no al final). Si hay FATAs o PARTIALs, resolverlos antes de Stage 12. El audit es el gate de calidad entre Stage 11 y Stage 12.

---

### L-130: Referencias rotas son deuda técnica inmediata — validar en el mismo commit

**Qué pasó**

Al eliminar `CHANGELOG-archive.md`, quedó una referencia rota en `CHANGELOG.md` (línea 260). No fue detectada hasta el siguiente análisis.

**Raíz**

La eliminación de un archivo no valida automáticamente qué otros archivos lo referencian.

**Fix aplicado**

Se detectó y corrigió en el commit siguiente (`bce1b03`). Herramienta disponible: `grep -r "CHANGELOG-archive" .` antes de cualquier `git rm`.

**Regla**

Antes de `git rm {archivo}`, ejecutar `grep -r "{archivo}" . --include="*.md"` para detectar referencias. Si hay referencias, actualizar en el mismo commit que el rm.

---

---

### L-131: La etiqueta "framework" como identidad de un sistema agentic genera coupling y confusión

**Qué pasó**

THYROX se describía como "framework de gestión de proyectos para Claude Code" desde ÉPICA 1. Esta descripción era incorrecta en dos dimensiones: (1) "framework" implica inversión de control pasiva — THYROX actúa, decide y orquesta, es un sistema activo; (2) "para Claude Code" acoplaba la identidad a la implementación actual.

**Raíz**

La etiqueta "framework" se adoptó en el momento de creación del sistema por analogía con frameworks conocidos (Django, React), sin verificar si el patrón de control era el mismo. No existía un análisis formal de la taxonomía del sistema.

**Fix aplicado**

Deep-review exhaustivo de 35+ archivos, aplicado en 4 commits. Identidad canónica: "THYROX es un sistema de Agentic AI que orquesta 23 agentes especializados con memoria persistente, gates HITL y 12 stages propios para gestión de proyectos." Documentado en `adr-thyrox-agentic-ai-identity.md`.

**Regla**

Al etiquetar un sistema, verificar su patrón de control real: ¿el humano controla el sistema (framework), o el sistema actúa autónomamente con HITL? Si el sistema tiene agentes autónomos, memoria persistente, loops de decisión y hooks reactivos → es Agentic AI, no framework. Usar la taxonomía SoK como referencia.

---

### L-132: La identidad de un sistema debe estar desacoplada de su plataforma de implementación

**Qué pasó**

"THYROX para Claude Code" hacía que cualquier descripción del sistema requiriera mencionar Claude Code, confundiendo qué es THYROX (un sistema de Agentic AI) con dónde corre actualmente (Claude Code de Anthropic). Un usuario que lea la documentación podría pensar que THYROX es un plugin de Claude Code, no un sistema propio.

**Raíz**

La identidad y la implementación se documentaron juntas desde el inicio. No hubo separación de capas: conceptual (qué es) vs implementación (cómo corre hoy).

**Fix aplicado**

Modelo de dos capas: (1) Identidad canónica sin mención de plataforma — "THYROX es un sistema de Agentic AI..."; (2) Nota de implementación explícita y separada — "Implementado actualmente sobre Claude Code (Anthropic)." Aplicado en documentos de identidad pública (README, ARCHITECTURE, SKILL.md principal).

**Regla**

En documentos de identidad pública, separar siempre la descripción del sistema de su implementación actual. La nota de implementación es obligatoria pero como contexto adicional, nunca como parte de la identidad. Esto preserva la portabilidad conceptual del sistema ante cambios de plataforma.

---

## Resumen

| # | Área | Impacto |
|---|------|---------|
| L-123 | PAT-004 checkbox policy | Sistema actualizado |
| L-124 | Domain subdirectories preventivos | metadata-standards.md actualizado |
| L-125 | Execution-log al inicio de Stage 10 | Práctica codificada |
| L-126 | REGLA-LONGEV-001 revisada | conventions.md + 2 archivos eliminados |
| L-127 | Coordinator naming consistency | 7+ archivos actualizados |
| L-128 | WP multi-análisis es patrón válido | I-011 documentado explícitamente |
| L-129 | Audit es gate Stage 11→12 | SKILL.md actualizado |
| L-130 | Validar referencias antes de git rm | Práctica documentada |
| L-131 | "framework" como identidad — incorrecto para sistemas agentic | ADR + 35+ archivos actualizados |
| L-132 | Identidad desacoplada de plataforma de implementación | Modelo dos capas documentado en ADR |
