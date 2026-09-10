```yml
type: Análisis
work_package: 2026-04-09-10-25-55-write-gates
fase: FASE 26
created_at: 2026-04-09 10:25:55
```

# Análisis — FASE 26: write-gates

## Objetivo

Entender cuándo el flujo pm-thyrox debe crear/modificar archivos de forma autónoma y cuándo requiere confirmación humana — y por qué hoy ambas cosas ocurren de manera inconsistente.

---

## 1. El detonante concreto

Durante FASE 25 Phase 7, el usuario fue solicitado a aprobar después de haber dicho "SI" para comenzar Phase 7. Esto ocurrió porque:

- **Editar `now.md` y `focus.md`** → herramienta Edit → generalmente auto-aprobada, sin prompt
- **`bash .claude/scripts/update-state.sh`** → herramienta Bash → requiere aprobación individual
- **`bash .claude/skills/workflow-track/scripts/validate-session-close.sh`** → herramienta Bash → requiere aprobación individual
- **`git add`, `git commit`, `git push`** → herramienta Bash → requiere aprobación individual

El usuario ya había dicho "SI" al gate de fase (Phase 6 → Phase 7). Pero dentro de Phase 7 se generaron 5+ prompts de aprobación adicionales, uno por cada llamada a la herramienta Bash.

---

## 2. Los dos planos que el SKILL no separa

### Plano A — Gates de decisión del SKILL (metodológico)

Son puntos donde el **humano decide si continuar**. La lógica es:
"¿Los resultados de esta fase son correctos antes de comprometerse con la siguiente?"

| Gate | Momento | Justificación |
|------|---------|---------------|
| Phase 1 → 2 | Después de presentar análisis | El humano valida los hallazgos antes de diseñar solución |
| Phase 2 → 3 | Después de presentar estrategia | El humano aprueba la dirección antes de planificar |
| Phase 4 → 5 | Después de especificación | El humano aprueba el spec antes de descomponer |
| Phase 5 → 6 | Antes de ejecutar | El humano autoriza comenzar a escribir código/archivos |
| Phase 6 → 7 | Antes de TRACK | El humano confirma que la ejecución fue correcta |
| GATE OPERACIÓN | Operaciones destructivas | El humano aprueba acciones irreversibles |

Estos gates son **correctos e intencionales**. No se deben eliminar.

### Plano B — Permisos de ejecución de Claude Code (sistema)

Son prompts de la **herramienta Bash** que Claude Code genera automáticamente. La lógica es:
"¿Puede esta herramienta ejecutar este comando en este proyecto?"

Claude Code pregunta por cada llamada a Bash que no esté en una lista de permitidos (`allowed-tools` en el frontmatter del skill, o `allowedTools` global en settings.json).

Estos prompts son **independientes de los gates del SKILL**. Ocurren siempre, incluso después de que el humano haya dicho "SI" al gate de fase.

### El conflicto

```
Flujo actual:

Usuario: "SI" (gate Phase 6→7)   ← Plano A: gate de decisión
Claude: bash update-state.sh      ← Plano B: prompt de herramienta
Usuario: "SI"
Claude: bash validate-session.sh  ← Plano B: prompt de herramienta
Usuario: "SI"
Claude: git add ...               ← Plano B: prompt de herramienta
Usuario: "SI"
Claude: git commit ...            ← Plano B: prompt de herramienta
Usuario: "SI"
Claude: git push ...              ← Plano B: prompt de herramienta
Usuario: "SI"

Total: 6 confirmaciones para cerrar un WP.
Justificadas: 1 (el gate de fase).
Fricción innecesaria: 5.
```

---

## 3. La causa raíz en el SKILL

### 3a. Ningún workflow-* usa `allowed-tools`

El frontmatter de Claude Code Skills soporta:

```yaml
allowed-tools: Read Grep Bash Edit
```

Esto pre-aprueba herramientas mientras el skill está activo. Ninguno de los 7 `workflow-*/SKILL.md` lo usa. Por tanto, cada invocación de Bash genera prompt.

Archivos afectados:
- `workflow-execute/SKILL.md` — git add/commit por cada tarea, operaciones de código
- `workflow-track/SKILL.md` — update-state.sh, validate-session-close.sh, git commit/push

### 3b. El SKILL modela un solo tipo de gate

El SKILL.md de pm-thyrox y los `workflow-*/SKILL.md` documentan:
- `⏸ STOP — Esperar confirmación explícita` (gate de decisión — Plano A)
- `⚠ GATE OPERACIÓN` (gate de operación destructiva — híbrido A+B)

