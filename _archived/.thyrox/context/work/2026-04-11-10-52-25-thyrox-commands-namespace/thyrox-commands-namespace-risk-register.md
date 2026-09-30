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
| R-01 | Rename incompleto: algún archivo activo sigue usando `/workflow-*` como invocación | ~~Alta~~ **CERRADO** | Medio | **Resuelto en Phase 6:** grep verificó 0 invocaciones de usuario. 29 path-references internas son esperadas y aceptables (T-020). |
| R-02 | `session-start.sh` muestra namespace incorrecto en sesiones nuevas | ~~Media~~ **CERRADO** | Alto | **Resuelto en Phase 6:** T-011 actualizó `_phase_to_command()` y todas las ramas. Verificado en T-019. |
| R-03 | ADR-016 queda obsoleto (documenta `workflow-*` como excepción a "Single skill") | ~~Media~~ **CERRADO** | Bajo | **Resuelto en Phase 6:** T-015 añadió Addendum FASE 31 en ADR-016. ADR-019 accepted. |
| R-04 | Colisión TD-030 no resuelta: dos significados distintos para mismo ID | ~~Alta~~ **CERRADO** | Medio | **Resuelto en Phase 6:** T-017 añadió addendum en TD-030 clarificando que /thyrox:* reduce relevancia del rename. |
| R-05 | Meta-comandos UC-003 sin spec aprobada — scope creep si se implementan sin diseño | ~~Alta~~ **CERRADO** | Alto | **Resuelto en Phase 2:** UC-003 diferido a FASE 32. No se implementan en FASE 31. |
| R-06 | Skills `workflow-*` usados por proyectos bootstrapped con THYROX rompen si se renombran directorios | ~~Baja~~ **CERRADO** | Alto | **Resuelto en Phase 2:** Opción D no renombra directorios de skills. R-06 no aplica. |
| R-07 | TD-036 implementado sin verificar en sesión real — paso 1.5 añadido pero Claude ignora la instrucción | ~~Media~~ **ABIERTO** | Medio | **No materializado en FASE 31.** Verificación en sesión real pendiente para FASE futura. El riesgo se mantiene hasta verificar en práctica. |
