```yml
type: Plan
work_package: 2026-04-09-17-28-34-auto-operations
fase: FASE 28
created_at: 2026-04-09 20:30:00
```

# Plan — auto-operations

## Deep review acumulado (Phases 1 y 2)

Antes del plan formal, revision de todo lo identificado hasta aqui buscando gaps.

### Confirmado de Phase 1

- Bug 1: echo append en lugar de sed in-place (7 SKILL.md)
- Bug 2: current_work sin hook reactivo
- Bug 3: focus.md sin mecanismo reactivo (reducido a "mejora de instruccion")
- Root cause: imperativo vs reactivo
- Checkpointing no captura cambios bash → aceptable para session state

### Confirmado de Phase 2

- Bug 4: cierre WP en Phase 7 tambien es LLM-dependiente
- Scope es 7x mayor (11 archivos vs 3)
- D-03: no inferir phase desde archivo (correcto)
- D-04: close-wp.sh como Opcion B (intencional, no hook auto)
- D-05: focus.md fuera del scope del hook (correcto)

### Evidencia en vivo — Bug 2 confirmado (agregado en deep review)

Al reanudar la sesion mientras este WP estaba activo, el session-start hook mostro:
"Sin work package activo" — aunque `context/work/2026-04-09-17-28-34-auto-operations/`
y `context/work/2026-04-09-17-19-45-agentic-loop/` existen en disco.

Causa: `now.md::current_work` no se actualiza automaticamente (Bug 2). El hook de
session-start lee `current_work: null` y reporta "sin WP". Confirma la urgencia del fix.

### Gaps nuevos encontrados en Phase 3 (deep review)

**Gap G-01: Conflicto close-wp.sh vs PostToolUse hook**

El flujo de Phase 7 seria:
1. Claude llama `bash .claude/scripts/close-wp.sh` → `current_work: null`
2. Claude escribe `{nombre}-lessons-learned.md` (WP file) → PostToolUse hook dispara
3. Hook detecta `current_work` cambio (null → work/WP-actual/) → lo setea de vuelta

Resultado: `close-wp.sh` se anula inmediatamente por el hook reactivo.

Resolucion: `sync-wp-state.sh` debe leer un flag o verificar si `current_work: null`
fue seteado intencionalmente. Alternativa mas simple: el hook NO actua si `current_work`
ya contiene el WP correcto O si el archivo escrito es de tipo "cierre" (lessons-learned,
final-report). En la practica, cuando Phase 7 ya empezo, `current_work` YA apunta al
WP correcto (fue seteado en Phase 1). El hook verificaria que no cambio → no actua. El
problema solo surge si `close-wp.sh` se llama MIENTRAS se siguen escribiendo archivos WP.

Resolucion definitiva: `close-wp.sh` se llama AL FINAL de Phase 7, despues del ultimo
Write al WP. El hook solo actua cuando detecta un CAMBIO de WP (current diferente al
detectado). Si `close-wp.sh` ya seto null y no hay mas Writes al WP, el hook no vuelve
a dispararse sobre ese WP. El conflicto es teorico, no real en el flujo normal.

**Gap G-02: jq como dependencia no declarada**

`sync-wp-state.sh` usa `jq` para parsear el JSON de stdin. `jq` esta disponible en este
entorno (`/usr/bin/jq`) pero no es una dependencia declarada del framework. Si el entorno
no tiene jq, el script falla silenciosamente (exit non-zero, pero PostToolUse no puede
bloquear).

Resolucion: agregar verificacion al inicio del script y alternativa sin jq:

```bash
FILE_PATH=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || \
            python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))")
```

O simplemente documentar jq como prerequisito en scripts/README.

**Gap G-03: Campo `if` en PostToolUse — comportamiento con paths profundos**

El campo `if: "Write(/.claude/context/work/*)"` no fue verificado empiricamente.
La documentacion muestra `*` al FINAL (`Bash(git add *)`), pero en paths el comportamiento
de `*` con separadores puede variar.

Resolucion: el script tiene filtro interno como fallback. Si el `if` no filtra
correctamente, el script hace la verificacion. Sin impacto funcional, solo en performance
(el proceso se lanza pero sale con exit 0 rapidamente).

---

## Scope statement

Corregir el mecanismo de sincronizacion de estado de sesion (`now.md`) para que sea
deterministico (hook reactivo + sed in-place) en lugar de imperativo (instruccion LLM +
echo append). Afecta los 7 workflow-* skills y agrega un PostToolUse hook global en
settings.json.

## In scope

- 3 scripts nuevos: `set-session-phase.sh`, `sync-wp-state.sh`, `close-wp.sh`
- Fix del comando en los 7 UserPromptSubmit hooks de workflow-*/SKILL.md
- Nuevo PostToolUse Write hook en `.claude/settings.json`
- Instruccion de `close-wp.sh` en workflow-track/SKILL.md para cierre de Phase 7

## Out of scope

- Automatizacion de `focus.md` (contenido semantico, fuera del alcance del hook)
- Creacion automatica del directorio WP (mkdir sigue siendo instruccion, el hook corrige despues)
- Cambios a session-start.sh u otros scripts de infraestructura
- Cambios a agents ni a otras referencias

## Criterios de exito

1. `now.md::phase` es correcto (no duplicado) al invocar cualquier workflow-*
2. `now.md::current_work` se actualiza automaticamente al escribir el primer archivo en un WP nuevo
3. `now.md::current_work` no se pierde al reanudar una sesion
4. El cierre de Phase 7 setea `current_work: null` y `phase: null`
5. Ningun cambio requiere prompt al usuario (settings.json ya tiene allow para `bash .claude/scripts/*`)

## ROADMAP entries

```
[-] FASE 28: auto-operations — corregir sincronizacion de estado de sesion
    [x] Phase 1 ANALYZE — analisis completado
    [x] Phase 2 SOLUTION STRATEGY — estrategia definida
    [x] Phase 3 PLAN — scope aprobado
    [ ] Phase 4 STRUCTURE — requirements spec (3 scripts + settings.json + 7 SKILL.md)
    [ ] Phase 5 DECOMPOSE — task-plan atomico con trazabilidad
    [ ] Phase 6 EXECUTE:
        [ ] Scripts: set-session-phase.sh, sync-wp-state.sh, close-wp.sh
        [ ] Hook PostToolUse en settings.json
        [ ] Fix Bug 1 en 7 workflow-*/SKILL.md
    [ ] Phase 7 TRACK — validacion en sesion de prueba + lessons-learned
```
