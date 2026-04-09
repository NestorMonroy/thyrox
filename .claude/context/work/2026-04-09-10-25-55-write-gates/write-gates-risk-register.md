```yml
type: Risk Register
work_package: 2026-04-09-10-25-55-write-gates
fase: FASE 26
created_at: 2026-04-09 10:25:55
```

# Risk Register — FASE 26: write-gates

| ID | Riesgo | P | I | Score | Estado | Mitigación |
|----|--------|---|---|-------|--------|-----------|
| R-01 | `permissions.allow: Bash(bash .claude/scripts/*)` permite scripts maliciosos si alguien agrega scripts al directorio | Muy baja | Alto | 3 | Abierto | Los scripts son parte del repo (git), requieren commit para existir. El riesgo es equivalente al de cualquier código en el repo. Wildcard es seguro dada la documentación: `&&` no se concatena. |
| R-02 | `git push` sin gate envía commits incorrectos al remoto | Baja | Alto | 6 | **Mitigado** | `git push` se deja en `ask` (no en allow ni deny) → gate intencional, 1 prompt por sesión |
| R-03 | `acceptEdits` mode auto-acepta ediciones fuera del WP (ej: archivos de framework) | Media | Alto | 9 | Abierto | `acceptEdits` aplica a todo el directorio de trabajo — incluyendo SKILL.md, CLAUDE.md. Contramedida: `deny` rules para rutas específicas protegidas o usar GATE OPERACIÓN en el SKILL |
| R-04 | La configuración en settings.json y la documentación en SKILL.md divergen en el tiempo | Media | Medio | 6 | Abierto | Agregar en SKILL.md referencia explícita a settings.json con las reglas vigentes; actualizar ambos juntos |
| R-05 | `defaultMode: acceptEdits` puede ser overrideado por user settings — comportamiento diferente por desarrollador | Baja | Bajo | 2 | Abierto | Documentar en CLAUDE.md y README el modo recomendado; el project settings.json tiene precedencia sobre user settings |
| R-06 | Nuevo: `.claude/skills/` es EXEMPT en bypassPermissions — SKILL.md puede editarse sin confirmación | Baja | Alto | 6 | Abierto | Implica que en `bypassPermissions` mode, Claude puede modificar la metodología del framework sin prompt. Documentar esta limitación y NO usar bypassPermissions en producción. |
