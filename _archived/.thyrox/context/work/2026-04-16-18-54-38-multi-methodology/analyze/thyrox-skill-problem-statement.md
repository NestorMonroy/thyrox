```yml
created_at: 2026-04-17 01:44:01
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Problem Statement — thyrox/SKILL.md desactualizado post ÉPICA 40

## Problema central

El skill `thyrox/SKILL.md` es el punto de entrada del framework. Un desarrollador que lee solo ese archivo no sabe que existen **29 methodology skills** (`pdca-*`, `dmaic-*`, `rup-*`, `rm-*`, `pm-*`, `ba-*`) ni cómo se relacionan con el ciclo THYROX de 12 workflow stages. El SKILL.md describe solo el Nivel 1 (los 12 workflow stages), dejando invisible el Nivel 2 (methodology skills) que ÉPICA 40 construyó completamente.

---

## Contexto

ÉPICA 40 produjo dos categorías de trabajo que el SKILL.md no refleja:

**1. Anatomy completion (skill-anatomy-task-plan.md v2)**
29 methodology skills ahora tienen anatomía completa: SKILL.md + assets/ + references/ + scripts (4 selectivos). Este trabajo establece un patrón de "framework maintenance" que tampoco existe documentado en ningún lugar del SKILL de thyrox.

**2. Demostración del patrón de orquestación**
Los methodology skills operan *dentro* de workflow stages THYROX. Cada skill de metodología declara su `THYROX Stage:` de anclaje (ej: `dmaic-define` → Stage 3 DIAGNOSE). Esta relación de anidamiento no está documentada en thyrox/SKILL.md.

---

## Síntomas observados

| Síntoma | Evidencia |
|---------|-----------|
| SKILL.md omite 29 methodology skills | Catálogo de fases (líneas 44–57) lista solo las 12 fases THYROX |
| Relación de anidamiento no documentada | No hay sección que explique Level 1 vs Level 2 |
| `flow:` y `methodology_step:` sin contexto en el SKILL | Campos definidos en glosario de CLAUDE.md pero sin instrucción de uso en SKILL.md |
| "Framework patterns" sin nombre ni lugar | El skill-anatomy-task-plan ejecutó trabajo de framework con `flow: null` — patrón real, sin identidad |
| Escalabilidad desactualizada | La tabla de escalabilidad menciona "7 phases" en el viejo SKILL.md — el SKILL actual tiene 12 fases pero la lógica de "cuándo usar cuántas fases" no está completamente actualizada para los casos con methodology skills |

---

## Lo que el SKILL.md documenta bien hoy

- Ciclo THYROX completo: 12 workflow stages con tabla, mermaid, escalabilidad
- Estructura de WP: cajones por fase, naming, metadata
- Modelo de permisos (Plano A gates + Plano B herramientas)
- References por dominio (plataforma Claude Code, authoring, patrones)

---

## Alcance del problema

El problema tiene **dos capas**:

**Capa A — Documentación faltante (gaps de contenido):**
Secciones que no existen en el SKILL.md pero deberían:
1. Catálogo de methodology skills con tabla de namespaces y anclaje a workflow stage
2. Arquitectura de orquestación (Nivel 1 workflow stages + Nivel 2 methodology skills)
3. Definición de "framework patterns" como tercer tipo de trabajo

**Capa B — Lógica de selección desactualizada:**
La guía de escalabilidad (cuándo usar cuántas fases) fue diseñada pensando en el ciclo THYROX puro. Con methodology skills activos, la lógica de "¿cuándo saltar fases?" cambia:
- Un WP con `flow: dmaic` implica que Stage 3 DIAGNOSE tiene sus propios sub-pasos (los 5 pasos DMAIC) — la escalabilidad de "saltar Stage 3" ya no aplica igual
- La tabla actual de escalabilidad (micro/pequeño/mediano/grande) no menciona este caso

---

## Criterio de resolución

El problema está resuelto cuando:

1. Un lector de `thyrox/SKILL.md` entiende que existen methodology skills y puede seleccionar cuál usar según su contexto
2. La relación workflow stage ↔ methodology skill está documentada con un ejemplo concreto
3. La guía de escalabilidad contempla el caso "WP con methodology skill activo"
4. El concepto de "framework patterns" tiene un lugar en el SKILL (aunque sea una nota, no un skill dedicado)
