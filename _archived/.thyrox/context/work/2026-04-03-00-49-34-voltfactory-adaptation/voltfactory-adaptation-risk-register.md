```yml
Fecha: 2026-04-03-00-49-34
Fecha cierre: 2026-04-04-00-00-00
WP: voltfactory-adaptation
Fase actual: 7 - TRACK
Estado: Cerrado
```

# Risk Register — voltfactory-adaptation

| ID | Riesgo | Prob | Impacto | Severidad | Estado |
|----|--------|------|---------|-----------|--------|
| R-001 | Adaptar demasiado (scope creep) | Alta | Alto | CRÍTICO | Cerrado — No materializado |
| R-002 | `.instructions.md` automáticos sobrecargan contexto | Media | Medio | MEDIO | Cerrado — No materializado |
| R-003 | Slash commands duplican responsabilidad del SKILL | Media | Bajo | BAJO | Cerrado — Mitigado: comandos son atajos de contexto, no duplican lógica |
| R-004 | Registry crece sin control — 50+ templates difíciles de mantener | Media | Alto | ALTO | Cerrado — Mitigado: 3 templates iniciales, criterio de entrada definido |
| R-005 | Tech Detection falla en proyectos polyglot o sin archivos de config | Alta | Medio | MEDIO | Cerrado — Mitigado: modo manual override implementado en workflow_init |
| R-006 | Skills generados de baja calidad si templates son genéricos | Media | Alto | ALTO | Cerrado — Mitigado: 5+ reglas específicas con ejemplos buenos/malos en cada template |

## R-001 — Scope creep: adaptar todo Volt Factory

**Descripción:** Volt Factory tiene 2500+ archivos, 7 agentes, 28 comandos. Sin
criterio de selección, podemos terminar replicando un sistema BC-específico.  
**Mitigación:** Solo adaptar las 4 items de alta prioridad identificados (A-001 a A-004).
Cada adaptación debe cerrar una brecha real documentada en el analysis.  
**Contingencia:** Si se avanza en items de prioridad baja, detener y re-evaluar contra
la pregunta: ¿esto resuelve un problema que tenemos HOY?

## R-002 — `.instructions.md` sobrecargan el contexto

**Descripción:** Si se crean demasiados archivos `.instructions.md`, cada sesión
carga más contexto aunque no sea relevante. Volt Factory los usa para AL-specific
rules que SIEMPRE aplican. En PM-THYROX el contexto cambia más por WP.  
**Mitigación:** Máximo 3-4 archivos `.instructions.md`, solo para reglas verdaderamente
universales (naming de WP, commits, estructura de artefactos).

## R-003 — Slash commands duplican el SKILL

**Descripción:** Si `/workflow_analyze` hace lo mismo que invocar el SKILL y
pedir Phase 1, los slash commands son redundantes y hay que mantener dos sistemas.  
**Mitigación:** Los slash commands deben SER ATAJOS que pre-cargan contexto específico
(WP activo, fase, artefactos existentes), no duplicar la lógica del SKILL.

## R-004 — Registry crece sin control

**Descripción:** Si añadimos templates para cada framework/librería, el registry
se convierte en un proyecto en sí mismo. React, Next.js, Remix, Astro… solo para
frontend ya son 10+.  
**Mitigación:** Limitar el registry inicial a las tecnologías más usadas (top 10).
Agrupar por categoría, no por framework específico cuando sea posible.
Criterio de entrada: la tech debe ser usada en proyectos reales del usuario.

## R-005 — Tech Detection falla en proyectos polyglot

**Descripción:** Proyectos con múltiples lenguajes, monorepos, o sin archivos de
configuración estándar hacen que el detector automático falle o dé falsos positivos.  
**Mitigación:** El detector tiene dos modos: automático (scan de archivos) y manual
(usuario declara el stack). El manual siempre override al automático.
Fallback: si no detecta nada, preguntar al usuario.

## R-006 — Skills generados de baja calidad

**Descripción:** Si los templates del registry son genéricos o superficiales,
los skills generados no agregan valor real. "Usa buenas prácticas de React" no
es útil. "Usa hooks sobre class components, useState para local state, Zustand para
global state, RTL para testing" sí lo es.  
**Mitigación:** Cada template del registry debe tener al menos:
- 5 reglas específicas y medibles (no "usa buenas prácticas")
- Ejemplos buenos/malos para cada regla
- Guía phase-by-phase con entregables concretos
