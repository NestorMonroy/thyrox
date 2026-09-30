```yml
project: THYROX — pm-thyrox framework
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 03:08:03
updated_at: 2026-04-07 03:08:03
current_phase: Phase 1 — ANALYZE
open_risks: 6
mitigated_risks: 0
closed_risks: 0
author: Claude (agente Phase 1)
```

# Risk Register: agent-format-spec

## Propósito

Registrar, priorizar y trackear los riesgos identificados para el work package `agent-format-spec`. Este WP define la especificación formal del formato de agentes nativos de Claude Code, incluyendo campos obligatorios, convención de `description`, linter de validación, y distinción SKILL vs Agente.

> Diferencia con `error-report.md`: el error ya ocurrió. El riesgo es lo que **puede** ocurrir.
> Actualizar este documento en cada fase. Un riesgo no gestionado es una deuda oculta.

---

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado | Dueño |
|----|-------------|:------------:|:-------:|:---------:|--------|-------|
| R-001 | El WP paralelo `parallel-agent-conventions` produce convenciones incompatibles con la spec de este WP | alta | alto | crítica | abierto | Claude |
| R-002 | La spec formal define campos que rompen agentes existentes generados por skill-generator | media | alto | alta | abierto | Claude |
| R-003 | El linter se escribe como Bash puro pero falla en entornos sin las herramientas shell esperadas | media | medio | media | abierto | Claude |
| R-004 | La reference `skill-vs-agent.md` queda desactualizada al evolucionar el formato nativo de Claude Code | media | medio | media | abierto | Claude |
| R-005 | La convención de naming entra en conflicto con nombres de agentes ya existentes en `.claude/agents/` | baja | alto | alta | abierto | Claude |
| R-006 | `skill-generator.md` sigue produciendo `description` vacío tras este WP si no se actualiza el registry | alta | medio | alta | abierto | Claude |

**Severidad** = Probabilidad × Impacto:
- `crítica` = probabilidad alta + impacto alto
- `alta` = probabilidad alta + impacto medio, o media + alto
- `media` = combinaciones intermedias
- `baja` = probabilidad baja o impacto bajo

---

## Detalle de riesgos

### R-001: Conflicto de especificaciones con WP paralelo `parallel-agent-conventions`

**Descripción**

Los WPs `agent-format-spec` y `parallel-agent-conventions` se ejecutan en paralelo con el mismo timestamp (`2026-04-07-03-08-03`). Ambos tienen scope relacionado con agentes nativos: este WP define el formato estático (qué campos, cómo escribir `description`), mientras el otro define convenciones de ejecución paralela. Sin coordinación, pueden producir especificaciones que se contradicen. Ejemplo: este WP podría definir que `description` usa patrón `{qué hace}. Usar cuando {condición}`, mientras el otro podría definir que `description` incluye también información de `agent_id` para coordinación paralela.

**Probabilidad**: alta
**Impacto**: alto
**Severidad**: crítica
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- El análisis del WP paralelo define campos de frontmatter que no están en la spec de este WP.
- La reference `skill-vs-agent.md` de este WP contradice secciones de `conventions.md` actualizadas por el otro WP.
- El linter desarrollado aquí falla al validar agentes modificados por convenciones del WP paralelo.

**Mitigación**

- Delimitar el scope estrictamente: este WP define solo el formato estático del agente (frontmatter + cuerpo). Las convenciones de coordinación dinámica (claim de tareas, `now-{id}.md`) son responsabilidad del WP paralelo.
- Revisar el análisis del WP paralelo antes de entrar a Phase 2 de este WP.
- En Phase 2 (SOLUTION_STRATEGY), verificar explícitamente que las decisiones de este WP no contradicen las del WP paralelo.

**Plan de contingencia**

- Si se detecta contradicción en Phase 2: escalar al usuario para definir la separación de responsabilidades entre WPs.
- Crear un ADR conjunto que defina la frontera entre "formato estático del agente" y "convenciones de coordinación dinámica".

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado durante análisis de dogfooding | Claude |

---

### R-002: La spec rompe compatibilidad con agentes existentes generados por registry

**Descripción**

