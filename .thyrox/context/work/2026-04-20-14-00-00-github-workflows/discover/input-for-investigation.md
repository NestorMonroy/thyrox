```yml
created_at: 2026-04-20 19:20:00
purpose: input para deep-dive investigation
source: problem-understanding.md
investigation_scope: CI/CD gaps problem understanding
```

# Input para Deep-Dive Investigation

## Contexto

ÉPICA 43: GitHub Workflows CI/CD Implementation. Fase 1 DISCOVER.

**Estado actual:** `.github/workflows/validate.yml` es el único workflow. Valida SKILL.md y commits convencionales.

**Brechas identificadas:** 5 gaps documentadas sin respuestas claras sobre su origen, impacto real, o viabilidad de resolución.

**Objetivo de esta investigación:** Entender el PROBLEMA profundamente antes de proponer soluciones.

---

## Preguntas Investigativas Centrales

### Pregunta 1: Origen & Deliberación

**¿Por qué `validate.yml` se creó con scope mínimo y nunca se extendió?**

Evidencia disponible:
- `.github/workflows/validate.yml` existe desde fecha desconocida
- Solo valida SKILL.md integridad + conventional commits
- Nunca se agregaron: tests, lint, docs validation

Sub-preguntas:
- ¿Fue decisión consciente de "mínimo CI/CD" o negligencia acumulada?
- ¿Hay ADR documentando esta decisión?
- ¿Se intentó agregar workflows y fallaron?
- ¿Hay branches muertas con workflows abandonados?

---

### Pregunta 2: Impacto Medible

**¿Cuán crítico es realmente el impacto de estas brechas?**

Evidencia disponible:
- WP-ERR-001 documentado (violación de estructura no detectada automáticamente)
- No hay reporte de bugs masivos por falta de tests
- No hay incidentes de merges rotos registrados públicamente

Sub-preguntas:
- ¿Cuántos bugs reales han pasado CI por falta de tests?
- ¿Hay PRs mergeadas que rompieron comportamiento crítico?
- ¿La documentación ha sufrido por falta de validación?
- ¿Cuál es el costo real (en tiempo/esfuerzo) de la brecha?

---

### Pregunta 3: Factibilidad Técnica

**¿Es viable agregar workflows sin romper restricciones existentes?**

Evidencia disponible:
- GitHub Actions disponible (proyecto usa `.github/workflows/`)
- Bash scripts existen en `.thyrox/scripts/` y `bin/`
- Herramientas estándar probablemente no instaladas (eslint, pytest, etc.)

Sub-preguntas:
- ¿Qué herramientas ya están en project dependencies?
- ¿Hay límites de GitHub Actions free tier que apliquen?
- ¿Los scripts actuales soportan validación automática?
- ¿Hay restricciones de acceso a recursos (runners, storage)?

---

### Pregunta 4: Patrones del Ecosistema

**¿Este patrón de "mínimo CI/CD" es estándar o anomalía?**

Evidencia disponible:
- 12 coordinators existen (workflow-discover, workflow-analyze, etc.)
- Cada uno validado manualmente o por usuario?
- Otros proyectos THYROX fork — ¿copian el patrón?

Sub-preguntas:
- ¿Hay validación distribuida (cada coordinator valida lo suyo)?
- ¿Es este patrón replicado en otros repos?
- ¿Hay anti-patrón documentado en metodologías externas?

---

### Pregunta 5: Criticidad de Componentes

**¿Qué partes del proyecto son lo suficientemente críticas para validar automáticamente?**

Evidencia disponible:
- `.claude/agents/` — 30+ agents, cambios pueden romper coordinators
- `.thyrox/scripts/` — scripts criteriosos para state management
- `CLAUDE.md` — punto de entrada, errores afectan onboarding
- `.thyrox/context/decisions/` — ADRs que documentan decisiones

Sub-preguntas:
- ¿Qué riesgos específicos tiene cada componente?
- ¿Cuál debería validarse primero (ROI máximo)?
- ¿Cuál tiene impacto crítico en usuarios?

---

## Restricciones Conocidas

1. **Bash scripts must be ≤ 120 líneas** — legibilidad (similar a SKILL.md)
2. **No nuevas dependencias sin aprobación** — mantener proyecto ligero
3. **Compatibilidad con metodologías múltiples** — workflows no pueden asumir un único flow
4. **Schema de now.md no cambia** — compatible con hooks existentes

---

## Artefactos para Investigar

Archivos reales a revisar en investigación:
- `.github/workflows/validate.yml` — estructura actual
- `git log --all -- .github/` — historia de cambios
- `.claude/CLAUDE.md` líneas sobre CI/CD — decisiones documentadas
- `.thyrox/context/decisions/` — ADRs sobre testing/validation
- `.claude/rules/` — invariantes sobre validación
- `package.json`, `pyproject.toml`, `requirements.txt` — dependencias disponibles

---

## Salida Esperada de Deep-Dive

Para cada pregunta:
1. **Qué es VERDAD:** Claims verificables con evidencia
2. **Qué es FALSO:** Hipótesis rechazadas
3. **Qué es INCIERTO:** Requiere información adicional

Con clasificación: OBSERVABLE / INFERRED / SPECULATIVE

---

## Salida Esperada de Deep-Review

Coverage analysis:
1. ¿Qué preguntas fueron respondidas completamente?
2. ¿Qué preguntas quedaron parcialmente sin respuesta?
3. ¿Qué información nueva emerge de los análisis?
4. ¿Qué aún requiere investigación manual?
