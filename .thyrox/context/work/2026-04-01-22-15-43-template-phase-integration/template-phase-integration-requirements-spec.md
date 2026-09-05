```yml
Tipo: Especificación Técnica
Proyecto: thyrox / pm-thyrox SKILL
Work package: 2026-04-01-22-15-43-template-phase-integration
Versión: 1.0
Fecha actualización: 2026-04-02-00-00-00
Estado: Aprobado
```

# Requirements Spec: Template Phase Integration

## Resumen Ejecutivo

Formalizar en SKILL.md la convención de naming `{nombre-wp}-{tipo}.md` (Reveal Intent)
y documentar que los WPs históricos son legacy. Son 2 cambios quirúrgicos en la
sección `Naming` de SKILL.md.

---

## Requisitos Funcionales

| ID | Requisito | Criterio de aceptación |
|----|-----------|------------------------|
| R-1 | SKILL.md sección Naming contiene regla explícita del patrón `{nombre-wp}-{tipo}.md` | Sección Naming tiene la regla con ejemplo concreto |
| R-2 | SKILL.md documenta que WPs históricos usan naming legacy | Existe nota que menciona `spec.md`, `plan.md`, `lessons.md` como legacy |

## Requisitos No Funcionales

| ID | Requisito |
|----|-----------|
| RNF-1 | SKILL.md no supera 500 líneas post-cambio |
| RNF-2 | Cambios son aditivos — no eliminar texto existente |

---

## Design exacto

### T-001 — Sección Naming de SKILL.md

Agregar después del bloque de naming actual:

```
Artefactos de work package: {nombre-wp}-{tipo}.md
  {nombre-wp} = parte descriptiva del WP (sin timestamp)
  {tipo}      = analysis | solution-strategy | requirements-spec |
                task-plan | execution-log | lessons-learned | risk-register
  Ejemplo: WP "2026-04-02-10-00-00-pagos-stripe"
    → analysis/pagos-stripe-analysis.md
    → pagos-stripe-task-plan.md
    → pagos-stripe-lessons-learned.md
  Excepción: CHANGELOG.md (nombre global, convención universal)
```

### T-002 — Nota WPs históricos

Agregar inmediatamente después de T-001:

```
WPs anteriores a 2026-04-02 usan naming legacy (spec.md, plan.md, lessons.md).
No se migran. La convención {nombre-wp}-{tipo}.md aplica a WPs nuevos.
```

---

## Spec Quality Checklist

- [x] Requisitos tienen criterio de aceptación verificable
- [x] Sin marcadores `[NEEDS CLARIFICATION]`
- [x] Scope acotado (2 tareas, 1 archivo)
- [x] Cambios aditivos — no rompen nada existente
- [x] RNF-1 verificable con `wc -l`
