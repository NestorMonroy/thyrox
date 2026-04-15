```yml
type: Phase 1 Analysis
created_at: 2026-04-15 02:23:24
wp: commands-rellinks
fase: FASE 38
```

# Análisis — commands-rellinks (FASE 38)

## 1. Problema

Dos problemas estructurales en el framework THYROX:

1. **Commands fuera de lugar:** 11 archivos de commands viven en `/commands/` (raíz del proyecto) en lugar de `.claude/commands/` (ubicación oficial según CLAUDE.md).
2. **Referencias sin links navegables:** Los commands y `.claude/references/` mencionan archivos .md en texto plano (backticks sin link, prosa) en lugar de Markdown links relativos `[texto](../ruta.md)`.

---

## 2. Hallazgos

### 2.1 Commands en `/commands/` (raíz)

11 archivos a mover → `.claude/commands/`:

| Archivo | Líneas | Skill que invoca | Referencias de archivo |
|---------|--------|-----------------|----------------------|
| `analyze.md` | 11 | `workflow-analyze` | `` `.claude/skills/workflow-analyze/SKILL.md` `` |
| `decompose.md` | 10 | `workflow-decompose` | `` `.claude/skills/workflow-decompose/SKILL.md` `` |
| `deep-review.md` | 35 | agente `deep-review` | `` `.claude/references/` `` |
| `execute.md` | 10 | `workflow-execute` | `` `.claude/skills/workflow-execute/SKILL.md` `` |
| `init.md` | 10 | `workflow_init` | `` `.claude/commands/workflow_init.md` `` |
| `plan.md` | 10 | `workflow-plan` | `` `.claude/skills/workflow-plan/SKILL.md` `` |
| `spec-driven.md` | 186 | standalone | `[sdd.md](.claude/references/sdd.md)` (link roto) |
| `strategy.md` | 10 | `workflow-strategy` | `` `.claude/skills/workflow-strategy/SKILL.md` `` |
| `structure.md` | 10 | `workflow-structure` | `` `.claude/skills/workflow-structure/SKILL.md` `` |
| `test-driven-development.md` | 147 | standalone | `[sdd.md](.claude/references/sdd.md)` (link roto) |
| `track.md` | 10 | `workflow-track` | `` `.claude/skills/workflow-track/SKILL.md` `` |

**Total:** 449 líneas. Los links en `spec-driven.md` y `test-driven-development.md` ya tienen sintaxis Markdown pero el path es incorrecto — `.claude/references/sdd.md` asume raíz del proyecto, no `.claude/commands/`.

### 2.2 Impacto de rutas post-move

Desde `.claude/commands/` la raíz del proyecto está en `../../`. Los paths deben ajustarse:

| Path actual (desde raíz) | Path correcto (desde `.claude/commands/`) |
|--------------------------|------------------------------------------|
| `.claude/skills/workflow-*/SKILL.md` | `../skills/workflow-*/SKILL.md` |
| `.claude/references/sdd.md` | `../references/sdd.md` |
| `.claude/commands/workflow_init.md` | `workflow_init.md` |
| `.claude/references/` (mención general) | `../references/` |

### 2.3 Referencias sin links en `.claude/references/`

382 menciones de archivos .md en texto plano, clasificadas por urgencia:

| Urgencia | Count | Descripción |
|----------|-------|-------------|
| **Crítica** | ~180 | Referencias navegables en prosa y tablas — el archivo existe, el link añadiría valor |
| **Media** | ~120 | En code blocks, diagramas ASCII, exemplos JSON — NO convertir |
| **Baja** | ~82 | Auto-referencias "Fuente:", tablas comparativas |

Top 5 archivos con más referencias navegables sin link:

| Archivo | Refs | Archivos más referenciados |
|---------|------|---------------------------|
| `claude-authoring.md` | 57 | CLAUDE.md (en prosa y tablas) |
| `conventions.md` | 51 | ROADMAP.md, CHANGELOG.md, ARCHITECTURE.md |
| `skill-authoring.md` | 42 | SKILL.md (42 menciones directas) |
| `examples.md` | 28 | ROADMAP.md (narrativa) |
| `memory-hierarchy.md` | 28 | CLAUDE.md (patrones y descripción) |

**Regla de conversión:** Solo convertir referencias en prosa, tablas "Ver también", y secciones "Referencias relacionadas". NO convertir:
- Contenido dentro de bloques de código triple backtick
- Diagramas ASCII (árboles de directorio con `├──`)
- Menciones en frontmatter YAML
- Wildcards como `*-analysis.md` (patrones glob, no paths concretos)

### 2.4 Herramienta existente

`/.claude/scripts/detect_broken_references.py` ya valida links Markdown existentes y detecta referencias rotas. Usar como validador post-conversión, no como convertidor.

---

## 3. Estado actual

- `/commands/` existe en la raíz pero no es la ubicación oficial per CLAUDE.md
- `.claude/commands/` tiene solo `workflow_init.md` (correcto)
- Los 11 commands en `/commands/` no están siendo descubiertos correctamente por Claude Code (están fuera de `.claude/`)
- 382 referencias de texto plano reducen la navegabilidad del knowledge base

---

## 4. Restricciones

- **No romper links existentes:** `spec-driven.md` y `test-driven-development.md` tienen links Markdown funcionales desde su ubicación actual — la conversión debe actualizar los paths, no recrear los links
- **Atomicidad:** Mover + actualizar paths en un solo paso por comando (no mover y dejar paths rotos)
- **Discriminar contexto:** Las referencias en code blocks y diagramas son intencionales — no convertir
- **`detect_broken_references.py` como gate:** Correr antes y después de conversiones en references/

---

## 5. Riesgos

| Riesgo | Prob | Impacto | Mitigación |
|--------|------|---------|-----------|
| R-1: Path breakage post-move | Alta | Alto | Actualizar paths en el mismo commit que el move |
| R-2: Over-conversion en referencias | Media | Medio | Regla explícita: no tocar code blocks ni ASCII trees |
| R-3: Link a archivo inexistente | Baja | Medio | Correr detect_broken_references.py post-conversión |
| R-4: Conflicto con `workflow_init.md` existente | Baja | Bajo | `init.md` invoca a `workflow_init.md` — ambos coexisten en `.claude/commands/` |

---

## 6. Tamaño del WP

**Mediano** — 2 tasks principales (move + rellinks), 13 archivos de commands + ~10 prioritarios en references/.
Usar Phases 1 → 3 → 5 → 6.
Omitir Phase 2 (strategy obvia) y Phase 4 (no requiere spec formal).
