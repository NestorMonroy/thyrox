```yml
type: Analisis de Phase 1
work_package: 2026-04-09-17-28-34-auto-operations
fase: FASE 28
created_at: 2026-04-09 18:15:00
revised_at: 2026-04-09 19:00:00
```

# Analisis — Por que las operaciones no son automaticas

## Revision del primer analisis

El primer analisis identifico correctamente la brecha entre Automatico-A (permisos) y
Automatico-B (ejecucion). Pero la solucion propuesta (create-wp.sh desde SKILL.md) es
incorrecta porque sigue siendo imperativa: Claude tiene que decidir llamar al script.
La solucion correcta es reactiva: hooks que se disparan como consecuencia de lo que Claude
hace, sin que Claude tenga que "recordar" hacerlo.

---

## 1. Tres bugs, no uno

El primer analisis encontro un root cause. Con el conocimiento completo de hooks, se
identifican tres bugs distintos:

### Bug 1 — El hook de UserPromptSubmit usa append

El hook actual en `workflow-analyze/SKILL.md`:

```yaml
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 1' >> .claude/context/now.md"
```

`>>` AGREGA una linea al final del archivo. Como `now.md` tiene frontmatter YAML (`phase:` ya
existe en el bloque `---`), el resultado es un archivo con DOS campos `phase:`:

```
---
phase: null
current_work: null
---

# Contexto
phase: Phase 1      ← agregado por el hook, fuera del frontmatter
```

Esto no actualiza el campo YAML. Es un append que crea contenido invalido/duplicado.

### Bug 2 — El hook no actualiza `current_work`

Aunque el hook no tuviera el bug de append, solo escribe `phase:`. El campo `current_work`
permanece `null` — queda delegado a Claude siguiendo instrucciones del SKILL.md, que puede
olvidarlo o hacerlo tarde.

Evidencia directa: en FASE 27, `now.md::current_work` quedo en `null` mientras el WP ya
existia en disco. Se corrigio manualmente en la sesion.

### Bug 3 — Nada actualiza `focus.md` reactivamente

No existe mecanismo (hook ni script) que actualice `focus.md` al inicio de Phase 1.
La unica instruccion existe en `state-management.md` (referencia on-demand), no en un hook.
El resultado es que `focus.md` puede mostrar el WP anterior durante toda Phase 1 del WP nuevo.

---

## 2. Por que create-wp.sh no es la solucion

La Opcion D propuesta en el primer analisis (create-wp.sh llamado desde SKILL.md) comete
el mismo error conceptual que el estado actual: es IMPERATIVA.

```
Estado actual:        Claude sigue instruccion → mkdir + now.md  (falla si Claude olvida)
create-wp.sh:         Claude sigue instruccion → bash script      (falla si Claude olvida)
```

Ambas dependen de que Claude lea y ejecute una instruccion textual del SKILL.md.
El mecanismo que hace la operacion automatica no es un script — es un HOOK.

La diferencia fundamental:

| Mecanismo | Modelo | Garantia |
|-----------|--------|----------|
| Instruccion en SKILL.md | Claude lee, Claude ejecuta | Probabilistica — depende del LLM |
| Script llamado desde SKILL.md | Claude lee, Claude llama al script | Probabilistica — sigue dependiendo del LLM |
| Hook PostToolUse | Accion ocurre → hook se dispara | Determinista — no depende del LLM |

---

## 3. El modelo correcto: Hooks reactivos

La documentacion oficial de Claude Code define el Agentic Loop como:

```
Gather → Execute → Verify → [Gather...]
```

Los hooks de `PostToolUse` son el mecanismo de Verify/Sync que el framework necesita.
Cuando Claude ejecuta una operacion (Execute), el hook reacciona (Verify/Sync) sin que
Claude decida hacerlo.

Para el problema de state sync, el patron es:

```
Claude hace Write en context/work/**   →   PostToolUse hook dispara
                                        →   script extrae WP path del tool_input
                                        →   script actualiza now.md + focus.md
```

Esto es Automatico-B real: ocurre como consecuencia de la accion, no por instruccion.

---

## 4. Catalogo completo de hooks disponibles y su aplicacion

