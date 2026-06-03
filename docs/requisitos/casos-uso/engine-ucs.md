```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 3.0.0
updated_at: 2026-06-03 04:55:00
```

# UCs de THYROX — Capa B: Motor de orquestación

> FSM = capa motor. **Usuarios funcionales:** harness (eventos SessionStart/PreToolUse/
> PostToolUse/Stop/PostCompact), Claude (runtime), git, CI. **Boundary:** evento del
> harness/sesión ↔ script del motor. **OOIs:** SessionState (now.md), WorkPackage,
> ProjectState, ROADMAP, phase-history, CommitMessage, git-status, AgentDef, SkillTemplate,
> Guideline, RoutingRules, invariants.
>
> **v3.0.0 — UC formal:** precondición/flujo principal (E/X/R/W)/alterno/excepción/
> postcondición/datos/criterios de aceptación. Línea **COSMIC** = CFP del baseline ÉPICA 44.
> Fuente OBSERVABLE: `.claude/scripts/*.{sh,py}` + hooks en `settings.json` + `.thyrox/registry/`.

---

## UC-ENG-01 — Inyectar contexto del WP al iniciar
- **Actor (FU):** harness (SessionStart) · **Script:** `session-start.sh`
- **Trigger:** inicio de sesión.
- **Precondición:** existe `.thyrox/context/now.md`.
- **Flujo principal:** 1) evento SessionStart (E) → 2) lee `now.md`/WP activo (R) → 3) lee ROADMAP (R) → 4) compone y emite el contexto a la sesión (X).
- **Flujo alterno:** sin WP activo → emite mensaje "sin WP activo" + opciones de arranque.
- **Flujo de excepción:** `now.md` ausente → degradar a contexto mínimo sin abortar la sesión.
- **Postcondición:** la sesión arranca con el contexto del WP activo en pantalla.
- **Datos (OOIs):** SessionState (R), ROADMAP (R).
- **Criterios de aceptación:** *Given* un WP activo, *When* inicia la sesión, *Then* el contexto emitido incluye el stage y el path del WP.
- **COSMIC:** 4 CFP.

## UC-ENG-02 — Re-inyectar contexto tras compactación
- **Actor (FU):** harness (PostCompact) · **Script:** `session-resume.sh`/`session-start.sh`
- **Trigger:** compactación de contexto.
- **Precondición:** sesión en curso con WP activo.
- **Flujo principal:** 1) evento PostCompact (E) → 2) lee `now.md`/WP (R) → 3) emite contexto (X).
- **Flujo alterno:** —
- **Flujo de excepción:** `now.md` sin `current_work` → emite contexto mínimo.
- **Postcondición:** el contexto del WP queda re-inyectado tras la compactación.
- **Datos (OOIs):** SessionState (R).
- **Criterios de aceptación:** *Given* una compactación, *When* ocurre PostCompact, *Then* el contexto del WP activo se re-emite sin intervención del Ejecutor.
- **COSMIC:** 3 CFP.

## UC-ENG-03 — Validar mensaje de commit
- **Actor (FU):** harness (PreToolUse) · **Script:** `validate-commit-message.sh`/`commit-msg-hook.sh`
- **Trigger:** `git commit` ejecutado por Claude.
- **Precondición:** el tool-input es un `git commit` con mensaje.
- **Flujo principal:** 1) recibe el commit message (E) → 2) valida contra patrón Conventional (validación, 0) → 3) permite (X ok) o bloquea con razón (X error).
- **Flujo alterno:** —
- **Flujo de excepción:** mensaje no-Conventional → bloquea con la razón y el formato esperado.
- **Postcondición:** solo se permiten commits `type(scope): description`.
- **Datos (OOIs):** CommitMessage (E) → veredicto (X).
- **Criterios de aceptación:** *Given* un commit message inválido, *When* se intenta el commit, *Then* el hook lo bloquea con un mensaje explicativo.
- **COSMIC:** 2 CFP (mínimo Regla 10c).

## UC-ENG-04 — Gate I-001 / bound antes de escribir
- **Actor (FU):** harness (PreToolUse) · **Scripts:** `check-i001-prewrite.sh`, `bound-detector.py`
- **Trigger:** intento de Write/tool.
- **Precondición:** hay un Write/tool-input por evaluar.
- **Flujo principal:** 1) recibe el tool-input (E) → 2) lee invariantes/estado relevante (R) → 3) permite o bloquea con mensaje (X).
- **Flujo alterno:** —
- **Flujo de excepción:** se intenta planificar sin DISCOVER (I-001) o escribir fuera de bound → bloquea.
- **Postcondición:** no se permiten escrituras que violen los invariantes.
- **Datos (OOIs):** invariants/SessionState (R) → veredicto (X).
- **Criterios de aceptación:** *Given* un Write que viola I-001, *When* se intenta, *Then* el hook lo bloquea citando el invariante.
- **COSMIC:** 3 CFP.

