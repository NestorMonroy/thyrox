```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis (Phase 1: ANALYZE)
Principio: Detectar inconsistencias entre lo documentado y lo practicado
```

# Análisis: Directorios no utilizados correctamente

## El problema

3 directorios están definidos en el framework pero no se usan como se debería:

| Directorio | Para qué existe | Qué tiene | Estado |
|-----------|----------------|-----------|--------|
| `context/epics/` | Trabajo planificado (Phase 3-5) | 1 epic de Phase 1 docs | **Subutilizado** |
| `context/decisions/` | ADRs de este proyecto | 9 ADRs de sesión anterior (no de esta) | **Estancado** |
| `context/work-logs/` | Bitácora de sesiones | 1 template, 0 logs reales | **Vacío** |

Mientras tanto, `context/analysis/` tiene **15 archivos** con todo el trabajo real de esta sesión.

---

## Diagnóstico por directorio

### epics/ — Subutilizado

**Qué debería tener:** Un epic por cada esfuerzo de trabajo planificado.

**Qué tiene:** Solo `2026-03-27-thyrox-documentation/` con los 8 docs de Phase 1 ANALYZE.

**Lo que falta:**
- Los 3 ciclos de correcciones (covariancia, spec-kit adoption, spec-kit deep) se documentaron en `analysis/` como archivos sueltos, no como epics con su estructura (epic.md + tasks.md + specs/).
- Cada ciclo tuvo las 7 fases completas pero no creó su propio directorio en epics/.

**Causa raíz:** Pusimos todo el trabajo de analysis/strategy/structure/tasks en `analysis/` porque ese era el directorio que existía cuando empezamos. No separamos entre "análisis del problema" y "plan de trabajo."

**ERR-019:** Los ciclos de covariancia y spec-kit adoption deberían haber sido epics, no análisis sueltos.

---

### decisions/ — Estancado

**Qué debería tener:** ADRs creados durante ESTA sesión.

**Qué tiene:** 9 ADRs de la sesión inicial (2026-03-25), ninguno nuevo.

**Decisiones que tomamos en esta sesión SIN documentar como ADR:**
1. Renombrar templates/ → assets/ (anatomía oficial Anthropic)
2. ANALYZE primero (no PLAN)
3. Single skill con progressive disclosure (no 15 skills)
4. Git como única persistencia (no backups manuales)
5. Detect/convert/validate pattern para scripts
6. Fuente canónica + referencia (covariancia)
7. Adoptar conceptos de spec-kit, no copiar implementación
8. [NEEDS CLARIFICATION] como mecanismo en checklist (no script)
9. Double constitution check (pre + post design)

**9 decisiones, 0 ADRs.** Las documentamos en solution-strategy de cada ciclo pero no como ADRs formales.

**Causa raíz:** Crear un ADR se siente como overhead cuando ya documentamos la decisión en el analysis. Pero el purpose de un ADR es ser **buscable** — poder preguntar "¿por qué usamos assets/ en vez de templates?" y encontrar la respuesta rápido. Los analysis files son largos y narrativos, no buscables.

**ERR-020:** 9 decisiones arquitectónicas no documentadas como ADRs.

---

### work-logs/ — Vacío

**Qué debería tener:** Un log por sesión documentando qué se hizo, decisiones tomadas, blockers, tiempo.

**Qué tiene:** Solo el template. Cero logs.

**Esta sesión:**
- 44+ commits
- 85+ archivos tocados
- 3 ciclos completos de 7 fases
- 18+ errores documentados
- 2+ horas de trabajo

Y CERO work-logs.

**Causa raíz:** El flujo de trabajo se centró en producir artefactos (análisis, tasks, correcciones) y commitear. En ningún momento el SKILL o el proceso nos recordó "documenta esta sesión en work-logs/." No hay gate ni checkpoint que lo exija.

**ERR-021:** Sesión completa sin work-log.

---

## Patrón del problema

Los 3 directorios comparten el mismo problema: **existen en la documentación pero no hay enforcement que obligue a usarlos.**

| Lo que fuerza uso | analysis/ | epics/ | decisions/ | work-logs/ |
|-------------------|-----------|--------|-----------|------------|
| Un gate lo exige | No, pero lo usamos naturalmente | No | No | No |
| SKILL.md lo menciona | Sí (Phase 1, 7) | Sí (Phase 3) | Sí (Phase 1, 2) | Sí (Phase 6) |
| Lo usamos esta sesión | ✅ 15 archivos | ⚠️ 1 directorio | ❌ 0 nuevos ADRs | ❌ 0 logs |

**analysis/** funciona porque es donde naturalmente ponemos los outputs de Phase 1. Los otros 3 no se usan porque requieren un paso extra que nadie exige.

---

## Errores documentados

| # | Error | Severidad |
|---|-------|-----------|
| ERR-019 | Ciclos de trabajo documentados como análisis sueltos, no como epics | Media |
| ERR-020 | 9 decisiones arquitectónicas sin ADRs formales | Alta |
| ERR-021 | Sesión completa sin work-log | Alta |

---

## Acciones correctivas

### Inmediatas (esta sesión)

1. Crear work-log de esta sesión (resumen de todo lo hecho)
2. Crear ADRs para las decisiones más importantes (al menos las top 3)

### Para el framework

3. Agregar a EXIT_CONDITIONS Phase 6: "Work-log creado para esta sesión"
4. Agregar a EXIT_CONDITIONS Phase 2: "ADRs creados para decisiones tomadas"
5. Agregar a SKILL.md Phase 6: "Document session in work-logs/ before closing"
6. Considerar: ¿Los ciclos de correcciones deberían ser epics o analysis? Definir regla.

---

**Última actualización:** 2026-03-28