Pero no documentan:
- **Operaciones confiables dentro de fase**: acciones que deben ejecutarse sin prompt después del gate de fase
- **La diferencia entre gate metodológico y permiso de herramienta**
- **Qué hace `allowed-tools` y cuándo usarlo**

### 3c. settings.json no tiene `allowedTools` global

El `settings.json` actual solo tiene hooks (SessionStart, Stop, PostCompact). No tiene configuración de permisos de herramientas.

Claude Code permite configurar permisos globales en settings.json con la clave `permissions` o equivalentes, pero esto no está documentado en el framework.

---

## 4. Taxonomía de operaciones (análisis de las categorías)

### Categoría 1: Artefactos de work package — AUTO siempre

Archivos en `context/work/TIMESTAMP-nombre/`. Son el output propio de la metodología. Sin efectos externos.

- `*-analysis.md`, `*-risk-register.md`, `*-solution-strategy.md`, `*-plan.md`
- `*-requirements-spec.md`, `*-design.md`, `*-task-plan.md`
- `*-execution-log.md`, `*-lessons-learned.md`, `*-final-report.md`

**Justificación:** El WP es el sandbox de la FASE. Todo lo que vive ahí es reversible con `git revert`.

### Categoría 2: Archivos de estado de sesión — AUTO siempre (en gates definidos)

- `context/now.md` — sincronización de estado entre sesiones
- `context/focus.md` — dirección actual del proyecto
- `context/project-state.md` — metadata (actualizado por `update-state.sh`)

**Justificación:** Son archivos operacionales del framework. Se actualizan en momentos definidos por los gates del SKILL (Phase 7 TRACK). El gate de fase ya captó la aprobación humana.

### Categoría 3: Historial del proyecto — AUTO en Phase 7 post-validate

- `CHANGELOG.md` — solo Phase 7, después de `validate-session-close.sh`
- `ROADMAP.md` — solo Phase 7, checkboxes de la FASE actual

**Justificación:** El gate de Phase 6→7 ya validó que la ejecución fue correcta. `validate-session-close.sh` es el segundo filtro. Si ambos pasan, actualizar historial es mecánico.

### Categoría 4: Scripts de validación — AUTO (son read-only sobre el estado)

- `bash .claude/skills/workflow-track/scripts/validate-phase-readiness.sh N`
- `bash .claude/skills/workflow-track/scripts/validate-session-close.sh`
- `bash .claude/scripts/project-status.sh`

**Justificación:** Son scripts de lectura/validación. No modifican archivos. El riesgo de auto-ejecución es prácticamente cero.

### Categoría 5: Scripts de sincronización de estado — AUTO (determinísticos)

- `bash .claude/scripts/update-state.sh`
- `git add [archivos-específicos]`
- `git commit` (con mensaje Conventional Commits)

**Justificación:** `update-state.sh` solo actualiza `project-state.md` calculando métricas. `git add/commit` después de Phase 7 son operaciones determinísticas cuyo contenido ya fue aprobado por el gate.

### Categoría 6: Operaciones externas — GATE siempre

- `git push` — afecta repositorio remoto compartido
- Modificar `.claude/settings.json`
- Operaciones que afectan otros desarrolladores o sistemas externos

**Justificación:** Efectos fuera del repo local. Irreversibles o con impacto en otros.

### Categoría 7: Configuración del framework — GATE siempre

- `SKILL.md` de cualquier skill
- `CLAUDE.md`
- `ADR-*.md` (marcar como `Accepted`)
- `.claude/scripts/*.sh` (scripts operacionales)

**Justificación:** Afectan el comportamiento de TODAS las sesiones futuras. El impacto supera el WP actual.

### Categoría 8: Referencias y documentación de plataforma — GATE si cambia semántica

- `.claude/references/*.md`
- `.claude/skills/workflow-*/references/*.md`

**Justificación:** Correcciones de links → AUTO. Cambios en instrucciones metodológicas → GATE.

---

## 5. La solución tiene dos capas que deben operar juntas

### Capa 1 — allowed-tools por skill (Plano B)

Agregar `allowed-tools` al frontmatter de los skills que ejecutan operaciones de Categorías 1-5:

```yaml
# workflow-execute/SKILL.md
allowed-tools: Read Write Edit Bash Grep Glob
```

```yaml
# workflow-track/SKILL.md
allowed-tools: Read Write Edit Bash Grep Glob
```

Efecto: mientras el skill está activo, esas herramientas no generan prompts individuales.

**Riesgo:** `allowed-tools: Bash` aprueba TODO bash mientras el skill esté activo, incluyendo potencialmente comandos destructivos. La pregunta es si el tradeoff es aceptable dado que el skill ya requirió gate de fase.

