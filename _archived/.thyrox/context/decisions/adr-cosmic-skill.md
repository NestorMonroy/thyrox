```yml
type: ADR
estado: Aprobado
created_at: 2026-06-03T03:52:55Z
```

# ADR — Skill `cosmic` hand-authored (no generado por el registry)

## Contexto

THYROX no tenía dimensionamiento funcional. Se añadió el skill `cosmic` (COSMIC v5.0,
ISO 19761) para la fase MEASURE/BASELINE.

## Decisión

`cosmic` es un **skill hand-authored** en `.claude/skills/cosmic/`, NO generado por
`registry/_generator.sh` (igual que `python-mcp`). Su fuente autoritativa son los
manuales oficiales COSMIC v5.0 vendorizados en `references/manual/` (provistos por el
ejecutor). No se añade a `registry/methodologies/` porque es una **capacidad de medición**,
no un coordinator de metodología de gestión.

## Consecuencias

- El skill se versiona y mantiene a mano; no se regenera.
- Validado: UC-AUTH-02 = 8 CFP (coincidencia exacta con e-comerce).
- Encaja en BASELINE; lo invoca el ejecutor o `workflow-baseline` para medir tamaño funcional.
