```yml
type: Registro de Riesgos
created_at: 2026-04-11 10:52:25
project: thyrox-framework
feature: thyrox-commands-namespace
fase: FASE 31
```

# Risk Register — thyrox-commands-namespace

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|-------------|---------|------------|
| R-01 | Rename incompleto: algún archivo activo sigue usando `/workflow-*` como invocación | Alta | Medio | Grep post-migración con `grep -ri "/workflow-analyze\|/workflow-strategy\|..."` en todos los archivos activos. Criterio de cierre: 0 resultados. |
| R-02 | `session-start.sh` muestra namespace incorrecto en sesiones nuevas | Media | Alto | Test manual post-cambio: `bash .claude/scripts/session-start.sh` y verificar output. |
| R-03 | ADR-016 queda obsoleto (documenta `workflow-*` como excepción a "Single skill") | Media | Bajo | Crear amendment o nuevo ADR al cerrar FASE 31. |
| R-04 | Colisión TD-030 no resuelta: dos significados distintos para mismo ID | Alta | Medio | Resolver en Phase 6: reasignar ID a meta-comandos (TD-031+) o renombrar el TD existente. |
| R-05 | Meta-comandos UC-003 sin spec aprobada — scope creep si se implementan sin diseño | ~~Alta~~ **CERRADO** | Alto | **Resuelto en Phase 2:** UC-003 diferido a FASE 32. No se implementan en FASE 31. |
| R-06 | Skills `workflow-*` usados por proyectos bootstrapped con THYROX rompen si se renombran directorios | ~~Baja~~ **CERRADO** | Alto | **Resuelto en Phase 2:** Opción D no renombra directorios de skills. R-06 no aplica. |
| R-07 | TD-036 implementado sin verificar en sesión real — paso 1.5 añadido pero Claude ignora la instrucción | Media | Medio | Verificar en al menos una sesión que Claude pide confirmación antes de `mkdir`. Documentar en execution-log. |
