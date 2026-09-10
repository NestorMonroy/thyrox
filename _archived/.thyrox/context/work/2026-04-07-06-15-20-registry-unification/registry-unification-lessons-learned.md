```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-06-15-20-registry-unification
created_at: 2026-04-07 06:15:20
status: Completado
```

# Lecciones Aprendidas: registry-unification

## L-053 — Dos registries con overlapping content = deuda silenciosa

**Contexto:** `registry/` en la raíz y `.claude/registry/` coexistían desde FASE 11. Los templates de tech skills tenían duplicados (`*.skill.template.md` vs `*.template.md`).

**Lección:** Cuando dos directorios tienen propósito similar, uno se convierte en legacy inmediatamente aunque nadie lo declare. La deuda se detecta cuando un nuevo WP intenta escribir en uno de los dos.

**Prevención:** Decidir la ubicación canónica en Phase 1 del WP que crea el directorio. Documentarlo en ADR o en solution-strategy.

---

## L-054 — `skill_template:` en YMLs: metadata de registry, no usado por bootstrap.py

**Contexto:** Los YMLs de tech-experts tienen `skill_template: registry/...` — un campo de documentación que enlaza el agente a su template de skill. Al mover el registry, este campo se rompe silenciosamente.

**Lección:** Los campos de metadata descriptiva (no funcionales) se rompen sin error de runtime. Grep explícito post-migración es necesario: `grep -r "skill_template:" .claude/registry/`.

**Prevención:** En migración de paths, buscar referencias en TODOS los archivos de la estructura movida, no solo en los que bootstrap.py lee.

---

## L-055 — La distinción agente vs SKILL-tech es conceptual, no de archivo

**Contexto:** La pregunta "para qué sirven los templates si los agentes se generan desde YMLs" revela confusión sobre dos flujos diferentes:
- `agents/*.yml` → `bootstrap.py` → `.claude/agents/*.md` = agente spawnable (el **quién**)
- `backend/nodejs.template.md` → `_generator.sh` → `.claude/skills/` = SKILL de metodología (el **cómo**)

**Lección:** La distinción no es obvia por los nombres de archivo. Documentarla explícitamente en `skill-vs-agent.md` (ya existe) previene confusión.

**Prevención:** `skill-vs-agent.md` debe incluir un diagrama de los dos flujos de generación.

---

## L-056 — bootstrap.py PROJECT_ROOT depende de posición relativa del script

**Contexto:** Al mover `bootstrap.py` de `registry/` a `.claude/registry/`, `REGISTRY_DIR.parent` cambió de apuntar al repo root a apuntar a `.claude/`. Fix: `REGISTRY_DIR.parent.parent`.

**Lección:** Los scripts con paths relativos calculados desde `__file__` son frágiles ante movimientos. La nueva posición debe re-derivar el número correcto de `.parent`.

**Prevención:** Incluir un test smoke de `PROJECT_ROOT` en bootstrap.py: `assert (PROJECT_ROOT / ".claude").exists()`.

---

## Resumen de cambios FASE 15

| Artefacto | Acción |
|-----------|--------|
| `registry/agents/*.yml` (7 archivos) | MOVIDOS a `.claude/registry/agents/` |
| `registry/mcp/*.py` (3 archivos) | MOVIDOS a `.claude/registry/mcp/` |
| `registry/bootstrap.py` | MOVIDO + 2 paths corregidos |
| `registry/*.skill.template.md` (3 archivos) | ELIMINADOS (duplicados) |
| `registry/` (raíz) | ELIMINADO |
| `.mcp.json` | 2 paths actualizados |
| `agents/nodejs-expert.yml`, `react-expert.yml`, `postgresql-expert.yml` | `skill_template:` paths corregidos |
| `context/work/INDEX.md` | CREADO — índice de WPs por FASE |
