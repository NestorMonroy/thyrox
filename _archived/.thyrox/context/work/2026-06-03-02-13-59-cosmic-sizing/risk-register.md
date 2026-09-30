```yml
created_at: 2026-06-03T02:13:59
project: THYROX
work_package: 2026-06-03-02-13-59-cosmic-sizing
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# Risk Register — COSMIC sizing

| ID | Riesgo | Prob | Impacto | Mitigación |
|----|--------|------|---------|-----------|
| R-01 | Submódulos e-comerce inaccesibles (`127.0.0.1`) → no se pueden contar data movements reales | Alta | Alto | Construir el skill con el método + scope; el conteo real del piloto espera acceso o insumo de la sesión e-comerce |
| R-02 | Granularidad inconsistente al mapear procesos funcionales (mezclar épicas con sub-acciones) infla/deforma el CFP | Media | Medio | Fijar "1 proceso funcional = 1 caso de uso elemental / endpoint con triggering event propio" |
| R-03 | Confundir COSMIC con IFPUG/FPA (otro método, no compatible) | Media | Medio | El skill cita ISO 19761 explícito; no mezclar reglas |
| R-04 | Estimaciones SPECULATIVE tomadas como medición | Media | Alto | I-012: el CFP solo es válido con data movements OBSERVABLE; marcar estimaciones como hipótesis |
| R-05 | Scope creep (medir todo e-comerce en vez del buy-flow piloto) | Media | Medio | Scope cerrado al buy-flow; catálogo/auth/admin = medición aparte |

---

**Última actualización:** 2026-06-03T02:13:59
