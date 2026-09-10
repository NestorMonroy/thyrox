```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/valet/
```

# Análisis: valet — Beans, design+plan pairs, specs por subsistema

## Qué es

Plataforma de agentes de coding self-hosted. Cada sesión corre en sandbox aislado (Modal) con VS Code + browser + terminal + agente OpenCode con 73 herramientas. Web UI + Slack + Telegram. Monorepo con pnpm workspaces.

El proyecto más maduro en terms de **documentación como disciplina** de los 14 analizados.

---

## Los conceptos clave

### 1. .beans/ — Work items en markdown

19 beans como archivos markdown con YAML frontmatter:

```yaml
---
title: "Memory File System Facade"
status: done
type: epic
priority: high
tags: [memory, architecture]
depends_on: [valet-mf5v]
---

## Problem
[Narrativa del problema]

## Design
[Diseño completo con diagramas mermaid]

## Implementation
[Archivos a crear/modificar con pasos]

## Acceptance Criteria
- [ ] Memory API responde en <100ms
- [ ] Tests de integración pasan
```

**Por qué funciona:**
- Zero dependencias externas (no Jira, no Notion)
- Self-contained: requirement + design + acceptance en UN archivo
- `depends_on` previene trabajo fuera de orden
- Git commits referencian bean ID → audit trail
- AI-friendly: diseño completo antes de implementar

**Comparación con THYROX:** Nuestros epics/ intentan hacer esto pero son más largos y menos estructurados. Los beans son densos (1-3 páginas por item) con YAML metadata.

### 2. Triple: beans + specs + plans

```
.beans/          → QUÉ hacer y POR QUÉ (requirement + design)
docs/specs/      → CÓMO se comporta el sistema (contratos, state machines)
docs/plans/      → CÓMO implementar paso a paso (tasks con checkboxes)
```

| | .beans/ | docs/specs/ | docs/plans/ |
|---|---|---|---|
| **Pregunta** | ¿Qué problema resolvemos? | ¿Cómo debe comportarse? | ¿Cómo lo implemento? |
| **Audiencia** | Product + Architecture | Architecture + Dev | Implementador (human/AI) |
| **Vida útil** | Permanente | Permanente | Se archiva post-implementation |
| **Formato** | Problem + Design + AC | State machine + API + data model | Tasks + steps + code samples |

**Para THYROX:** Tenemos demasiadas categorías mezcladas. No distinguimos entre requirement (beans), behavior spec (specs), e implementation guide (plans).

### 3. Design + Implementation pairs (40+ archivos)

Cada feature tiene DOS documentos en plans/:

```
2026-03-08-managed-skills-design.md         ← DESIGN (qué y por qué)
2026-03-08-managed-skills-implementation.md ← PLAN (cómo, paso a paso)
```

El implementation plan tiene tareas con:
- Archivos exactos a crear/modificar
- Steps numerados con checkboxes
- Code samples para cada step
- Comando de verificación (typecheck, test)
- Mensaje de commit exacto

**Para THYROX:** Confirmado por clawpal (design+impl-plan pairs) y spec-kit (spec→plan→tasks). Valet lo hace con mayor detalle y precisión.

### 4. Specs por subsistema (no monolítico)

```
docs/specs/
├── sessions.md          ← Lifecycle, state machine
├── sandbox-runtime.md   ← Boot sequence, runner
├── real-time.md         ← WebSocket, events
├── workflows.md         ← Definitions, triggers
├── auth-access.md       ← OAuth, access control
├── orchestrator.md      ← Routing, memory
├── integrations.md      ← Plugin framework
└── sandbox-images.md    ← Base image, versioning
```

Cada spec tiene **boundary rules**: "This spec does NOT cover X — see Y spec." Previene duplicación.

### 5. V1.md + V2.md como visiones versionadas

- V1 = immutable reference (sessions, sandbox, runtime) — NO se modifica
- V2 = extends V1 (orchestration, routing, personas) — V2 depende de V1
- Los specs heredan del versión apropiado

**Para THYROX:** No tenemos visión versionada. Todo muta in-place (ERR-019 ya lo identificó).

