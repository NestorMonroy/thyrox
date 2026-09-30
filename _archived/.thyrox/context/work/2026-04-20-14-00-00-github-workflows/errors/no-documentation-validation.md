```yml
id: WP-ERR-003
created_at: 2026-04-20 18:30:15
phase: Phase 1 — DISCOVER
severity: media
recurrence: primera
```

# WP-ERR-003: No Documentation Validation in Workflows

## Qué pasó

Los cambios a documentación (CLAUDE.md, ADRs, references/) no se validan automáticamente. Es posible mergear:

- ADRs sin formato correcto
- References rotos o inconsistentes
- CLAUDE.md con errores YAML
- Nombres de archivos que violan convenciones

Ejemplo visible: En la rama merged `claude/check-merge-status-Dcyvj`, se generaron muchos archivos pero no hay evidencia de que estructura/ nombres sigan convenciones.

## Por qué

La validación de documentación es invisible. No causa "errores ruidosos" como syntax errors en código. Los hallazgos aparecen solo cuando alguien lee la documentación, lo cual puede ser weeks después del merge.

## Prevención

Crear workflow `docs-validate.yml` que valide:

1. YAML frontmatter válido en todos los .md
2. Nombres de archivos en `.thyrox/context/work/` siguen patrón YYYY-MM-DD-HH-MM-SS-nombre
3. Stage directories (discover/, analyze/, plan/) contienen solo artefactos válidos
4. Metadata fields (created_at, phase, author) presentes en todos los WP docs
5. Referencias cruzadas válidas (ADR links, work-package references)

Script: `.thyrox/scripts/validate-docs-structure.sh`

## Insight

La documentación es código. Cuando se trata como tal (validación automática, linting, tests), la calidad sube 3x. Cuando no, es "la parte que nadie mantiene".
