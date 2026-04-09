```yml
type: Análisis de Phase 1
work_package: 2026-04-09-17-28-34-auto-operations
fase: FASE 28
created_at: 2026-04-09 18:15:00
```

# Análisis — ¿Por qué las operaciones no son automáticas?

## 1. La pregunta exacta

Con `defaultMode: acceptEdits` y `Bash(mkdir *)` en `allow`, operaciones como:
- Crear directorio `context/work/{timestamp}-nombre/`
- Escribir `analysis/{nombre}-analysis.md`
- Actualizar `now.md`
- Actualizar `focus.md`
- Agregar entrada a `technical-debt.md`

**No requieren prompt al usuario** — son aprobadas automáticamente por la configuración.

Entonces, ¿por qué el usuario observa que estas operaciones "no son automáticas"?

---

## 2. Los dos significados de "automático"

| Nivel | Significado | Quién lo controla |
|-------|-------------|------------------|
| **Automático-A** (permiso) | Sin prompt al usuario — la herramienta se aprueba sola | `settings.json` (acceptEdits + allow rules) |
| **Automático-B** (ejecución) | Sin que Claude decida hacerlo — ocurre por trigger externo | Hooks, scripts, SKILL.md instructions |

**Problema identificado:** El framework solo tiene Automático-A después de FASE 26. Automático-B depende de que Claude siga las instrucciones del SKILL.md en cada sesión.

---

## 3. Por qué falla Automático-B hoy

### 3.1 Creación del WP directory

**workflow-analyze/SKILL.md, paso 2:** "Crear work package — obtener timestamp real del sistema..."

Esto es una **instrucción a Claude**, no un script. Claude la ejecuta porque la lee, pero:
- Si la sesión empieza sin invocar `/workflow-analyze`, el mkdir no ocurre
- Si Claude salteó Phase 1 (resumió en Phase 6 desde now.md), el WP ya existe pero no lo verificó
- No hay trigger que garantice la creación — depende del LLM leyendo el SKILL

### 3.2 Actualización de `now.md`

`workflow-analyze/SKILL.md` tiene un hook:
```yaml
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 1' >> .claude/context/now.md"
```

Este hook actualiza `phase` pero **NO actualiza `current_work`**. El `current_work` lo tiene que escribir Claude manualmente siguiendo la instrucción del SKILL.md paso 2. Si Claude olvida, `now.md` queda con `current_work: null`.

**Observado en FASE 27:** now.md tenía `current_work: null` después de que el WP fue creado. Fue actualizado manualmente más tarde.

### 3.3 Actualización de `focus.md`

No hay ninguna instrucción en `workflow-analyze/SKILL.md` para actualizar `focus.md` al inicio de Phase 1. Solo `state-management.md` (referencia) dice que focus.md debe actualizarse al crear un WP — pero esa referencia se lee on-demand, no siempre.

### 3.4 Append a `technical-debt.md`

No hay instrucción sistemática. Claude lo hace cuando observa una deuda técnica, lo cual es correcto en diseño, pero el "cuándo" depende del juicio del LLM.

---

## 4. La brecha arquitectónica

```
Configuración (settings.json):
  ✅ acceptEdits → Write/Edit = sin prompt
  ✅ Bash(mkdir *) → sin prompt

SKILL.md (workflow-analyze):
  ✅ Hook actualiza phase en now.md
  ⚠️ Instrucción (no script) crea WP directory
  ⚠️ Instrucción (no script) actualiza current_work en now.md
  ✗  Nada actualiza focus.md al inicio de Phase 1

Comportamiento observado:
  - Permiso: ✅ sin prompts al usuario
  - Ejecución: depende de Claude seguir instrucciones → inconsistente
```

**La brecha:** `acceptEdits` resolvió el plano de permisos. El plano de ejecución determinista (Automático-B) no tiene su equivalente.

---

## 5. ¿Por qué importa?

Si la ejecución depende de que Claude "recuerde" hacer X, entonces:
- Sesiones frías (cold boot) pueden arrancar sin WP activo si Claude no sigue el flujo completo
- El `now.md` puede quedar desactualizado (como ocurrió en FASE 27)
- El `focus.md` puede reflejar el WP anterior si no se actualiza en Phase 1
- Inconsistencia entre sesiones: a veces se actualiza, a veces no