## UC-ENG-05 — Sincronizar estado del WP al escribir
- **Actor (FU):** harness (PostToolUse Write) · **Script:** `sync-wp-state.sh`
- **Trigger:** Write completado.
- **Precondición:** existe `now.md`; el Write tocó un artefacto del WP.
- **Flujo principal:** 1) recibe evento de Write (E) → 2) lee `now.md` (R) → 3) detecta WP/fase (cálculo, 0) → 4) escribe `now.md` actualizado (W) → 5) apende a `phase-history` (W).
- **Flujo alterno:** Write fuera del WP → no actualiza estado.
- **Flujo de excepción:** `now.md` inconsistente → no sobreescribe; marca `stage_sync_required`.
- **Postcondición:** `now.md` y `phase-history` reflejan el último Write del WP.
- **Datos (OOIs):** SessionState (R/W), phase-history (W).
- **Criterios de aceptación:** *Given* un Write en el WP activo, *When* completa, *Then* `phase-history` recibe una entrada nueva.
- **COSMIC:** 4 CFP.

## UC-ENG-06 — Verificar git al detener
- **Actor (FU):** harness (Stop) · **Script:** `stop-hook-git-check.sh`
- **Trigger:** Stop.
- **Precondición:** repo git inicializado.
- **Flujo principal:** 1) evento Stop (E) → 2) lee git status (R) → 3) emite aviso si hay cambios sin commitear / commits unverified (X).
- **Flujo alterno:** árbol limpio → sin aviso.
- **Flujo de excepción:** commits con committer ≠ noreply@anthropic.com → aviso de "Unverified" con el comando de corrección.
- **Postcondición:** el Ejecutor es advertido de cambios/commits pendientes al detener.
- **Datos (OOIs):** git-status (R) → aviso (X).
- **Criterios de aceptación:** *Given* cambios sin commitear, *When* ocurre Stop, *Then* el hook emite un aviso.
- **COSMIC:** 3 CFP.

## UC-ENG-07 — Validar cierre de sesión
- **Actor (FU):** harness (Stop) · **Script:** `validate-session-close.sh`
- **Trigger:** Stop.
- **Precondición:** existe `now.md` con WP activo.
- **Flujo principal:** 1) evento Stop (E) → 2) lee `now.md`/WP (R) → 3) emite advertencias de cierre (X).
- **Flujo alterno:** —
- **Flujo de excepción:** task-plan con T `[x]` sin commit correspondiente → advertir desincronización (PAT-004).
- **Postcondición:** el Ejecutor recibe advertencias de consistencia antes de cerrar la sesión.
- **Datos (OOIs):** SessionState/WorkPackage (R) → advertencias (X).
- **Criterios de aceptación:** *Given* un WP con estado inconsistente, *When* ocurre Stop, *Then* se emite la advertencia correspondiente.
- **COSMIC:** 3 CFP.

## UC-ENG-08 — Fijar fase de sesión
- **Actor (FU):** skill/comando · **Script:** `set-session-phase.sh`
- **Trigger:** activación de una fase (hook UserPromptSubmit de un workflow-* skill).
- **Precondición:** existe `now.md`.
- **Flujo principal:** 1) recibe fase objetivo (E) → 2) lee `now.md` (R) → 3) escribe `stage` en `now.md` (W).
- **Flujo alterno:** —
- **Flujo de excepción:** fase desconocida → no modifica `now.md`.
- **Postcondición:** `now.md::stage` refleja la fase activada.
- **Datos (OOIs):** SessionState (R/W).
- **Criterios de aceptación:** *Given* la activación de `/thyrox:design`, *When* corre el hook, *Then* `now.md::stage` = "Phase 7".
- **COSMIC:** 3 CFP.

## UC-ENG-09 — Actualizar project-state
- **Actor (FU):** motor · **Script:** `update-state.sh`
- **Trigger:** transición de fase/WP.
- **Precondición:** existe `project-state.md`.
- **Flujo principal:** 1) recibe transición (E) → 2) lee `project-state.md` (R) → 3) escribe `project-state.md` (W).
- **Flujo alterno:** invocado desde `close-wp.sh` al cerrar (ver UC-ENG-10).
- **Flujo de excepción:** `project-state.md` ausente → lo crea con valores por defecto.
- **Postcondición:** `project-state.md` refleja agentes/FASEs/versión actuales.
- **Datos (OOIs):** ProjectState (R/W).
- **Criterios de aceptación:** *Given* una transición, *When* corre el script, *Then* `project-state.md` queda actualizado con el conteo real.
- **COSMIC:** 3 CFP.

