```yml
Tipo: Risk Register
Fase: 1 - ANALYZE
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fecha: 2026-04-04
```

# Risk Register — skill-adr-boundary

| ID | Riesgo | Prob | Impacto | Estado |
|----|--------|------|---------|--------|
| R-001 | Los cambios en SKILL.md rompen sesiones Sonnet que ya conocen el formato actual | Baja | Medio | Abierto |
| R-002 | La guía ADR queda duplicada respecto a contenido de SKILL.md | Media | Bajo | Abierto |
| R-003 | La solución es legible para Sonnet pero sigue siendo opaca para Haiku (lenguaje demasiado implícito) | Media | Alto | Abierto |
| R-004 | Se añaden demasiadas secciones a SKILL.md aumentando tokens sin mejorar claridad | Media | Medio | Abierto |

## Mitigaciones

- **R-001**: Hacer cambios aditivos (agregar sección, no mover ni eliminar)
- **R-002**: La guía `adr-guide.md` es la fuente; SKILL.md solo referencia — no duplica
- **R-003**: Usar reglas en formato SI/NO, no párrafos narrativos; testar mentalmente con Haiku
- **R-004**: Mantener la regla del boundary en ≤10 líneas en SKILL.md; detalle va a `adr-guide.md`