---

## 6. Opciones para cerrar la brecha

### Opción A: Script `create-wp.sh` llamado desde hook

```bash
# .claude/scripts/create-wp.sh {nombre-wp}
# → crea directorio + analysis/ + actualiza now.md
```

El hook de `UserPromptSubmit` en workflow-analyze lo invoca en lugar del echo actual.

**Ventaja:** Determinista — siempre ocurre al invocar `/workflow-analyze`.
**Desventaja:** Requiere modificar el hook del SKILL.md (GATE OPERACIÓN).

### Opción B: Instrucciones más explícitas + checklist en SKILL.md

Convertir el paso 2 de workflow-analyze en un checklist verificable:
```
2. Crear work package:
   [ ] mkdir context/work/{timestamp}-{nombre}/analysis/
   [ ] Escribir now.md: current_work + phase: Phase 1
   [ ] Escribir focus.md: ## WP activo
   [ ] Confirmar: ls context/work/ muestra el nuevo directorio
```

**Ventaja:** No requiere cambiar hooks. Mejora la fiabilidad del LLM.
**Desventaja:** Sigue dependiendo del LLM — más fiable pero no determinista.

### Opción C: Hook `PreToolUse` que detecta Write en context/work/

Claude Code tiene hook `PreToolUse` — podría detectar cuando Claude escribe en un WP y auto-crear la estructura si no existe.

**Ventaja:** Completamente automático, no depende de instrucción.
**Desventaja:** `PreToolUse` con lógica compleja es frágil; puede interferir con otras operaciones.

### Opción D: Separar "creación de WP" de "análisis"

Hacer que workflow-analyze llame primero `bash .claude/scripts/create-wp.sh {nombre}` (que ya está en allow), y luego proceda al análisis.

```yaml
# workflow-analyze/SKILL.md paso 2:
# Ejecutar: bash .claude/scripts/create-wp.sh {nombre-wp}
# El script crea directorios y actualiza now.md automáticamente.
```

**Ventaja:** Separa responsabilidades. El script es determinista.
**Desventaja:** Requiere crear create-wp.sh + actualizar SKILL.md (GATE OPERACIÓN para SKILL.md).

---

## 7. Análisis de root cause

**Root cause primario:** El hook `UserPromptSubmit` de `workflow-analyze` solo hace `echo 'phase: Phase 1' >> now.md`. No actualiza `current_work`. El SKILL.md delega la actualización completa de `now.md` a Claude como instrucción textual.

**Root cause secundario:** No hay separación entre:
- `acceptEdits` (permisos — ya resuelto)
- Ejecución determinista (instrucciones SKILL.md — parcialmente instrucción, parcialmente hook)

---

## 8. Conclusiones

1. **Automático-A (permisos)** está resuelto desde FASE 26 — ninguna de estas operaciones requiere prompt al usuario.

2. **Automático-B (ejecución determinista)** tiene una brecha: `now.md::current_work`, `focus.md` y la estructura del WP dependen de que Claude siga instrucciones, no de un mecanismo determinista.

3. **Evidencia de la brecha:** En FASE 27, `now.md` quedó con `current_work: null` hasta que se actualizó manualmente, mostrando que el Automático-B falló.

4. **Solución recomendada:** Opción D — crear `create-wp.sh` (invocable desde allow) + actualizar workflow-analyze/SKILL.md paso 2 para invocar el script. El SKILL.md necesita GATE OPERACIÓN, pero el resultado es ejecución determinista.

5. **Tamaño:** WP **pequeño** — 1 script nuevo + 1 SKILL.md actualizado. Fases: 1, 2, 6, 7.

---

## 9. Stopping Point Manifest

| SP-ID | Momento | Descripción | Estado |
|-------|---------|-------------|--------|
| SP-01 | Phase 1 → 2 | Validar análisis y dirección antes de estrategia | [ ] pendiente |
| SP-02 | Phase 5 → 6 | Autorizar inicio de ejecución | [ ] pendiente |
| SP-03 | Phase 6 → 7 | Confirmar que ejecución fue correcta | [ ] pendiente |
