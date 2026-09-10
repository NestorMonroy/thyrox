```yml
type: Análisis Phase 1
work_package: 2026-04-07-05-41-41-flow-corrections
created_at: 2026-04-07 05:41:41
status: Completado
phase: Phase 1 — ANALYZE
```

# Análisis: Correcciones al Flujo — Post-mortem FASE 13

## Objetivo

Corregir 8 gaps detectados durante el dogfooding de ejecución paralela (FASE 13). Los gaps son evidencia directa, no especulación: ocurrieron durante la ejecución real de dos WPs en paralelo.

## Fuente de evidencia

Work packages: `2026-04-07-03-08-03-parallel-agent-conventions` y `2026-04-07-03-08-03-agent-format-spec`
Lecciones: L-039..L-049
Observaciones directas: 3 timeouts, 4 archivos escritos manualmente, 1 scope collision reactivo, task-plan desincronizado.

## Los 8 gaps con evidencia

### G-001 — Rol coordinador implícito
**Evidencia:** Claude principal actuó como coordinador sin que el SKILL lo defina: lanzó agentes, manejó failures, escribió archivos cuando Write fue bloqueado, resolvió scope collision, actualizó ROADMAP/CHANGELOG.
**Impacto:** Si el SKILL no define el rol coordinador, un agente que intente orquestar paralelo no sabe qué pasos tomar.

### G-002 — Scope collision descubierto tarde
**Evidencia:** ADR-014 creado en Phase 1 como respuesta reactiva al descubrir que WP-1 y WP-2 tocaban los mismos archivos de agentes.
**Impacto:** Si el collision se detecta tarde, ya hay trabajo hecho que puede divergir.

### G-003 — Límite de tamaño de prompts no documentado
**Evidencia:** 3 timeouts con prompts ~2500 palabras. 0 timeouts con prompts ~700 palabras. Correlación directa.
**Impacto:** Sin documentación del límite, los prompts seguirán siendo largos y los timeouts seguirán ocurriendo.

### G-004 — Write bloqueado sin protocolo de fallback
**Evidencia:** 4 archivos escritos manualmente por el coordinador porque Write fue denegado a los agentes. El SKILL no tiene protocolo para este caso.
**Impacto:** El flujo se interrumpe silenciosamente — el agente reporta que "no pudo crear el archivo" y el coordinador no sabe qué hacer.

### G-005 — Convenciones no adoptadas inmediatamente (bootstrap problem)
**Evidencia:** `now-{agent-id}.md` y `[~]` claim construidos en FASE 13 pero nunca usados durante FASE 13 porque no existían al inicio.
**Impacto:** El primer uso real de una convención siempre ocurre en el WP siguiente. Esto es aceptable, pero debe documentarse como expectativa.

### G-006 — Task-plan desincronizado
**Evidencia:** T-001..T-003 ejecutadas y commiteadas pero task-plan quedó en `[ ]`. Segundo agente las encontró "disponibles" e intentó re-ejecutarlas.
**Impacto:** Trabajo duplicado. El claim `[~]` resuelve esto, pero debe ser obligatorio, no opcional.

### G-007 — Phase 7 no tiene regla de single-agent
**Evidencia:** En toda la ejecución paralela, ROADMAP y CHANGELOG fueron actualizados manualmente por el coordinador al final — nunca por los agentes paralelos.
**Impacto:** Sin regla explícita, un agente podría intentar actualizar ROADMAP durante su sesión y generar conflictos.

### G-008 — Timestamps de WP colisionan en paralelo
**Evidencia:** Ambos WPs: `2026-04-07-03-08-03-*`. Mismo segundo de creación.
**Impacto:** `ls context/work/ | tail -1` devuelve resultado no determinista cuando dos WPs comparten prefijo.

## Criterios de éxito

| ID | Criterio |
|----|---------|
| SC-001 | SKILL.md define explícitamente el rol coordinador en ejecución paralela |
| SC-002 | SKILL.md incluye pre-flight scope check antes de lanzar agentes paralelos |
| SC-003 | SKILL.md Phase 6 marca claim `[~]` como paso obligatorio antes de ejecutar |
| SC-004 | SKILL.md Phase 7 indica que es single-agent por diseño |
| SC-005 | conventions.md documenta límite de 800 palabras para prompts de agentes |
| SC-006 | conventions.md documenta sufijo `-a/-b` para WPs creados en el mismo segundo |
| SC-007 | conventions.md documenta protocolo cuando Write está bloqueado |
