```yml
type: Sub-análisis de riesgo
work_package: 2026-04-09-10-25-55-write-gates
fase: FASE 26
sub-tema: acceptEdits + archivos de configuración del framework (SKILL.md, CLAUDE.md)
created_at: 2026-04-09 10:55:00
decision_pendiente: deny rules vs ask rules vs confiar en GATE OPERACIÓN
```

# Riesgo R-03: acceptEdits y archivos de configuración del framework

## El problema concreto

`defaultMode: acceptEdits` auto-acepta ediciones de archivos en **todo** el directorio de trabajo.
Esto incluye:

```
.claude/CLAUDE.md                        ← afecta TODAS las sesiones futuras
.claude/skills/pm-thyrox/SKILL.md        ← metodología del framework
.claude/skills/workflow-*/SKILL.md       ← 7 skills de ejecución
.claude/scripts/*.sh                     ← scripts de infraestructura
.claude/settings.json                    ← configuración de permisos
```

La pregunta: ¿es suficiente el **GATE OPERACIÓN** del SKILL para proteger estos archivos,
o necesitamos protección a nivel sistema (`deny`/`ask` en settings.json)?

---

## Análisis del GATE OPERACIÓN actual

El GATE OPERACIÓN está definido en `workflow-execute/SKILL.md` línea 59:

```
⚠ GATE OPERACIÓN — antes de operaciones destructivas, STOP y describir qué se va a hacer:
   - Eliminar archivos/directorios, sobreescribir config con --force
   - Modificar .mcp.json, CLAUDE.md, archivos que afectan todas las sesiones
   - git push --force o cualquier operación que reescriba historia
   - Cualquier operación no reversible con git revert
```

**Observaciones críticas:**

1. **Es una instrucción a Claude, no una regla del sistema.** Su efectividad depende de que
   Claude lea y siga el SKILL activo en la sesión.

2. **Menciona `CLAUDE.md` explícitamente, pero no `SKILL.md`.** Claude podría editar un
   `SKILL.md` sin interpretar que cae bajo la categoría de "archivos que afectan todas las sesiones".

3. **No es resiliente a pérdida de contexto.** Si la ventana de contexto se comprime y el SKILL
   no está activo, la instrucción desaparece.

4. **No protege cuando el skill no está invocado.** Si Claude trabaja fuera de `/workflow-execute`
   (ej: respuesta directa sin skill), el GATE OPERACIÓN no existe para esa interacción.

---

## Frecuencia histórica de edición de framework config

Revisando las últimas FASEs completadas:

