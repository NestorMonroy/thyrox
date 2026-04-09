```yml
type: Risk Register
work_package: 2026-04-09-10-25-55-write-gates
fase: FASE 26
created_at: 2026-04-09 10:25:55
```

# Risk Register — FASE 26: write-gates

| ID | Riesgo | P | I | Score | Estado | Mitigación |
|----|--------|---|---|-------|--------|-----------|
| R-01 | `allowed-tools: Bash` sin restricciones permite operaciones fuera del scope del skill | Baja | Alto | 6 | Abierto | Documentar explícitamente qué comandos Bash están en scope; mantener GATE OPERACIÓN del workflow-execute para destructivos |
| R-02 | `git push` automático en Phase 7 envía estado incorrecto al remoto | Baja | Alto | 6 | Abierto | Mantener gate para push O requerir validate-session-close exitoso como precondición explícita |
| R-03 | Cambio en `allowed-tools` rompe comportamiento de skills existentes | Baja | Medio | 3 | Abierto | Aplicar a workflow-track primero; validar en sesión antes de extender a workflow-execute |
| R-04 | La solución de Capa 1 (allowed-tools) y Capa 2 (documentación) divergen en el tiempo | Media | Medio | 6 | Abierto | Vincular la tabla de categorías en SKILL.md directamente con el frontmatter; los dos deben actualizarse juntos |
| R-05 | El usuario no sabe qué se va a ejecutar automáticamente post-gate | Media | Medio | 6 | Abierto | Agregar en el mensaje del gate de fase un listado explícito de las operaciones que seguirán |
