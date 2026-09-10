```yml
type: Harvest de rama lean (+23) → canónica (+989)
created_at: 2026-06-03T00:57:05
rama_origen: claude/wizardly-bardeen-mTiC1 (+23, junio)
rama_destino: feature/github-workflows-implementation (+989, canónica)
```

# Harvest — deltas no-regresivos de la rama lean

## Contexto

La rama lean `+23` (esta sesión de junio) resultó ser una **reconstrucción** de lo que
`+989` ya tenía más maduro (ver `analysis/thyrox-branches-audit.md`). El diff fino
confirmó que su tooling está **superado**. Se porta solo lo **no-regresivo**:

## Qué se portó a +989

| Pieza | Fuente | Por qué |
|-------|--------|---------|
| Decisiones/auditorías (e-comerce merge declinado, buy-flow, F-PROD-03, auditoría de ramas) | rama lean | Valor único: el "cómo decidimos", trazable |
| Regla `timestamps-iso8601-obligatorios.md` | e-comerce | +989 no la tenía |
| Regla `agent-reports.md` + hook `save-agent-report.py` + SubagentStop en settings | adaptado (e-comerce RST → Markdown) | +989 no registraba reportes de subagentes |

## Qué NO se portó (superado por +989)

- Single-skill `pm-thyrox` y 7 fases (← +989 tiene 82 skills, 12 fases).
- `thyrox-init/audit`, scripts validate, 5 agents agile (← +989: `bin/`, `workflow-audit`,
  `gate-consistency-evaluator`, sp-*/pm-coordinator).
- `.githooks` vendoring: marginal (+989 ya valida Conventional Commits vía commit-msg-hook.sh).

## Nada se perdió

Las 5 ramas siguen en `origin`. `check-merge-status` es redundante (⊂ +989).
`check-setup`/`skill-rewrite` (marzo, pre-.thyrox) → cosechar hallazgos de errores aparte.