| FASE | CLAUDE.md | SKILL.md (alguno) | Scripts |
|------|-----------|-------------------|---------|
| FASE 22: framework-evolution | Sí (ADR-015 addendum) | Sí (7 workflow_* → skills) | Sí (hooks) |
| FASE 23: workflow-restructure | No | Sí (7 nuevos workflow-*/SKILL.md) | No |
| FASE 24: skill-references-restructure | Sí (## Estructura) | No | Sí (update-state.sh fix) |
| FASE 25: assets-restructure | No | No | No |
| FASE 26: write-gates (esta) | No | Sí (agregar sección) | No |

**Patrón: 4 de 5 FASEs recientes modificaron al menos un archivo de framework config.**

Esto tiene implicación directa: una `deny` rule que bloquee SKILL.md y CLAUDE.md se
activaría en ~80% de las FASEs, creando fricción en casos legítimos y frecuentes.

---

## Las tres opciones — análisis comparado

### Opción A: Confiar solo en el GATE OPERACIÓN (soft gate)

**Mecanismo:** Instrucción en `workflow-execute/SKILL.md` — Claude debe hacer STOP antes de modificar archivos que "afectan todas las sesiones".

| Escenario de riesgo | Resultado |
|--------------------|-----------|
| Phase 6 normal (WP artifacts) | OK — Claude no tiene razón para tocar SKILL.md |
| Phase 6 de framework maintenance | OK — GATE OPERACIÓN activo, user confirma |
| Contexto comprimido, skill sin cargar | FALLA SILENCIOSA — sin protección |
| Claude invocado sin /workflow-execute | FALLA SILENCIOSA — sin protección |
| Prompt injection en resultado de tool | FALLA SILENCIOSA — sin protección |
| SKILL.md no listado explícitamente en el gate | AMBIGUO — Claude puede omitirlo |

**Conclusión:** Depende 100% de que Claude siga instrucciones de texto. Zero enforcement de sistema.

---

### Opción B: deny rules para framework config (hard block)

```json
"deny": [
  "Edit(/.claude/CLAUDE.md)",
  "Edit(/.claude/skills/*/SKILL.md)",
  "Edit(/.claude/scripts/*.sh)"
]
```

**Mecanismo:** El sistema bloquea la herramienta Edit antes de que Claude pueda actuar.
Ninguna instrucción de texto puede overridear un `deny` rule.

| Escenario de riesgo | Resultado |
|--------------------|-----------|
| Phase 6 normal (WP artifacts) | OK — no toca esos paths |
| Phase 6 de framework maintenance | BLOQUEADO — fricción en ~80% FASEs |
| Contexto comprimido, skill sin cargar | Bloqueado — protección garantizada |
| Claude invocado sin /workflow-execute | Bloqueado — protección garantizada |
| Prompt injection | Bloqueado — protección garantizada |

**Problema crítico:** En FASEs de framework maintenance (que son la mayoría), el desarrollador
tendría que **editar settings.json para quitar el deny rule, hacer el trabajo, y volver a ponerlo**.
Esto crea:
- Un ciclo de mantenimiento de la configuración de seguridad
- Posibilidad de olvidar restaurar el deny rule
- Percepción de que el framework es burocrático

---

### Opción C: ask rules para framework config (hard prompt, no bloqueo)

```json
"ask": [
  "Edit(/.claude/CLAUDE.md)",
  "Edit(/.claude/skills/*/SKILL.md)",
  "Edit(/.claude/scripts/*.sh)"
]
```

**Mecanismo:** `ask` overridea `acceptEdits` para esos paths específicos.
Claude sigue pudiendo editar el archivo, pero el sistema SIEMPRE fuerza el prompt,
independientemente del defaultMode configurado.

Precedencia en la documentación oficial: **deny → ask → allow**.
`ask` gana sobre `acceptEdits` porque `acceptEdits` es equivalente a un `allow` con scope limitado.

| Escenario de riesgo | Resultado |
|--------------------|-----------|
| Phase 6 normal (WP artifacts) | OK — no toca esos paths |
| Phase 6 de framework maintenance | 1 prompt por archivo editado — intencional y esperado |
| Contexto comprimido, skill sin cargar | Prompt garantizado — protección fuerte |
| Claude invocado sin /workflow-execute | Prompt garantizado — protección fuerte |
| Prompt injection | Prompt al usuario — puede rechazar |

**Ventaja clave:** El prompt no es un obstáculo, es información. Le dice al usuario:
"Claude quiere editar CLAUDE.md/SKILL.md — ¿apruebas?"

En frameworks maintenance FASEs, el usuario ya sabe que se van a editar esos archivos (lo aprobó
en el gate de fase). El prompt es la confirmación de ejecución, no una sorpresa.

En sesiones normales (WP de producto), si Claude intenta tocar SKILL.md inesperadamente,
el prompt es la alerta que falta.

---

## Comparación de garantías de seguridad

| Garantía | Solo GATE OPERACIÓN | deny rules | ask rules |
|----------|---------------------|------------|-----------|
| Protege sin skill activo | No | Sí | Sí |
| Protege con contexto comprimido | No | Sí | Sí |
| Protege vs prompt injection | No | Sí | Parcial (user puede aprobar) |
| Permite uso legítimo sin friction extra | Sí | No (bloquea) | Sí (1 prompt) |
| Requiere mantenimiento de config | No | Sí (toggle) | No |
| Consistente con "gate de decisión" | Sí (conceptual) | No (bloqueo total) | Sí (prompt = gate) |
| Escala a nuevos SKILL.md | Depende de instrucción | Requiere actualizar deny | `*` lo cubre |

---

## Decisión recomendada: Opción C (ask rules)

La opción C es la única que satisface simultáneamente:

1. **Seguridad sin dependencia de instrucciones de texto** — el sistema fuerza el prompt
2. **No bloquea uso legítimo** — framework maintenance sigue funcionando con 1 prompt
3. **Escala automáticamente** — `Edit(/.claude/skills/*/SKILL.md)` cubre skills futuros
4. **Consistente con el modelo de gates** — un prompt = un gate, igual que los Phase gates

**La analogía con los Phase gates es exacta:**
- Phase gate: "¿apruebas pasar de Phase 6 a Phase 7?" → 1 confirmación
- ask rule: "¿apruebas editar CLAUDE.md?" → 1 confirmación

Ambos son gates de decisión. La diferencia es que el Phase gate viene del SKILL (soft)
y el ask rule viene del sistema (hard). La Opción C combina lo mejor de ambos mundos.

---

## Configuración final propuesta — settings.json completo

```json
{
  "defaultMode": "acceptEdits",
  "permissions": {
    "allow": [
      "Bash(bash .claude/scripts/*)",
      "Bash(bash .claude/skills/*/scripts/*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git commit -m *)",
      "Bash(git push *)",
      "Bash(git push -u *)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(git diff *)",
      "Bash(git fetch *)",
      "Bash(git branch *)",
      "Bash(date *)",
      "Bash(mkdir *)",
      "Bash(ls *)",
      "Bash(echo *)"
    ],
    "ask": [
      "Edit(/.claude/CLAUDE.md)",
      "Edit(/.claude/skills/*/SKILL.md)",
      "Edit(/.claude/scripts/*.sh)",
      "Edit(/.claude/settings.json)"
    ],
    "deny": [
      "Bash(git push --force *)",
      "Bash(git push --force-with-lease *)",
      "Bash(git reset --hard *)",
      "Bash(rm -rf *)"
    ]
  },
  "hooks": { ... }
}
```

**Comportamiento resultante por categoría de archivo:**

| Archivo | Comportamiento |
|---------|---------------|
| `context/work/**/*.md` (artefactos WP) | Auto (acceptEdits) |
| `context/now.md`, `focus.md` | Auto (acceptEdits) |
| `CHANGELOG.md`, `ROADMAP.md` | Auto (acceptEdits) |
| `.claude/CLAUDE.md` | Prompt (ask rule) |
| `.claude/skills/*/SKILL.md` | Prompt (ask rule) |
| `.claude/scripts/*.sh` | Prompt (ask rule) |
| `.claude/settings.json` | Prompt (ask rule) |
| `bash .claude/scripts/*` | Auto (allow) |
| `bash .claude/skills/*/scripts/*` | Auto (allow) |
| `git add/commit/status/log/diff` | Auto (allow) |
| `git push`, `git push -u *` | Auto (allow) — gate Phase 6→7 fue la aprobación |
| `git push --force` | Bloqueado (deny) |
| `git reset --hard` | Bloqueado (deny) |
| `rm -rf` | Bloqueado (deny) |

---

## Resumen de reducción de prompts proyectada

**Phase 7 normal (cierre de WP de producto):**
- Sin configuración: 7 prompts
- Con configuración: **0 prompts** — todo fluye automáticamente post-gate Phase 6→7

**Phase 6 de framework maintenance (ej: FASE 22, 23, 24, 26):**
- Sin configuración: múltiples prompts por cada Edit + Bash
- Con configuración: 1 prompt por archivo de framework editado (SKILL.md, CLAUDE.md)
- Estos prompts SON correctos — son exactamente los gates que deben existir

**Decisión: `git push` es automático.**
Justificación: el gate de Phase 6→7 ("SI" del usuario) es la aprobación para todo lo que
sigue en Phase 7. El push es consecuencia de esa decisión, no una nueva decisión.
Solo `git push --force` y variantes peligrosas permanecen en `deny`.

**Resultado:** Fricción proporcional al riesgo. Sin fricción en operaciones rutinarias.
Fricción intencional solo en operaciones que afectan el framework o son destructivas.
