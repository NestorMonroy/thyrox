```yml
created_at: 2026-04-17 20:30:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — DIAGNOSE
author: deep-review agent
status: Completado
version: 1.0.0
veredicto: GO CONDICIONAL — 4 gaps reales, 1 tarea nueva, 3 modificaciones
```

# Deep-Review: Audit Externo vs Task Plan v1.1.0 — goto-problem-fix (ÉPICA 41)

**Fuente auditada:** Audit externo pre-ÉPICA 40 (20+ secciones)
**Cruzado contra:** task plan v1.1.0 (20 tareas)
**Verificación real:** README.md, ARCHITECTURE.md, `.claude/references/` (47 docs), `.claude/agents/` (23), `.thyrox/registry/`, `hooks/hooks.json`

---

## Tabla de clasificación

| Sección | Descripción | Clasificación | Tarea |
|---------|-------------|---------------|-------|
| 1.1 | README "7 fases SDLC" | YA CUBIERTO | T-009 B-7 |
| 1.2 | README "pm-thyrox" paths | YA CUBIERTO | T-009 B-1 |
| 1.3 | README "setup-template.sh" no existe | YA CUBIERTO | T-009 B-2 |
| 1.4 | README referencia "skill pm-thyrox" texto | YA CUBIERTO | T-009 B-1 |
| 1.5 | README "19 guías + 25 templates" incorrecto | **GAP REAL** | T-009 falta cifras exactas |
| 1.6 | README no menciona coordinators | YA CUBIERTO | T-009 B-8 |
| 2.1 | 12 fases "no implementado" | DATO DESACTUALIZADO | ÉPICA 39 ya implementó |
| 3.1 | `steps:` vs `phases:` en YAMLs | GAP REAL (doc) | T-015 falta aclaración |
| 3.2 | Falta coordinator selection / decision tree | YA CUBIERTO | T-014 D-2 |
| 3.3 | Falta inter-coordinator protocol | YA CUBIERTO | T-015 D-3 |
| 4.1 | ARCHITECTURE.md minimalista | YA CUBIERTO | T-011 B-10 |
| 4.2 | ADRs sin índice | YA CUBIERTO | T-013 B-11 |
| 5.1 | Registry no documentado | **GAP REAL** | T-011 falta registry |
| 5.2 | Extensibility guide YAMLs | FEATURE WORK | ÉPICA 42 |
| 6.1 | README comandos obsoletos | YA CUBIERTO | T-009 B-4 |
| 6.2 | Hooks no documentados | **GAP REAL** | Ninguna tarea — T-021 nuevo |
| 7.1 | Conteo refs incorrecto (47, no 19) | **GAP REAL** | T-009/T-011 sin cifras |
| 7.2 | skill-vs-agent.md sin índice | FEATURE WORK | ÉPICA 42 (out-of-scope) |
| 8.1 | Routing automático coordinator | FEATURE WORK | ÉPICA 42+ |
| 8.2 | Multi-coordinator orchestration | FEATURE WORK | ÉPICA 42+ |
| 8.3 | Artifact dependency tracking | FEATURE WORK | ÉPICA 42+ |
| 9.1 | README versión 0.1.0 | YA CUBIERTO | T-009 B-9 |
| 9.2 | ROADMAP vs CHANGELOG (setup-template) | YA CUBIERTO | T-009 B-2 |
| 10.1 | Meta-framework explanation | YA CUBIERTO | T-009 B-7 + T-011 |
| 10.2 | Coordinator user guides | YA CUBIERTO | T-014 D-2 |
| 10.3 | Decision tree | YA CUBIERTO | T-014 D-2 |
| 10.4 | Orchestration layer docs | YA CUBIERTO | T-015 D-3 |

**YA CUBIERTO: 17 · GAP REAL: 4 · FEATURE WORK: 6 · DATO DESACTUALIZADO: 1**

---

## Gaps reales — detalle y acción

### Gap R-1 — T-009 sin cifras exactas de referencias y agentes

**Archivo:** `README.md` línea 44 dice "19 guías de referencia + 25 templates"
**Realidad:** `.claude/references/` = **47 archivos .md** · `.claude/agents/` = **23 archivos .md**
**Problema en task plan:** T-009 cubre B-5 "Metadata de header: actualizar" pero no especifica las cifras correctas. El ejecutor puede omitir esta línea o poner un número incorrecto.
**Acción:** Modificar T-009 — agregar "actualizar cifras a '47 referencias, 23 agentes'" en la descripción.

### Gap R-2 — T-011 no documenta `.thyrox/registry/` como fuente de verdad

**Archivos:** `grep "registry" README.md` → 0 resultados · `grep "registry" ARCHITECTURE.md` → 0 resultados
**Realidad:** `.thyrox/registry/` contiene `agents/`, `methodologies/` (11 YAMLs), `routing-rules.yml`, `bootstrap.py`, `_generator.sh` — es la fuente de verdad de todo el sistema de coordinators.
**Problema en task plan:** T-011 documenta la arquitectura de coordinators (4 capas) pero no menciona que el registry es la fuente de verdad ni explica el rol de cada archivo generador.
**Acción:** Modificar T-011 — agregar ítem: "documentar `.thyrox/registry/` como fuente de verdad: subdirectorios, roles de bootstrap.py y _generator.sh".

### Gap R-3 — Hooks no documentados en ninguna tarea

**Archivo real:** `hooks/hooks.json` existe en raíz del proyecto
**Realidad:** Sin documentación en README ni ARCHITECTURE sobre ubicación, propósito, o qué hooks están configurados.
**Problema en task plan:** Ninguna tarea cubre este archivo.
**Acción:** Nueva tarea T-021 — agregar sección "Hooks del framework" en ARCHITECTURE.md.

### Gap R-4 — T-015 sin aclaración `steps:` vs terminología pública

**Archivos:** `registry/methodologies/*.yml` usan `steps:` internamente. Documentación pública usa "fases", "pasos", "etapas" de forma inconsistente.
**Realidad:** El audit señala confusión entre naming interno (`steps:`) y terminología pública. No cambiar los YAMLs (requiere verificar bootstrap.py) — solo aclarar en la documentación.
**Acción:** Modificar T-015 — agregar nota: "aclarar que el campo interno en YAMLs de metodología es `steps:` (no `phases:` ni `etapas:`)".

---

## Feature work — ÉPICA 42+

| Item | Descripción |
|------|-------------|
| Routing automático | Algoritmo problem description → coordinator |
| Multi-coordinator sync | Orchestración de coordinators en paralelo |
| Artifact dependency tracking | Grafo de dependencias entre outputs de coordinators |
| Extensibility guide | Cómo agregar nuevo coordinator YAML |
| Índice de referencias | 47 docs con descripción (GAP-06 ya declarado ÉPICA 42) |

---

## Impacto en task plan

| Acción | Tipo | Gap |
|--------|------|-----|
| Modificar T-009 | Enriquecer descripción | R-1 |
| Modificar T-011 | Agregar ítem registry | R-2 |
| Nueva T-021 | Documentar hooks/hooks.json | R-3 |
| Modificar T-015 | Aclarar `steps:` terminología | R-4 |

**Resultado:** 20 tareas → 21 tareas · versión task plan: 1.1.0 → 1.2.0
