```yml
Fecha: 2026-04-03-00-49-34
WP: voltfactory-adaptation
Fase actual: 1 - ANALYZE
Estado: Activo
```

# Risk Register — voltfactory-adaptation

| ID | Riesgo | Prob | Impacto | Severidad | Estado |
|----|--------|------|---------|-----------|--------|
| R-001 | Adaptar demasiado (scope creep) | Alta | Alto | CRÍTICO | Abierto |
| R-002 | `.instructions.md` automáticos sobrecargan contexto | Media | Medio | MEDIO | Abierto |
| R-003 | Slash commands duplican responsabilidad del SKILL | Media | Bajo | BAJO | Abierto |

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

**Descripción:** Si `/workflow_01_analyze` hace lo mismo que invocar el SKILL y
pedir Phase 1, los slash commands son redundantes y hay que mantener dos sistemas.  
**Mitigación:** Los slash commands deben SER ATAJOS que pre-cargan contexto específico
(WP activo, fase, artefactos existentes), no duplicar la lógica del SKILL.
