```yml
id: WP-ERR-001
created_at: 2026-04-20 18:27:10
phase: Phase 1 — DISCOVER
severity: media
recurrence: primera
```

# WP-ERR-001: Work Package Created in Wrong Directory

## Qué pasó

Se creó el directorio de work package en `.claude/context/work/2026-04-20-14-00-00-github-workflows/` cuando la ubicación correcta era `.thyrox/context/work/2026-04-20-14-00-00-github-workflows/`. 

El análisis y estructura del WP se generaron en la ruta incorrecta, violando la estructura de carpetas definida en CLAUDE.md. La corrección requirió un commit adicional (e73c55f) para mover archivos a la ubicación correcta.

## Por qué

La causa fue no leer completamente el CLAUDE.md en el inicio de la sesión. El documento especifica en línea 25-26 y 56-66 que:

- `.thyrox/` es la ubicación correcta para "estado de trabajo y artefactos"
- `.claude/` está protegido por safety invariant de Claude Code y genera prompts en cada escritura
- Work packages se escriben frecuentemente, por eso migraron a `.thyrox/` en FASE 35

No revisar explícitamente la estructura de directorios permitió proceder con una suposición incorrecta. El patrón en CLAUDE.md es claro pero requería lectura activa de la sección "Estructura".

## Prevención

Tres acciones concretas:

1. Agregar validación en scripts: crear `.thyrox/scripts/validate-wp-location.sh` que verifique que todo WP nuevo esté en `.thyrox/context/work/` y no en `.claude/context/work/`.

2. En SKILL.md Phase 1 DISCOVER, agregar paso explícito: "Validar que WP se crea en `.thyrox/context/work/` antes de generar artefactos".

3. Agregar nota visual en CLAUDE.md línea 56 con énfasis en que work packages NO van en `.claude/`. Usar formato: "Work packages — SIEMPRE en `.thyrox/`, NUNCA en `.claude/`"

## Insight

Cuando una arquitectura separa espacios protegidos de espacios de escritura frecuente, la frontera debe documentarse en MÚLTIPLES lugares: (1) En la descripción del espacio protegido, (2) En la instrucción de creación del artefacto, (3) En un script de validación ejecutable. Un documento que solo menciona la regla en UN lugar es suficiente para diseño, pero insuficiente para ejecución bajo presión de tiempo.
