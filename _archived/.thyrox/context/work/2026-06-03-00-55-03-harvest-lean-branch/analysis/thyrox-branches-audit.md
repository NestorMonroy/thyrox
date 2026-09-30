```yml
Tipo: PHASE 1 — ANALYZE (auditoría de ramas)
Fecha creación: 2026-06-03T00:41:22Z
Objeto: Integrar las ramas activas de nestormonroy/thyrox "sin perder información"
```

# Auditoría de ramas — thyrox

## Topología (todas parten de develop = main, congelado 2026-03-28)

| Rama | +commits vs develop | Fecha | Naturaleza |
|------|--------------------:|-------|-----------|
| feature/github-workflows-implementation | **+989** | 2026-04-20 | Plataforma agentic avanzada (canónica) |
| claude/check-merge-status-Dcyvj | +962 | 2026-04-20 | **⊂ github-workflows (redundante)** |
| claude/skill-rewrite-session-2 | +67 | 2026-03-28 | Marzo, pre-migración (.claude/context) |
| claude/check-setup-requirements-EAQKA | +71 | 2026-03-31 | Marzo, pre-migración |
| claude/wizardly-bardeen-mTiC1 (esta sesión) | +23 | 2026-06-03 | Reconstrucción lean single-skill |

Base común de todas = develop. Son **líneas paralelas divergentes**, sin historia compartida.

## Hallazgo central: dos PRODUCTOS distintos, no dos ramas a fusionar

- **+989 = THYROX plataforma** (v3.5, FASE 39): 82 skills (`thyrox` + 12 `workflow-*` +
  11 metodologías BA/BPA/CP/DMAIC/Lean/PDCA/PMI/PPS/RM/RUP/SP + tech), 29 agents, plugin
  `/thyrox:*`, `.mcp.json`, registry, 12 fases DISCOVER→STANDARDIZE. **Es el linaje que usa
  e-comerce.** README: "Sistema de Agentic AI… 12 stages… 11 metodologías formales".
- **+23 (esta sesión) = THYROX lean**: 1 skill (`pm-thyrox`), 7 fases, ADR-004 single-skill,
  scaffold eliminado, tooling propio (hooks/init/audit/ISO).

La premisa de mi rama (ADR-004 "single skill, no 15") es la posición ANTERIOR que el linaje
canónico **superó** (FASE 22: workflow-* como excepción; luego 82 skills). Son visiones
arquitectónicas **contradictorias** → no fusionables sin elegir una.

## +989 ya contiene equivalentes (más maduros) de mi trabajo de junio

`bin/thyrox-init.sh` (=init), `bin/thyrox-loop.sh` (=autonomous), skill `workflow-audit`
(=/thyrox-audit), `gate-consistency-evaluator` (=juicio), hooks PreToolUse, rules
(commit-conventions/metadata/invariants), + 989 commits de methodology-calibration.

→ **Esta sesión re-derivó (en forma lean) lo que +989 ya tenía desde abril.** Es F-027 /
ERR-026 a escala de rama: las ramas existían en origin todo el tiempo; auditar ramas al
INICIO (ANALYZE-first a nivel repo) lo habría detectado.

## Por qué "merge all" sería dañino

73 archivos core en colisión (SKILL/CLAUDE/now/decisions/settings/conventions/validate.yml).
Un octopus-merge: (1) conflictos masivos, (2) **regresaría** la línea avanzada al mezclar la
reconstrucción simple — igual que el merge literal declinado en e-comerce regresaba gitlinks.
"Sin perder información" ya está garantizado: **todas las ramas viven en origin** (git no
pierde nada). Integrar ≠ merge ciego.

## Recomendación

1. **Canónica = +989** (es la THYROX real/avanzada que usa e-comerce). No mergear las demás
   sobre ella a ciegas.
2. **check-merge-status**: redundante (⊂ +989) → archivar.
3. **check-setup-requirements / skill-rewrite-session-2** (marzo, pre-.thyrox): cosechar solo
   hallazgos únicos (docs de errores) si no están ya en +989; el resto, superado.
4. **Mi +23**: hacer un diff fino contra +989 para extraer SOLO deltas genuinamente únicos y
   no-regresivos (p. ej. `.githooks/commit-msg` a nivel git, la regla SubagentStop→registro si
   +989 no la tiene). Lo demás está superado por +989.
5. Decidir la **visión de producto** (plataforma +989 vs lean +23) es prerequisito — es tu call.

**Última actualización:** 2026-06-03T00:41:22Z
