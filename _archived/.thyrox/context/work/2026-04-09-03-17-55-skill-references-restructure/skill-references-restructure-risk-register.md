```yml
type: Risk Register
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 03:17:55
updated_at: 2026-04-09 03:17:55
```

# Risk Register: skill-references-restructure (FASE 24)

| ID | Riesgo | Prob | Impacto | Estado | Mitigación |
|----|--------|------|---------|--------|------------|
| R-01 | Links rotos en pm-thyrox/SKILL.md tras mover references | Alta | Medio | Abierto | Actualizar `## References por dominio` como parte del plan; validar con grep post-migración |
| R-02 | Links rotos en workflow-*/SKILL.md (1 ref confirmada: workflow-analyze → scalability) | Alta | Medio | Abierto | Inventariar todos los links en workflow-*/SKILL.md antes de mover; actualizar por bloque |
| R-03 | Hooks de sesión dejan de funcionar si scripts se mueven sin actualizar settings.json | Media | Alto | Abierto | Si scripts en scope: actualizar settings.json en el mismo commit; verificar con test de sesión |
| R-04 | lint-agents.py referenciado en agent-spec.md con path absoluto | Baja | Bajo | Abierto | Actualizar path en agent-spec.md si script se mueve |
| R-05 | conventions.md sin owner declarado — destino ambiguo | Baja | Bajo | Abierto | Decidir en Phase 2; probablemente cross-phase → pm-thyrox/references/ |
| R-06 | Ruptura de references dentro de los propios archivos .md (cross-references entre refs) | Media | Medio | Abierto | Verificar con grep `references/` dentro de cada ref file antes de mover |
