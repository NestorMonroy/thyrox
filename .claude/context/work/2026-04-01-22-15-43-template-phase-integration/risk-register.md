```yml
Proyecto: thyrox / pm-thyrox SKILL
Work package: 2026-04-01-22-15-43-template-phase-integration
Fecha creación: 2026-04-01-22-15-43
Última actualización: 2026-04-01-22-15-43
Fase actual: Phase 1 — ANALYZE
Riesgos abiertos: 3
Riesgos mitigados: 0
Riesgos cerrados: 0
Autor: Claude
```

# Risk Register: Template Phase Integration

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado | Dueño |
|----|-------------|:------------:|:-------:|:---------:|--------|-------|
| R-001 | Links en SKILL.md apuntan a templates inexistentes | media | alto | alta | abierto | Claude |
| R-002 | Nuevos output filenames rompen detección de fases en WPs históricos | alta | medio | alta | abierto | Claude |
| R-003 | Templates nuevos no siguen convenciones del proyecto | baja | medio | baja | abierto | Claude |

---

## Detalle de riesgos

### R-001: Links en SKILL.md pueden apuntar a templates inexistentes

**Descripción**

Se agregaron referencias a templates en SKILL.md sin verificar formalmente que cada
archivo referenciado existe en `assets/`. Un link roto hace que el modelo genere
el artefacto sin estructura correcta.

**Probabilidad**: media
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-01-22-15-43

**Señales de alerta**
- Modelo crea archivos sin estructura consistente al ejecutar una fase
- `grep` de nombre de template en `assets/` no devuelve resultado

**Mitigación**
- Verificar cada link de SKILL.md contra `ls assets/` antes de Phase 6

**Plan de contingencia**
- Si falta un template: crearlo antes de continuar, no avanzar sin él

---

### R-002: Nuevos output filenames rompen detección de WPs históricos

**Descripción**

SKILL.md ahora busca `requirements-spec.md`, `task-plan.md`, `lessons-learned.md`
para detectar si una fase está completada. WPs anteriores usaban `spec.md`,
`plan.md`, `lessons.md`. La detección fallará para WPs históricos.

**Probabilidad**: alta
**Impacto**: medio
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-01-22-15-43

**Señales de alerta**
- SKILL.md dice "Phase 4 ya completó" buscando `requirements-spec.md` pero el WP tiene `spec.md`
- session-start.sh detecta WP activo pero fase no identificada

**Mitigación**
- Documentar explícitamente que el nuevo naming aplica solo a WPs creados desde esta sesión
- Agregar nota en SKILL.md: "WPs anteriores pueden usar nombres legacy (spec.md, plan.md)"

**Plan de contingencia**
- Si hay WP histórico activo: leer directamente el directorio para identificar artefactos existentes

---

### R-003: Templates nuevos pueden no seguir convenciones del proyecto

**Descripción**

Los 3 templates nuevos (`lessons-learned`, `changelog`, `risk-register`) se crearon
en esta sesión. Su estructura fue diseñada razonablemente pero no verificada contra
las convenciones formales del proyecto.

**Probabilidad**: baja
**Impacto**: medio
**Severidad**: baja
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-01-22-15-43

**Señales de alerta**
- Frontmatter YAML usa campos distintos a otros templates del proyecto

**Mitigación**
- Comparar estructura de templates nuevos contra templates existentes antes de cerrar WP

**Plan de contingencia**
- Ajustar estructura si hay inconsistencias significativas

---

## Riesgos cerrados

*(ninguno aún)*

---

## Checklist de gestión

- [x] Riesgos identificados en Phase 1 antes de planificar
- [x] Cada riesgo tiene señales de alerta definidas
- [x] Cada riesgo tiene plan de contingencia
- [ ] Registro actualizado al final de cada fase
- [ ] Riesgos materializados referenciados en `context/errors/ERR-NNN.md`
