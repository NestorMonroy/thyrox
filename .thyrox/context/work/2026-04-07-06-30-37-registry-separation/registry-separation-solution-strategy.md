```yml
type: Estrategia de Solución
work_package: 2026-04-07-06-30-37-registry-separation
created_at: 2026-04-07 06:30:37
status: Aprobado
phase: Phase 2 — SOLUTION_STRATEGY
```

# Solution Strategy: registry-separation

## Key Ideas

1. **Separación datos/comportamiento** — lenguaje explícito de mise: `agents/*.yml` = comportamiento (quién ejecuta), `backend/*.template.md` = datos (qué metodología). La separación física ya existe; falta el lenguaje y la documentación.

2. **README por subdirectorio** — cada subdirectorio del registry explica su propio propósito. No hay que leer el README raíz para entender `agents/`.

3. **`docs/` como referencia pública** — lo que vive en `.claude/registry/` es interno. `docs/` es para cualquier developer que use THYROX. La audiencia es diferente.

4. **Self-hosted** — la documentación está escrita desde la perspectiva de alguien que usa pm-thyrox para gestionar el proyecto. Ejemplo: "Este documento fue producido en Phase 4: STRUCTURE del WP registry-separation."

## Decisiones

| ID | Decisión | Justificación |
|----|----------|---------------|
| D-01 | No mover archivos — solo documentar | Mover rompería paths en `.mcp.json`, `bootstrap.py`. Separación física ya existe. |
| D-02 | Lenguaje datos/comportamiento en todos los docs | Alineado con mise. Hace la distinción intuitiva. |
| D-03 | `docs/registry.md` es referencia pública, README es referencia interna | Audiencias distintas: contributor interno vs developer que adopta THYROX |
| D-04 | `docs/architecture/registry-design.md` documenta la decisión arquitectónica | Cumple ADR — decisión que afecta futuros WPs (cómo extender el registry) |
| D-05 | Futuro: `skill.toml` + JSON Schema en FASE siguiente | Fuera de scope de este WP — no mezclar docs con features nuevos |

## Archivos a crear/modificar

| Archivo | Acción | Audiencia |
|---------|--------|-----------|
| `.claude/registry/README.md` | Reescribir | Contributor interno |
| `.claude/registry/agents/README.md` | Crear | Contributor interno |
| `.claude/registry/mcp/README.md` | Crear | Contributor interno |
| `docs/registry.md` | Crear | Developer que adopta THYROX |
| `docs/architecture/registry-design.md` | Crear | Architect / decisión permanente |
