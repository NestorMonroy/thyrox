```yml
Proyecto: THYROX — PM-THYROX Framework
Work package: 2026-04-04-07-17-37-skill-adr-boundary
Fecha creación: 2026-04-04
Última actualización: 2026-04-04
Fase actual: Phase 7 — TRACK (WP cerrado)
Riesgos abiertos: 0
Riesgos mitigados: 4
Riesgos cerrados: 3
```

# Risk Register — skill-adr-boundary

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado |
|----|-------------|:------------:|:-------:|:---------:|--------|
| R-001 | Cambios en SKILL.md Phase 3 rompen WPs en ejecución que no tienen tabla de trazabilidad | Baja | Medio | Media | Mitigado |
| R-002 | La guía ADR queda duplicada respecto a SKILL.md | Baja | Bajo | Baja | Mitigado |
| R-003 | Reglas de Phase 3 son legibles para Sonnet pero opacas para Haiku | Media | Alto | Alta | Abierto |
| R-004 | Se añaden demasiadas secciones a SKILL.md aumentando tokens sin mejorar claridad | Media | Medio | Media | Abierto |
| R-005 | Las correcciones a Phase 3 son necesarias pero no suficientes — el problema de "adelantarse" aplica a otras phases también | Media | Medio | Media | Abierto |
| R-006 | La tabla de trazabilidad RC→tarea se vuelve burocrática para WPs pequeños sin RC formales | Baja | Bajo | Baja | Abierto |
| R-007 | El criterio de skip de DECOMPOSE queda ambiguo y el modelo lo interpreta a su favor | Alta | Alto | Crítica | Abierto |

---

## Detalle de riesgos

### R-001: Cambios aditivos en Phase 3 rompen WPs existentes

**Descripción**
Si la nueva instrucción dice "tabla de trazabilidad REQUERIDA", WPs en ejecución sin
tabla quedan en estado inválido según el SKILL.

**Probabilidad**: Baja
**Impacto**: Medio
**Severidad**: Media
**Estado**: Mitigado
**Fase de identificación**: Phase 1

**Mitigación**
La tabla es requerida solo cuando el plan deriva de un análisis con RC formales.
WPs sin RC (trabajo mecánico) no requieren la tabla.

---

### R-003: Reglas de Phase 3 opacas para Haiku

**Descripción**
Si el gate de cobertura usa lenguaje narrativo ("verificar que las RC estén cubiertas"),
Haiku puede omitirlo o interpretarlo incorrectamente.

**Probabilidad**: Media
**Impacto**: Alto
**Severidad**: Alta
**Estado**: Abierto

**Señales de alerta**
- El modelo presenta un plan sin tabla de trazabilidad
- El modelo declara Phase 3 completa sin verificar RC

**Mitigación**
Usar instrucciones en formato: "SI el plan deriva de analysis/ con RC → REQUERIDO: tabla RC→tarea"
No usar narrativa. Patrón SI/NO como en Step 8 de Phase 1.

**Plan de contingencia**
Si ocurre: el stop hook detecta archivos sin commitear y fuerza revisión.

---

### R-005: El problema de "adelantarse" aplica a más phases que Phase 3

**Descripción**
Los errores E-001/E-002/E-003 ocurrieron en Phase 3, pero el patrón de "asumir antes
de ejecutar la phase" puede ocurrir en Phase 2 (strategy sin investigar alternativas)
o Phase 5 (DECOMPOSE sin leer la spec).

**Probabilidad**: Media
**Impacto**: Medio
**Severidad**: Media
**Estado**: Abierto

**Mitigación**
Scope actual: solo Phase 3. Documentar como riesgo futuro para revisión de otras phases.

---

### R-007: Criterio de skip de DECOMPOSE ambiguo

**Descripción**
El SKILL actual dice "pequeño: saltar 3-5". Si el criterio de cuándo NO saltar
DECOMPOSE no es explícito y verificable, el modelo seguirá saltándolo por defecto.

**Probabilidad**: Alta
**Impacto**: Alto
**Severidad**: Crítica
**Estado**: Abierto

**Señales de alerta**
- WP clasificado como "pequeño" tiene RC de análisis con prioridades distintas
- Phase 5 saltada cuando el plan tiene más de 3 tareas con orígenes distintos

**Mitigación**
Agregar a SKILL.md una condición explícita: "SI el plan deriva de RC con prioridades
distintas → DECOMPOSE no se puede saltar independientemente del tamaño del WP."

**Plan de contingencia**
Si el modelo salta DECOMPOSE incorrectamente: RC sin cobertura se detecta en revisión
post-fase (como ocurrió en este WP). Costo: una iteración extra.

---

## Riesgos mitigados / cerrados

| ID | Descripción | Cómo se cerró | Fecha |
|----|-------------|---------------|-------|
| R-001 | Cambios rompen WPs existentes | Tabla condicional: solo si hay RC formales | 2026-04-04 |
| R-002 | Duplicación guía ADR / SKILL.md | No crear adr-guide.md; inline en SKILL | 2026-04-04 |
| R-003 | Reglas opacas para Haiku | SI/NO implementado en Phase 3 Step 5 y Nota DECOMPOSE | 2026-04-04 |
| R-005 | Problema "adelantarse" en otras phases | Registrado como deuda futura; scope acotado a Phase 3 | 2026-04-04 |
| R-006 | Tabla burocrática para WPs sin RC | Sección condicional en template — se omite si no aplica | 2026-04-04 |
| R-007 | Criterio DECOMPOSE ambiguo | Nota DECOMPOSE en Phase 3 con condición explícita SI/NO | 2026-04-04 |