Los agentes `nodejs-expert.md` y `react-expert.md` fueron generados por `skill-generator.md` desde los YMLs del registry e incluyen `model: claude` en el frontmatter. Si la spec define que `model` es un campo **prohibido** en agentes nativos, estos dos archivos quedan inválidos según la spec. El riesgo es que la corrección de estos archivos requiera también actualizar el proceso de generación (`skill-generator.md` + los YMLs del registry), ampliando el scope del WP más allá de la spec y el linter.

**Probabilidad**: media
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- La spec define `model` como campo prohibido → los 2 agentes generados desde registry son inválidos.
- Al ejecutar el linter, más agentes de los esperados fallan.
- El generador `skill-generator.md` sigue produciendo `model` en sus outputs tras este WP.

**Mitigación**

- Incluir explícitamente en el scope de este WP la corrección de `nodejs-expert.md` y `react-expert.md`.
- Actualizar `skill-generator.md` para no incluir `model` en el output generado (tarea obligatoria, no opcional).
- Documentar en la spec la razón por la que `model` se omite (Claude Code maneja el routing automáticamente).

**Plan de contingencia**

- Si la corrección de agentes existentes amplía el scope más allá de lo manejable: separar en un sub-WP `fix-existing-agents` y bloquear este WP hasta que esté completo.
- Si `skill-generator.md` no puede actualizarse sin romper el proceso de bootstrap: crear una versión 2 del generador y mantener la v1 para retrocompatibilidad.

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado al comparar agentes generados vs agentes manuales | Claude |

---

### R-003: El linter falla en entornos sin herramientas shell esperadas

**Descripción**

Si el linter se implementa como script Bash, puede depender de herramientas (`yq`, `python3`, `jq`) que no están disponibles en todos los entornos donde se ejecuta THYROX. El framework tiene scripts en `.claude/skills/pm-thyrox/scripts/` que mezclan Python y Bash. Si el linter asume un entorno específico y ese entorno no está disponible, falla silenciosamente o produce falsos negativos.

**Probabilidad**: media
**Impacto**: medio
**Severidad**: media
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- El linter retorna exit code 0 en agentes con errores conocidos (falso negativo).
- El linter falla con `command not found` en un entorno diferente al de desarrollo.
- CI/CD no puede ejecutar el linter por dependencias faltantes.

**Mitigación**

- Implementar el linter en Python puro con solo stdlib (`re`, `pathlib`, `sys`). Sin dependencias externas.
- Agregar un test de smoke al inicio del script y salir con mensaje claro si falla.
- Incluir instrucciones de ejecución en la spec con prerequisitos explícitos.

**Plan de contingencia**

- Si Python no está disponible: implementar versión alternativa en Bash puro usando solo `grep` y `sed` (universales).
- Documentar los dos métodos de ejecución con sus prerequisitos.

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado al revisar herramientas disponibles en scripts/ | Claude |

---

### R-004: La reference `skill-vs-agent.md` queda desactualizada al evolucionar el formato nativo

**Descripción**

Claude Code es un producto en desarrollo activo. El formato nativo de agentes (`.claude/agents/*.md`) puede cambiar — nuevos campos, campos deprecados, cambios en cómo se usa `description` para routing. Si la reference `skill-vs-agent.md` y la spec formal se escriben como documentos estáticos sin mecanismo de actualización, pueden quedar desactualizados en pocas semanas y generar confusión.

**Probabilidad**: media
**Impacto**: medio
**Severidad**: media
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- La documentación de Claude Code menciona campos no cubiertos en la spec de este WP.
- Nuevas versiones de Claude Code modifican el comportamiento de routing basado en `description`.
- El linter falla en agentes que funcionan correctamente según la versión actual de Claude Code.

**Mitigación**

- Incluir en la spec un campo `updated_at` y un campo `claude_code_version_tested` que indique en qué versión se validó.
- Escribir la spec basada en comportamiento observable, no en documentación interna.
- Diseñar el linter con reglas configurables (no hardcodeadas) para facilitar actualizaciones futuras.

**Plan de contingencia**

- Si el formato cambia significativamente: crear `agent-format-spec-v2.md` y mantener la v1 para referencia histórica.
- El linter debe tener versión semántica para comunicar qué versión de la spec está validando.

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado al considerar el ciclo de vida del documento | Claude |

