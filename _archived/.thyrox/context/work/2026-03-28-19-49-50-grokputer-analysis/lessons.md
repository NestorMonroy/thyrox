```yml
Fecha: 2026-03-28
Tipo: Phase 7 (TRACK)
```

# Lecciones — Análisis de grokputer

## L-015: El fix-script cycling es el anti-pattern más destructivo y más fácil de prevenir

20 scripts de fix en grokputer (`fix_`, `precise_`, `robust_`, `ultimate_`, `final_`, `direct_`) = 6 reintentos del mismo bug sin documentar por qué cada uno falló. La prevención es una línea: "Si falla, crear ERR-NNN antes de reintentar." Sin esa línea, nuestro SKILL permitiría el mismo ciclo.

## L-016: .gitignore es enforcement invisible — el más robusto del proyecto

A diferencia de instrucciones en SKILL.md (que Claude puede ignorar), hooks (que el usuario puede desinstalar), o CI (que puede fallar), `.gitignore` funciona siempre, sin configuración, sin que nadie lo lea. Es el enforcement más fiable del proyecto. Agregar patrones preventivos es inversión de 5 minutos con retorno permanente.

## L-017: El creador del framework es el primer usuario en saltarse sus propias reglas (ERR-029)

Phase 2 tiene una estructura documentada en `solution-strategy.md` (Key Ideas, Research, Decisions, Tech Stack, Patterns, Quality Goals, pre/post checks). La primera vez que la usé en esta sesión, me salté todo y fui directo a "alternativas → decisión". Si el creador no sigue el proceso, los usuarios tampoco lo harán. Prevención: el SKILL debería referenciar explícitamente la estructura de solution-strategy.md.

## L-018: Analizar errores ajenos es más productivo que teorizar sobre los propios

Los 23 errores de grokputer revelaron 5 gaps concretos en nuestro SKILL que no habríamos encontrado con autoanálisis. Ver cómo un proyecto real sufre sin metodología es evidencia más fuerte que razonar sobre qué podría salir mal.

## Resumen de correcciones

| # | Corrección | Archivo | Líneas |
|---|-----------|---------|--------|
| C1 | .gitignore robusto (binarios, backups, deps, media) | .gitignore | +25 |
| C2 | "Si falla, crear ERR antes de reintentar" | SKILL.md Phase 6 | +1 |
| C3 | "No commitear temporales/binarios" | SKILL.md Phase 6 | +1 |
| C4 | "Verificar cleanup al cerrar" | SKILL.md Phase 7 | +1 |
| C5 | "Grep refs antes de borrar" | conventions.md | +1 |
| ERR | ERR-029: Phase 2 sin estructura completa | errors/ | Documentado |
