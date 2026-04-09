```yml
type: Risk Register
work_package: 2026-04-08-23-55-52-workflow-restructure
created_at: 2026-04-08 23:55:52
updated_at: 2026-04-08 23:55:52
```

# Risk Register: workflow-restructure (FASE 23)

| ID | Riesgo | Prob | Impacto | Estado | Mitigación |
|----|--------|------|---------|--------|------------|
| R-01 | Cambio de `_` a `-` rompe referencias no detectadas en archivos del proyecto | Media | Medio | Abierto | Búsqueda exhaustiva con grep antes de ejecutar; task por cada archivo que actualizar |
| R-02 | SKILL.md reducción elimina secciones sin destino — pérdida de información | Media | Alto | Abierto | Crear inventario explícito sección→destino antes de eliminar; gate en Phase 4 |
| R-03 | `workflow_init.md` en commands/ referencia `/workflow_*` con underscore | Baja | Bajo | Abierto | Revisar en Phase 1; actualizar si es necesario |
| R-04 | Context overflow por volumen de cambios (7 migrados + referencias + reducción) | Alta | Bajo | Abierto | Batch por bloques con checkpoints; sesiones independientes por bloque |
