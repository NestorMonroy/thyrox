```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/claude-pipe/
```

# Análisis: claude-pipe — Organización de proyecto

## Qué es

claude-pipe es un bridge que conecta Claude Code con plataformas de chat (Telegram, Discord, CLI). No es un framework de project management como spec-kit — es un **proyecto real que usa una metodología simple y efectiva.**

---

## Cómo organiza el trabajo

### Solo 2 documentos antes de código

```
PRD.md        ← QUÉ construir y POR QUÉ (4 KB)
BUILD_SPEC.md ← CÓMO construirlo con qué contratos (8 KB)
↓
src/          ← Implementación
```

No hay 7 fases, no hay 8 subsecciones de análisis, no hay work-logs ni epics. Solo **PRD → BUILD_SPEC → Code.**

### PRD.md — Lo esencial

| Sección | Qué contiene |
|---------|-------------|
| Product Summary | 1 párrafo: qué es |
| Objective | 1 párrafo: qué logra |
| Primary User Story | 1 ejemplo concreto |
| Scope: In/Out | Listas explícitas |
| Functional Requirements | 8 requisitos numerados |
| Non-Functional Requirements | 4 constraints |
| Data Model | JSON schema ejemplo |
| Risks | 3 riesgos identificados |
| Success Criteria | 4 criterios testables |
| Milestones | 5 fases |

**4 KB total.** Comparado con nuestros 8 documentos de Phase 1 que suman ~1200 líneas.

### BUILD_SPEC.md — El contrato

| Sección | Qué contiene |
|---------|-------------|
| Locked Decisions | Decisiones cerradas (no negociables) |
| Repository Layout | Estructura exacta de carpetas |
| Runtime Flow | Pseudo-código de 11 pasos |
| Core Type Contracts | Interfaces TypeScript reales |
| Session Store Spec | Formato, atomicidad, semántica |
| Channel Adapter Spec | Telegram (long polling), Discord (gateway) |
| Agent Loop Spec | Pseudo-código con controles |
| Acceptance Test Matrix | 5 escenarios concretos |
| Implementation Phases | 5 fases secuenciales |
| Definition of Done | Criterios de completitud |

**8 KB total.** Es un HÍBRIDO de plan + tasks. No los separa.

---

## Comparación: 3 enfoques

| Aspecto | claude-pipe | spec-kit | THYROX |
|---------|------------|----------|--------|
| **Docs pre-código** | 2 (PRD + BUILD_SPEC) | 4+ (spec, plan, tasks, checklists) | 8+ (8 subsecciones Phase 1 + strategy + plan + structure + tasks) |
| **Total KB docs** | ~12 KB | Variable | ~50+ KB en analysis/ |
| **Fases** | Implícitas (5 milestones) | 4 comandos (specify→plan→tasks→implement) | 7 fases formales |
| **Tracking** | Checkboxes en milestones | Checkboxes en tasks.md | ROADMAP + work-logs + epics |
| **Constitution** | No existe | `/memory/constitution.md` | Template sin instanciar |
| **Work-logs** | No existen | No existen | Obligatorios (ADR-012) |
| **Overhead** | Mínimo | Medio | Alto |
| **Para qué sirve** | Proyecto individual | Framework de specs | Framework de PM |

---

## Lo que claude-pipe hace mejor que THYROX

### 1. Menos documentos, más valor por documento

PRD.md tiene TODO lo que necesitas para entender el proyecto en 4 KB. THYROX necesita 8+ documentos y 1200+ líneas para lo mismo.

**Lección:** ¿Realmente necesitamos 8 subsecciones separadas en Phase 1? O podemos hacer UN documento de análisis más denso?

### 2. BUILD_SPEC como híbrido plan+tasks

No separa "plan" de "tasks". El BUILD_SPEC tiene la arquitectura Y las fases de implementación en UN documento. No hay un documento de "strategy" separado de un documento de "structure" separado de un documento de "tasks".

**Lección:** ¿Necesitamos Phase 2 + Phase 4 + Phase 5 como documentos separados? claude-pipe hace los 3 en UN archivo.

### 3. Scope explícito (In/Out)

PRD.md tiene secciones "In Scope (v1)" y "Out of Scope (v1)". Esto previene scope creep sin necesidad de gates complicados.

**Lección:** Más simple que constitution gates. Solo decir qué está fuera.

### 4. Type Contracts como documentación

Las interfaces TypeScript EN el BUILD_SPEC son la documentación. No hay gap entre "lo que dice el doc" y "lo que dice el código" — son lo mismo.

**Lección:** Nuestros templates son genéricos. claude-pipe pone código real en los docs.

### 5. Zero overhead de proceso

No hay work-logs. No hay ADRs. No hay checklist templates. No hay EXIT_CONDITIONS. Solo PRD → BUILD_SPEC → Code → Tests.

**Lección:** ¿Estamos creando overhead que no agrega valor?

---

## Lo que THYROX hace que claude-pipe no

- **Trazabilidad** — ADRs, error tracking, decisions/ (claude-pipe no tiene)
- **Escalabilidad** — Funciona para proyectos de cualquier tamaño (claude-pipe es para UN proyecto)
- **Reutilización** — El SKILL se copia a cualquier proyecto (claude-pipe es específico)
- **Validación** — Scripts de detect/convert/validate (claude-pipe no tiene)
- **Progressive disclosure** — SKILL < 500 líneas con references (claude-pipe no necesita)

---

## Reflexión para THYROX

THYROX tiene **mucho más proceso que claude-pipe pero no necesariamente mejor resultado.** Un PRD de 4 KB + BUILD_SPEC de 8 KB produjeron un proyecto funcional con tests. Nuestros 18+ archivos en analysis/ aún no han producido código.

La pregunta es: **¿el overhead del proceso justifica el valor que agrega?**

Para proyectos pequeños → probablemente no (claude-pipe approach)
Para proyectos medianos → quizás (spec-kit approach)
Para proyectos grandes/equipo → sí (THYROX approach)

Pero THYROX debería poder **escalar hacia abajo** tan fácilmente como escala hacia arriba.

---

**Última actualización:** 2026-03-28