### 6. Locked decisions en CLAUDE.md

```markdown
9 architectural decisions. Decided and locked in. Do not revisit:
1. WebSocket-only runner communication
2. Three Durable Objects (SessionDO, RunnerDO, OrchestratorDO)
3. Unified plugin system
...
```

**Para THYROX:** Nuestras decisiones (ADRs) son registro histórico. Las de valet son **bloqueos activos** — Claude Code no puede cuestionar decisiones locked.

### 7. Skills como markdown por plugin

```
packages/plugin-personas/skills/personas.md
packages/plugin-workflows/skills/workflows.md
packages/plugin-browser/skills/browser.md
```

3 fuentes de skills: builtin (plataforma), plugin (packages), managed (creadas por agente en runtime).

---

## Comparación con los 13 proyectos anteriores

| Aspecto | Valet | Proyecto más similar | THYROX |
|---------|-------|---------------------|--------|
| **Work items** | .beans/ (YAML+MD, 19 items) | agentic-framework (F-NNNN) | epics/ (sin metadata YAML) |
| **Design+Plan pairs** | 40+ pares con fecha | clawpal (48 planes) | analysis/ (mezclado) |
| **Specs por subsistema** | 8 specs con boundary rules | spec-kit (spec per feature) | Ninguno |
| **Vision versionada** | V1.md + V2.md | Ninguno | Ninguno |
| **Locked decisions** | 9 en CLAUDE.md | Cortex (KERNEL zones) | ADRs (registro, no bloqueo) |
| **Skills por plugin** | packages/plugin-*/skills/ | oh-my-claude (STV skills) | references/ (monolítico) |

---

## Meta-patrones actualizados (14 proyectos)

### Patrón confirmado: Work items como archivos markdown en git

| Proyecto | Sistema | Metadata |
|----------|---------|----------|
| valet | .beans/ (YAML frontmatter) | status, type, priority, depends_on |
| agentic-framework | F-NNNN acceptance criteria | status, feature ID |
| build-ledger | Audits numerados (00-10) | Sin YAML |
| clawpal | Plans con fecha | Sin metadata formal |
| **THYROX** | epics/ | Sin metadata YAML |

**Convergencia:** Los mejores proyectos usan YAML frontmatter en sus work items. THYROX no.

### Patrón confirmado: Specs con boundary rules

| Proyecto | Boundary rules |
|----------|---------------|
| valet | "This spec does NOT cover X — see Y" |
| spec-kit | Separate spec files per feature |
| agentic-framework | Acceptance criteria boundary |
| **THYROX** | Ninguno (todo mezclado) |

### Patrón nuevo: Locked decisions (no solo documented)

Solo valet y Cortex tienen decisiones que son BLOQUEOS ACTIVOS. Los otros (incluyendo THYROX) las documentan pero no las bloquean.

---

## Lecciones para THYROX

### Adoptar

1. **.beans/ con YAML frontmatter** — Nuestros epics/ necesitan metadata: status, type, priority, depends_on. No solo markdown libre.

2. **Boundary rules en specs** — Cada documento debe decir explícitamente qué NO cubre.

3. **Locked decisions en CLAUDE.md** — Convertir las ADRs más importantes en "decided and locked. Do not revisit."

### Evaluar

4. **Triple beans+specs+plans** — ¿THYROX necesita los 3 niveles? Quizás 2 son suficientes (beans + plans, como claude-pipe's PRD+BUILD_SPEC).

5. **Vision versionada (V1/V2)** — Útil cuando THYROX tenga V2 de su metodología.

### La reflexión final

Valet demuestra que **documentación como disciplina** produce código de alta calidad a escala. No es overhead — es la estructura que permite que humanos y AI trabajen juntos efectivamente.

La diferencia entre THYROX y valet no es de conceptos (tenemos los mismos: references, assets, scripts, decisions). Es de **disciplina y precisión**: YAML frontmatter, boundary rules, locked decisions, acceptance criteria con checkboxes, implementation plans con code samples.

---

**Última actualización:** 2026-03-28
