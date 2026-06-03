```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 1.0.0
updated_at: 2026-06-03 04:05:00
```

# UCs de THYROX — Capa B: Motor de orquestación

> FSM = capa motor. **Usuarios funcionales:** Claude (runtime), eventos del harness, git.
> **Boundary:** evento del harness/sesión ↔ script del motor. **OOIs:** SessionState
> (now.md), WorkPackage, ProjectState, ROADMAP, phase-history, CommitMessage, AgentDef,
> SkillTemplate, RoutingRules. Cada UC = un proceso funcional disparado por su evento.

## UC-ENG-01 — Inyectar contexto del WP al iniciar
- **FU:** harness (SessionStart) · **Trigger:** inicio de sesión
- **Flujo:** 1) evento SessionStart (E) → 2) lee `now.md`/WP activo (R) → 3) lee ROADMAP
  (R) → 4) compone y emite el contexto a la sesión (X).

## UC-ENG-02 — Re-inyectar contexto tras compactación
- **FU:** harness (PostCompact) · **Trigger:** compactación de contexto
- **Flujo:** 1) evento PostCompact (E) → 2) lee `now.md`/WP (R) → 3) emite contexto (X).

## UC-ENG-03 — Validar mensaje de commit
- **FU:** harness (PreToolUse) · **Trigger:** `git commit` por Claude
- **Flujo:** 1) recibe el comando/commit message (E) → 2) valida contra patrón Conventional
  → 3) permite (X ok) o bloquea con razón (X error).

## UC-ENG-04 — Gate I-001 / bound antes de escribir
- **FU:** harness (PreToolUse) · **Trigger:** intento de Write/tool
- **Flujo:** 1) recibe el tool-input (E) → 2) lee invariantes/estado relevante (R) →
  3) permite o bloquea con mensaje (X).

## UC-ENG-05 — Sincronizar estado del WP al escribir
- **FU:** harness (PostToolUse Write) · **Trigger:** Write completado
- **Flujo:** 1) recibe evento de Write (E) → 2) lee `now.md` (R) → 3) detecta WP/fase →
  4) escribe `now.md` actualizado (W) → 5) apende a `phase-history` (W).

## UC-ENG-06 — Verificar git al detener
- **FU:** harness (Stop) · **Trigger:** Stop
- **Flujo:** 1) evento Stop (E) → 2) lee git status (R) → 3) emite aviso si hay cambios sin
  commitear (X).

## UC-ENG-07 — Validar cierre de sesión
- **FU:** harness (Stop) · **Trigger:** Stop
- **Flujo:** 1) evento Stop (E) → 2) lee `now.md`/WP (R) → 3) emite advertencias de cierre (X).

## UC-ENG-08 — Fijar fase de sesión
- **FU:** skill/comando · **Trigger:** activación de una fase
- **Flujo:** 1) recibe fase objetivo (E) → 2) lee `now.md` (R) → 3) escribe `stage` en
  `now.md` (W).

## UC-ENG-09 — Actualizar project-state
- **FU:** motor · **Trigger:** transición de fase/WP
- **Flujo:** 1) recibe transición (E) → 2) lee `project-state.md` (R) → 3) escribe
  `project-state.md` (W).

## UC-ENG-10 — Cerrar work package
- **FU:** Ejecutor/motor · **Trigger:** orden de cierre
- **Flujo:** 1) recibe orden (E) → 2) lee `now.md` (R) → 3) resetea campos + limpia contexto
  en `now.md` (W) → 4) llama update-state (W project-state) → 5) confirma (X).

## UC-ENG-11 — Enrutar a coordinator
- **FU:** Claude/contexto · **Trigger:** señal de contexto (metodología)
- **Flujo:** 1) recibe señales del WP (E) → 2) lee `routing-rules` (R) → 3) selecciona
  coordinator → 4) escribe `now.md::flow`/coordinators (W) → 5) emite el coordinator activo (X).

## UC-ENG-12 — Generar agentes desde registry
- **FU:** Ejecutor/CI · **Trigger:** cambio en `registry/agents/*.yml`
- **Flujo:** 1) ejecuta bootstrap (E) → 2) lee cada `agents/*.yml` (R) → 3) escribe cada
  `.claude/agents/*.md` (W) → 4) emite resumen (X).

## UC-ENG-13 — Generar skills/guidelines desde templates
- **FU:** Ejecutor/CI · **Trigger:** cambio en templates de metodología
- **Flujo:** 1) ejecuta generator (E) → 2) lee templates (R) → 3) escribe skills `workflow-*`
  (W) → 4) escribe guidelines (W) → 5) emite resumen (X).

> **Pendiente UC-ENG-14** (SubagentStop → registro de reportes): está en PR #4, se añade al
> mergear a la canónica.

---

**Nota de medición:** los hooks de solo-lectura (UC-ENG-01/02/06/07) tienden a 2-3 CFP
(E + R(s) + X). Los que escriben estado (UC-ENG-05/08/09/10) añaden W. UC-ENG-12/13
(generación) escalan con R/W por archivo (mismo OOI = 1 vez por proceso). Medir con `cosmic`.

**Última actualización:** 2026-06-03T04:00:00Z