---

### R-005: Convención de naming entra en conflicto con nombres existentes

**Descripción**

Si la convención de naming definida en este WP establece patrones como `{capa}-{acción}.md` o `{dominio}-{rol}.md`, puede que los 6 agentes existentes no cumplan el patrón propuesto. Renombrar agentes existentes rompe referencias internas — otros agentes que los mencionan por nombre en sus instrucciones, o scripts de bootstrap que los buscan por nombre exacto.

**Probabilidad**: baja
**Impacto**: alto
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- La convención propuesta no puede aplicarse a los 6 agentes existentes sin renombrarlos.
- Scripts como `bootstrap.py` o `skill-generator.md` referencian nombres de agentes hardcodeados.
- El linter reporta violaciones de naming en agentes que funcionan correctamente hoy.

**Mitigación**

- Diseñar la convención de naming de forma que los 6 agentes existentes ya la cumplan o sean grandfathered.
- Separar en la spec "naming para agentes nuevos" vs "naming legacy" (similar al tratamiento de WPs legacy en conventions.md).
- El linter no debe fallar por naming — puede advertir (`WARN`), pero no es un error bloqueante (`ERROR`).

**Plan de contingencia**

- Si la convención requiere renombrar agentes: crear un sub-WP de migración con trazabilidad completa de referencias.
- Antes de renombrar: ejecutar `grep -r "{nombre-agente}" .claude/` para encontrar todas las referencias.

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado al inventariar los 6 patrones de naming existentes | Claude |

---

### R-006: `skill-generator.md` sigue produciendo `description` vacío tras este WP

**Descripción**

Incluso si este WP define la spec y corrige los agentes existentes manualmente, el generador `skill-generator.md` usará los YMLs del registry para generar nuevos agentes. Los YMLs actuales tienen `description: >` vacío para `nodejs-expert` y `react-expert`. Si el generador no se actualiza y los YMLs del registry no se corrigen, cada nueva ejecución de bootstrap en un proyecto nuevo producirá agentes con `description` vacío, recreando exactamente el problema que este WP resuelve.

**Probabilidad**: alta
**Impacto**: medio
**Severidad**: alta
**Estado**: abierto
**Fase de identificación**: Phase 1
**Última actualización**: 2026-04-07 03:08:03

**Señales de alerta**

- Tras ejecutar bootstrap en un proyecto nuevo, los agentes tech-expert tienen `description` vacío.
- El linter falla en proyectos recién inicializados con THYROX.
- Los YMLs del registry siguen teniendo `description: >` sin valor real después de este WP.

**Mitigación**

- Incluir en el scope de este WP la corrección de los YMLs del registry (`nodejs-expert.yml`, `react-expert.yml`, y los demás tech-experts).
- Actualizar `skill-generator.md` para validar que `description` no esté vacío antes de generar — si está vacío, advertir al usuario con el template de description correcto.
- Agregar al linter una verificación de `registry/agents/*.yml` además de `.claude/agents/*.md`.

**Plan de contingencia**

- Si el scope se amplía demasiado: dividir en dos tareas: (1) corregir agentes existentes manualmente en este WP, (2) abrir WP separado para "registry description quality".
- Documentar en la spec que la corrección del registry es prerequisito para que el linter sea efectivo a largo plazo.

**Historial**

| Fecha | Fase | Cambio | Autor |
|-------|------|--------|-------|
| 2026-04-07 03:08:03 | Phase 1 | Identificado al analizar el flujo de generación desde registry | Claude |

---

## Riesgos cerrados

| ID | Descripción | Cómo se cerró | Fecha cierre |
|----|-------------|---------------|-------------|
| — | Ningún riesgo cerrado aún | — | — |

---

## Checklist de gestión

- [x] Riesgos identificados en Phase 1 antes de planificar
- [x] Cada riesgo tiene señales de alerta definidas
- [x] Cada riesgo tiene plan de contingencia (no solo mitigación)
- [ ] Registro actualizado al final de cada fase
- [ ] Riesgos materializados referenciados en `context/errors/ERR-NNN.md`
