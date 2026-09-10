```yml
created_at: 2026-06-03T03:56:16Z
project: THYROX
work_package: 2026-06-03-03-55-02-thyrox-ucs-cosmic
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# DISCOVER — UCs de THYROX para COSMIC (2 capas)

Objetivo: escribir el **set completo** de UCs de THYROX para luego **medirlo con el skill
`cosmic`**. Por **Principio 6**, dos **capas/FSM separadas**, medidas independientemente.

## Capa A — Interfaz (comandos/skills)

- **Usuario funcional:** Ejecutor (persona).
- **Boundary:** persona ↔ comandos `/thyrox:*` / Skill tool.
- **Proceso funcional:** cada comando invocado (1 evento desencadenante = la invocación).

| UC | Proceso funcional | Comando/skill | Trigger |
|----|-------------------|---------------|---------|
| UC-INT-01 | DISCOVER (crear WP, explorar problema) | /discover · workflow-discover | "empezar / analizar problema" |
| UC-INT-02 | MEASURE/BASELINE | /measure · workflow-baseline | "medir baseline" |
| UC-INT-03 | DIAGNOSE/ANALYZE | /analyze · workflow-diagnose | "analizar causa raíz" |
| UC-INT-04 | CONSTRAINTS | /constraints · workflow-constraints | "documentar restricciones" |
| UC-INT-05 | STRATEGY | /strategy · workflow-strategy | "decidir arquitectura" |
| UC-INT-06 | SCOPE/PLAN | /plan · workflow-scope | "definir scope" |
| UC-INT-07 | DESIGN/SPECIFY | /design · /structure · workflow-structure | "especificar requisitos" |
| UC-INT-08 | PLAN EXECUTION/DECOMPOSE | /decompose · workflow-decompose | "descomponer en tareas" |
| UC-INT-09 | PILOT/VALIDATE | /pilot · workflow-pilot | "validar con piloto" |
| UC-INT-10 | IMPLEMENT/EXECUTE | /execute · workflow-implement | "implementar tareas" |
| UC-INT-11 | TRACK/EVALUATE | /track · workflow-track | "trackear / cerrar" |
| UC-INT-12 | STANDARDIZE | /standardize · workflow-standardize | "estandarizar / cerrar WP" |
| UC-INT-13 | AUDIT | /audit · workflow-audit | "auditar el WP" |
| UC-INT-14 | LOOP (ejecución continua) | /loop | "auto-avanzar tareas" |
| UC-INT-15 | INIT tech skills | /init · /workflow_init | "bootstrap del stack" |
| UC-INT-16 | Spec-Driven Development | /spec-driven | "especificar con DbC" |
| UC-INT-17 | Test-Driven Development | /test-driven-development | "specs Given/When/Then" |
| UC-INT-18 | DEEP-REVIEW (cobertura/referencias) | /deep-review | "revisar cobertura" |
| UC-INT-19 | Sugerir permisos | /permisos-sugeridos | "reducir prompts" |
| UC-INT-20 | COSMIC sizing | (skill cosmic) | "medir tamaño funcional" |

## Capa B — Motor de orquestación

- **Usuarios funcionales:** Claude (runtime), eventos del harness, git.
- **Boundary:** eventos del harness/sesión ↔ scripts del motor.
- **Proceso funcional:** cada hook/script disparado por un evento.

| UC | Proceso funcional | Trigger (evento) | Script |
|----|-------------------|------------------|--------|
| UC-ENG-01 | Inyectar contexto del WP al iniciar | SessionStart | session-start.sh |
| UC-ENG-02 | Re-inyectar contexto tras compactación | PostCompact | session-resume.sh |
| UC-ENG-03 | Validar mensaje de commit | PreToolUse(Bash git commit) | validate-commit-message.sh |
| UC-ENG-04 | Gate I-001 / bound antes de escribir | PreToolUse | bound-detector.py / check-i001 |
| UC-ENG-05 | Sincronizar estado del WP al escribir | PostToolUse(Write) | sync-wp-state.sh |
| UC-ENG-06 | Verificar git al detener | Stop | stop-hook-git-check.sh |
| UC-ENG-07 | Validar cierre de sesión | Stop | validate-session-close.sh |
| UC-ENG-08 | Fijar fase de sesión | invocación skill/fase | set-session-phase.sh |
| UC-ENG-09 | Actualizar project-state | transición de fase | update-state.sh |
| UC-ENG-10 | Cerrar work package | orden explícita | close-wp.sh |
| UC-ENG-11 | Enrutar a coordinator | señal de contexto | routing-rules (12 coordinators) |
| UC-ENG-12 | Generar agentes desde registry | cambio en agents/*.yml | bootstrap.py |
| UC-ENG-13 | Generar skills/guidelines desde templates | cambio en templates | _generator.sh |

> Nota: el hook **SubagentStop** (registro de reportes) está en PR #4, aún no mergeado a la
> canónica → UC futuro (UC-ENG-14) cuando se integre.

> **Ubicación de los UCs (producto):** `docs/requisitos/casos-uso/{interface,engine}-ucs.md`
> (documentación durable, NO en el work package). Este WP conserva el inventario/medición.

## Totales y plan

- **Capa A:** 20 UCs · **Capa B:** 13 UCs · **Total: 33 UCs** (set completo).
- Cada UC se escribirá con formato COSMIC-ready: actor/FU, evento desencadenante, flujo
  principal con pasos atómicos (para identificar E/X/R/W), flujos alternativos.
- Tras escribirlos: aplicar el skill `cosmic` por capa → CFP por proceso + total por capa.

## Riesgos

- Granularidad: muchos comandos son 1:1 con un workflow-skill — medir el **proceso**, no
  duplicar comando+skill como 2 procesos (mismo evento desencadenante).
- Abstracción del motor: definir bien data groups (now.md, ROADMAP, WP, registry) como OOIs.
- Volumen (33 UCs): escribir en lotes por capa.

---
**Última actualización:** 2026-06-03T03:56:16Z