**Alternativa más restrictiva:** Solo permitir Read/Write/Edit y mantener el gate de Bash para operaciones específicas. Pero esto no resuelve el problema de los scripts de validación y git.

### Capa 2 — Documentación de gates en SKILL.md (Plano A)

Agregar una sección explícita en `pm-thyrox/SKILL.md` y en cada `workflow-*/SKILL.md` que documente:
- Qué tipo de gate aplica en cada punto de la fase
- Qué operaciones son confiables dentro de una fase (no requieren confirmación adicional)
- La diferencia entre gate de decisión (metodológico) y prompt de herramienta (sistema)

---

## 6. Dimensión adicional: `git push` como caso especial

`git push` es la única operación de Categoría 6 que el flujo de Phase 7 ejecuta rutinariamente. Es:
- Irreversible en el sentido de que afecta el remoto compartido
- Esperada siempre al cierre de Phase 7

El SKILL actual dice implícitamente "commit y push al final". Pero no distingue entre:
- Push como parte del cierre normal (esperado, post-validate → AUTO)
- Push en operaciones intermedias (inesperado → GATE)

Esto es una sub-decisión de diseño que requiere resolver: ¿el push de cierre de Phase 7 es automático o requiere gate?

---

## 7. Síntesis de hallazgos

| Hallazgo | Impacto | Categoría |
|---------|---------|-----------|
| H-01: `allowed-tools` no usado en ningún workflow-* | 5+ prompts extras por Phase 7 | técnico |
| H-02: SKILL solo modela gates de decisión, no permisos de herramienta | Confusión de planos | diseño |
| H-03: settings.json sin configuración de permisos | Sin whitelist global | técnico |
| H-04: Categorías 1-5 deberían ser auto-execute post-gate | Fricciones evitables | diseño |
| H-05: `git push` tiene ambigüedad (cierre normal vs operación intermedia) | Sub-decisión pendiente | diseño |
| H-06: `validate-session-close.sh` y `update-state.sh` son read/determinísticos | Justifican auto-execute | análisis |
| H-07: El gate Phase 6→7 es la barrera correcta — todo lo que viene después debería fluir | El problema no es el gate, es lo que pasa después | diseño |

---

## 8. Riesgos de la solución

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| R-01: `allowed-tools: Bash` permite comandos destructivos sin gate | Baja (el skill define qué hace) | Alto | Documentar qué comandos están en scope; mantener GATE OPERACIÓN para destructivos |
| R-02: Usuario no entiende que el skill auto-ejecuta después del gate | Media | Medio | Mostrar en el resumen de Phase gate qué va a ejecutarse automáticamente |
| R-03: `git push` automático envía cambios incorrectos al remoto | Baja (validate-session-close ya verificó) | Alto | Mantener gate para push o requerir validate exitoso como precondición |
| R-04: Cambio en `allowed-tools` puede afectar skills que ya funcionan bien | Baja | Bajo | Testear con un skill antes de aplicar a todos |

---

## 9. Correcciones post-documentación oficial

Ver sub-análisis completo en [permission-system-analysis.md](permission-system-analysis.md).

**Correcciones al análisis inicial:**

- **Edit tool SÍ requiere aprobación** — la documentación confirma que File modification requiere prompt (hasta fin de sesión). El análisis inicial estaba equivocado al asumir que Edit era auto.
- **`allowed-tools` en SKILL frontmatter es secundario** — `permissions.allow` en settings.json es la solución principal, aplica siempre independientemente del skill activo.
- **`acceptEdits` mode resuelve los 2 archivos** — configurable como `defaultMode` en settings.json, auto-acepta Edit/Write y comandos filesystem básicos (mkdir, touch, mv, cp).
- **El wildcard de Bash es confiable** — `Bash(bash .claude/scripts/*)` no puede ser ampliado con `&&` según la documentación: Claude Code es consciente de operadores shell.
- **PreToolUse hooks** son un mecanismo alternativo más expresivo si las reglas de wildcard no son suficientes.
- **`.claude/skills/` es EXEMPT en bypassPermissions** — el diseño de Claude Code asume que SKILL.md files son output normal de Claude, no config protegida.

**Reducción de prompts proyectada:**
- Sin configuración: 7 prompts al cerrar Phase 7
- Con `acceptEdits` + `permissions.allow`: **1 prompt** (solo `git push` — gate correcto)

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis presentado | Confirmar hallazgos, aprobar dirección de solución |
| SP-02 | 5→6 | gate-fase | Task plan listo | Aprobar scope antes de ejecutar |
| SP-03 | 6→7 | gate-fase | Ejecución completa | Confirmar que la implementación es correcta |

> Este WP no tiene operaciones destructivas — no se eliminan archivos del framework. Sin SP de gate-operación.