La documentacion oficial lista todos los hooks. Los relevantes para este problema:

### PostToolUse (matcher: "Write")

Dispara despues de cada Write tool call exitoso. Recibe en stdin:
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/home/user/thyrox/.claude/context/work/2026-04-09-17-19-45-agentic-loop/analysis/agentic-loop-analysis.md",
    "content": "..."
  },
  "tool_response": { "filePath": "...", "success": true }
}
```

Con `tool_input.file_path`, el script puede:
1. Detectar si la escritura es en `context/work/` → WP operation
2. Extraer el WP path: `work/2026-04-09-17-19-45-agentic-loop/`
3. Inferir la fase del WP por el patron del archivo:
   - `**/analysis/**`         → Phase 1
   - `**-solution-strategy**` → Phase 2
   - `**-plan.md`             → Phase 3
   - `**-requirements-spec**` o `**-design**` → Phase 4
   - `**-task-plan**`         → Phase 5
   - `**-execution-log**`     → Phase 6
   - `**-lessons-learned**`   → Phase 7
4. Actualizar `now.md` y `focus.md` en un solo script con `sed -i`

### UserPromptSubmit (en SKILL.md, una vez por sesion)

Ya existe. Debe corregirse: reemplazar `echo >> now.md` por un script que actualice
el campo `phase:` IN-PLACE usando `sed -i`:

```bash
sed -i "s|phase: .*|phase: Phase 1|" .claude/context/now.md
```

Esto reemplaza la linea existente en lugar de agregar una nueva.

### PreToolUse (opcional, para validacion)

Podria detectar si Claude esta a punto de crear un WP directory cuando ya hay uno activo
en `now.md` y alertar. No bloquear (seria demasiado restrictivo), solo avisar.

### SessionStart (ya existe)

`session-start.sh` ya lee `now.md`. No necesita cambios si `now.md` se mantiene correcto.

---

## 5. Diseno de la solucion correcta

### Componente 1: Fix del hook en workflow-analyze/SKILL.md (Bug 1 y 2)

Reemplazar:
```yaml
command: "echo 'phase: Phase 1' >> .claude/context/now.md"
```

Por:
```yaml
command: "bash .claude/scripts/set-session-phase.sh 'Phase 1'"
```

`set-session-phase.sh` hace dos cosas:
1. Actualiza `phase:` IN-PLACE con `sed -i` (fix Bug 1)
2. El campo `current_work:` NO se toca aqui — lo maneja el PostToolUse hook

### Componente 2: Hook PostToolUse en settings.json (Bug 2 y 3)

Agregar a settings.json:
```json
"PostToolUse": [
  {
    "matcher": "Write",
    "hooks": [
      {
        "type": "command",
        "command": "bash .claude/scripts/sync-wp-state.sh"
      }
    ]
  }
]
```

`sync-wp-state.sh` recibe el JSON por stdin, verifica si `file_path` es un archivo
de WP, extrae el WP name, determina la fase por el patron del archivo, y actualiza
`now.md::current_work` + `now.md::updated_at` + `focus.md`. Si no es un archivo de WP,
sale con exit 0 sin hacer nada.

El script usa solo operaciones en el `allow` list: es llamado por PostToolUse (no por
`bash .claude/scripts/*` directamente), pero como tambien puede ser invocado por Claude,
deberia estar en `allow`.

Nota: PostToolUse hooks NO bloquean (el Write ya ocurrio). Solo sincronizan estado.
Si el script falla, la sesion continua normalmente — es un side effect, no un gate.

### Por que NO agregar al `ask` list ni crear GATE OPERACION

`sync-wp-state.sh` actualiza `now.md` y `focus.md`. Ambos son archivos de estado de sesion
— categoria "Automatico" segun el permission-model. No son archivos de configuracion del
framework. No requieren gate.

---

## 6. Mapa de responsabilidades post-solucion

| Operacion | Trigger | Mecanismo | Garantia |
|-----------|---------|-----------|----------|
| Crear directorio WP | Claude sigue SKILL.md | `mkdir` (allow) | Probabilistica |
| Crear `analysis/` | Claude sigue SKILL.md | `mkdir` (allow) | Probabilistica |
| Actualizar `now.md::phase` | `/workflow-analyze` invocado | UserPromptSubmit hook → script | Determinista |
| Actualizar `now.md::current_work` | Claude escribe archivo WP | PostToolUse Write hook → script | Determinista |
| Actualizar `focus.md` | Claude escribe `*-analysis.md` | PostToolUse Write hook → script | Determinista |
| Actualizar `now.md::updated_at` | Mismo PostToolUse | PostToolUse Write hook → script | Determinista |

La creacion del directorio WP sigue siendo probabilistica — es la unica operacion que
no puede resolverse con un PostToolUse hook reactivo porque el directorio se crea ANTES
de escribir archivos en el. Para hacerla determinista seria necesario un PostToolUse en
Bash que detecte `mkdir context/work/` — posible pero mas fragil que el Write hook.

Decision: la creacion del directorio es aceptable como instruccion en SKILL.md porque:
- Es una operacion idempotente (si ya existe, `mkdir` sin `-p` falla pero el directorio existe)
- El Write hook posterior corrige `now.md` incluso si Claude creo el directorio sin actualizar now.md
- El error es auto-corregido sin intervencion humana

---

## 7. Implicaciones en el permission model

El hook PostToolUse en Write NO requiere permisos especiales:
- Los hooks se ejecutan automaticamente (son definidos en settings.json)
- El script que invocan (`sync-wp-state.sh`) necesita estar en `allow`:
  `"Bash(bash .claude/scripts/*)"` ya cubre esto si Claude lo invoca manualmente
- Pero los hooks NO invocan Bash con el patron `bash ...`; los hooks lanzan comandos
  directamente. Los hooks propios no estan sujetos a las mismas reglas de permission
  que las llamadas de Claude.

Conclusion: el script `sync-wp-state.sh` en `.claude/scripts/` puede ser llamado por
el hook sin problema. Los hooks tienen su propio mecanismo de ejecucion.

---

## 8. Relacion con el WP de agentic-loop (FASE 27)

Este analisis (FASE 28) responde la pregunta de FASE 27 Section 6 (Verify gap):
- El PostToolUse hook en Write es exactamente el patron Verify del Agentic Loop aplicado
  al state management
- En lugar de verificar si el codigo funciona, verifica y corrige el estado del framework

Ambos WPs (27 y 28) convergen en la misma solucion: los hooks de PostToolUse son el
mecanismo de Verify/Sync que falta en el framework actual.

---

## 9. Conclusiones del analisis revisado

1. Hay tres bugs distintos, no uno: append bug, current_work no se actualiza, focus.md
   no se actualiza.

2. create-wp.sh como solucion primaria es incorrecto: sigue siendo imperativo (LLM-dependiente).

3. La solucion correcta usa PostToolUse hooks reactivos para sync de estado. El hook
   dispara como consecuencia de que Claude escribe archivos de WP, sin que Claude decida
   hacerlo.

4. Se necesitan dos componentes:
   - Fix del UserPromptSubmit hook (sed in-place en lugar de append)
   - Nuevo PostToolUse hook en settings.json + script sync-wp-state.sh

5. La creacion del directorio WP permanece como instruccion en SKILL.md (aceptable porque
   el Write hook posterior auto-corrige el estado).

6. Tamano: WP pequeno. Archivos afectados:
   - `.claude/scripts/set-session-phase.sh` (nuevo)
   - `.claude/scripts/sync-wp-state.sh` (nuevo)
   - `.claude/settings.json` (agregar PostToolUse hook)
   - `.claude/skills/workflow-analyze/SKILL.md` (fix hook command)

---

## 10. Stopping Point Manifest

| SP-ID | Momento | Descripcion | Estado |
|-------|---------|-------------|--------|
| SP-01 | Phase 1 → 2 | Validar analisis y direccion antes de estrategia | [ ] pendiente |
| SP-02 | Phase 5 → 6 | Autorizar inicio de ejecucion | [ ] pendiente |
| SP-03 | Phase 6 → 7 | Confirmar que ejecucion fue correcta | [ ] pendiente |
