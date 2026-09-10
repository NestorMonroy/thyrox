```yml
Proyecto: THYROX
Work package: 2026-04-04-04-16-29-technical-debt-resolution
Fecha creación: 2026-04-04-04-16-29
Última actualización: 2026-04-04-04-16-29
Fase actual: Phase 1 — ANALYZE
Riesgos abiertos: 3
Riesgos mitigados: 0
Riesgos cerrados: 0
Autor: claude
```

# Risk Register — technical-debt-resolution

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado |
|----|-------------|:---:|:---:|:---:|--------|
| R-001 | Eliminar templates usados en WPs históricos no auditados | Media | Medio | media | Abierto |
| R-002 | Actualizar references rompe links que aún funcionan | Baja | Bajo | baja | Abierto |
| R-003 | Scope creep: agregar nuevas fases mientras se resuelve deuda | Alta | Medio | alta | Abierto |

---

## Detalle de riesgos

### R-001: Eliminar templates usados en WPs históricos no auditados

**Descripción**
Los 4 templates a eliminar (`analysis-phase.md`, `categorization-plan.md`, `document.md`,
`project.json`) podrían estar referenciados en WPs históricos o en artefactos de sesiones
anteriores que no se auditaron explícitamente.

**Probabilidad**: media
**Impacto**: medio (historial git preserva el contenido)
**Severidad**: media
**Estado**: abierto
**Fase de identificación**: Phase 1

**Señales de alerta**
- Al borrar un template, `git grep` devuelve referencias activas fuera de `assets/`
- Un WP histórico lista el template como output en su task-plan

**Mitigación**
- Antes de eliminar cada template, ejecutar `git grep "nombre-template" --` para encontrar referencias
- Si hay referencias activas, evaluar caso por caso

**Plan de contingencia**
- Si un template tenía uso legítimo: `git show HEAD~1:path/to/template` lo recupera
- ADR-008 garantiza preservación en historial git

---

### R-002: Actualizar references rompe links que aún funcionan

**Descripción**
Al actualizar `examples.md`, `reference-validation.md`, y `scalability.md` (T-004 del
WP skill-consistency), podría corromperse algún link interno que actualmente funciona.

**Probabilidad**: baja
**Impacto**: bajo
**Severidad**: baja
**Estado**: abierto
**Fase de identificación**: Phase 1

**Mitigación**
- Ejecutar `validate-broken-references.py` antes y después de cada cambio
- Modificar archivos de forma atómica (un archivo por commit)

---

### R-003: Scope creep — agregar nuevas fases o features mientras se resuelve deuda

**Descripción**
Este WP tiene scope bien definido: resolver deuda existente, no agregar funcionalidad.
El riesgo es que durante la ejecución se identifiquen mejoras tentadoras que dilaten el cierre.

**Probabilidad**: alta (patrón recurrente, L-001 de voltfactory-adaptation)
**Impacto**: medio (retrasa cierre pero no bloquea)
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1

**Señales de alerta**
- Se crea un SPEC que no estaba en el plan aprobado
- Una tarea crece en complejidad más allá de lo estimado

**Mitigación**
- El plan del WP define explícitamente lo que está fuera de scope
- Cualquier item nuevo va a `technical-debt.md`, no a este WP

**Plan de contingencia**
- Si se descubre deuda adicional: registrar en `technical-debt.md` como TD-004+
- No ampliar el scope aprobado; abrir un WP nuevo si la deuda es significativa

---

## Checklist de gestión

- [x] Riesgos identificados en Phase 1 antes de planificar
- [x] Cada riesgo tiene señales de alerta definidas
- [x] Cada riesgo tiene plan de contingencia
- [ ] Registro actualizado al final de cada fase
- [ ] Riesgos materializados referenciados en context/errors/ERR-NNN.md