## UC-ENG-10 — Cerrar work package
- **Actor (FU):** Ejecutor/motor · **Script:** `close-wp.sh`
- **Trigger:** orden explícita de cierre (I-011).
- **Precondición:** existe `now.md` con WP activo; orden explícita del Ejecutor.
- **Flujo principal:** 1) recibe orden (E) → 2) lee `now.md` (R) → 3) resetea campos + limpia "# Contexto" en `now.md` (W) → 4) llama `update-state.sh` → escribe ProjectState (W) → 5) confirma (X).
- **Flujo alterno:** —
- **Flujo de excepción:** sin orden explícita → NO cierra (I-011).
- **Postcondición:** `now.md::current_work`/`stage`/`flow`/`methodology_step` = null; `project-state.md` sincronizado.
- **Datos (OOIs):** SessionState (R/W), ProjectState (W).
- **Criterios de aceptación:** *Given* la orden de cierre, *When* corre `close-wp.sh`, *Then* `now.md::current_work` = null.
- **COSMIC:** 5 CFP.

## UC-ENG-11 — Enrutar a coordinator
- **Actor (FU):** Claude/contexto · **Fuente:** `routing-rules.yml`
- **Trigger:** señal de contexto (metodología detectada en el WP).
- **Precondición:** existe `routing-rules.yml`; WP con señales de metodología.
- **Flujo principal:** 1) recibe señales del WP (E) → 2) lee `routing-rules` (R) → 3) selecciona coordinator (cálculo, 0) → 4) escribe `now.md::flow`/coordinators (W) → 5) emite el coordinator activo (X).
- **Flujo alterno:** sin metodología detectada → no enruta (flow=null).
- **Flujo de excepción:** señales ambiguas (varias metodologías) → emitir las candidatas para que el Ejecutor elija.
- **Postcondición:** `now.md::flow` y `coordinators` reflejan el coordinator activo.
- **Datos (OOIs):** RoutingRules (R), SessionState (W).
- **Criterios de aceptación:** *Given* señales de DMAIC, *When* corre el routing, *Then* `now.md::flow` = dmaic.
- **COSMIC:** 4 CFP.

## UC-ENG-12 — Generar agentes desde registry
- **Actor (FU):** Ejecutor/CI · **Script:** `.thyrox/registry/bootstrap.py`
- **Trigger:** cambio en `registry/agents/*.yml` (o invocación manual con `--stack`).
- **Precondición:** existen definiciones en `registry/agents/*.yml`.
- **Flujo principal:** 1) ejecuta bootstrap (E) → 2) lee cada `agents/*.yml` (R) → 3) escribe cada `.claude/agents/*.md` (W) → 4) emite resumen (X).
- **Flujo alterno:** `--force` → regenera aunque ya existan.
- **Flujo de excepción:** tech sin template → usa solo `system_prompt` y advierte (TD-043).
- **Postcondición:** `.claude/agents/*.md` reflejan las definiciones del registry.
- **Datos (OOIs):** AgentDef·yml (R), AgentDef·md (W). Múltiples archivos = mismo OOI → 1 R + 1 W.
- **Criterios de aceptación:** *Given* un `agents/X.yml`, *When* corre bootstrap, *Then* existe `.claude/agents/X.md` con su frontmatter.
- **COSMIC:** 4 CFP.

## UC-ENG-13 — Generar skills/guidelines desde templates
- **Actor (FU):** Ejecutor/CI · **Script:** `.thyrox/registry/_generator.sh`
- **Trigger:** cambio en templates de metodología del registry.
- **Precondición:** existen los templates en `.thyrox/registry/{layer}/`.
- **Flujo principal:** 1) ejecuta generator (E) → 2) lee templates (R) → 3) escribe skills `workflow-*` (W) → 4) escribe guidelines (W) → 5) emite resumen (X).
- **Flujo alterno:** —
- **Flujo de excepción:** template ausente → omite ese skill y lo reporta.
- **Postcondición:** `.claude/skills/` y `.thyrox/guidelines/` reflejan los templates.
- **Datos (OOIs):** SkillTemplate (R), Skill (W), Guideline (W).
- **Criterios de aceptación:** *Given* un template nuevo, *When* corre el generator, *Then* existe el skill/guideline correspondiente.
- **COSMIC:** 5 CFP.

---

> **Pendiente UC-ENG-14** (SubagentStop → registro de reportes): en PR #4. Al mergear a la
> canónica se añade como UC formal y se re-mide la capa B (+1 proceso).

**Resumen capa B:** 13 procesos funcionales · 46 CFP (baseline ÉPICA 44, conservado).
Fuente OBSERVABLE: `.claude/scripts/` + hooks `settings.json` + `.thyrox/registry/`.

**Última actualización:** 2026-06-03 04:55:00
