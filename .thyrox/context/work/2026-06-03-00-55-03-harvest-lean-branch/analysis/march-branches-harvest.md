```yml
type: Cosecha de ramas de marzo — resultado
created_at: 2026-06-03T01:02:40
ramas: claude/check-setup-requirements-EAQKA (+71), claude/skill-rewrite-session-2 (+67), claude/check-merge-status-Dcyvj (+962)
```

# Cosecha de las ramas de marzo → resultado: NADA único que portar

## Evidencia

| Qué tienen las ramas de marzo | ¿En +989? |
|-------------------------------|-----------|
| Catálogo `ERR-001..ERR-029` (17 hallazgos reales) | **SÍ** — renombrados a forma descriptiva: `analysis-not-documented.md`, `references-usage-undocumented.md`, `templates-usage-undocumented.md`, … (los 17) |
| 19 work packages (skill-rewrite, multi-interaction-evals, corrections-from-evals, skill-flow-analysis, skill-consistency, grokputer-analysis, reference-errors-analysis, …) | **SÍ** — los 19 presentes en `.thyrox/context/work/` de +989 |
| Trabajo de `check-merge-status` (agent state lifecycle) | **SÍ** — `errors/agent-state-lifecycle-gap.md` |

Además +989 tiene **más** errores documentados (`phase3-without-scope-approval.md`).

## Conclusión

Las tres ramas (`check-setup-requirements`, `skill-rewrite-session-2`, `check-merge-status`)
son **snapshots anteriores totalmente absorbidos por +989**. **Cero valor único.** Copiar
algo sería duplicar lo ya resuelto (viola I-002 git-as-persistence / ERR-026 no re-derivar).

## Acción recomendada

- **No cosechar nada** (no hay deltas únicos).
- **Archivar las 3 ramas** (`check-merge-status` ⊂ +989; las otras dos absorbidas).
  Nada se pierde: siguen en `origin` + su contenido ya vive en +989.
- Detalle de colisión de numeración: el `ERR-025`/`ERR-026` de marzo ≠ los de la rama lean
  (significados distintos) — +989 resuelve esto usando **nombres descriptivos sin número**.
