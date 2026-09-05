```yml
created_at: 2026-04-15 08:29:58
project: THYROX
analysis_version: 1.0
author: NestorMonroy
status: Borrador
```

# Análisis: Plugin Distribution — THYROX

## Objetivo

Determinar si THYROX puede distribuirse como plugin puro de Claude Code,
eliminando `setup-template.sh` y el paradigma "git clone + bash setup".

---

## Visión General

THYROX hoy se distribuye como template de GitHub: el usuario clona el repo y ejecuta
`setup-template.sh` que: (1) sustituye el nombre "THYROX" en archivos core, (2) resetea
archivos de estado, (3) limpia WPs de ejemplo, (4) se auto-elimina.

Este script tiene deuda acumulada: paths pre-FASE-35 (`.claude/context/` en lugar de
`.thyrox/context/`), referencias a `pm-thyrox` (nombre pre-FASE-29), y falta crear
la estructura `.thyrox/` que requiere el framework.

THYROX ya tiene `.claude-plugin/plugin.json` y opera con el namespace `/thyrox:*`.
La pregunta es: ¿puede el sistema de plugins de Claude Code asumir lo que hoy hace
`setup-template.sh`?

---

## Análisis de los 8 aspectos

### 1. Objetivo / Por qué

Hoy el usuario necesita:
- Clonar el repo (trae todo el historial WP de THYROX — no deseado)
- Ejecutar `setup-template.sh` (script con paths viejos, PM-THYROX branding)
- El resultado es un repo con la estructura THYROX lista para su proyecto

Objetivo: instalación con un solo comando, sin historial de desarrollo de THYROX,
sin script bash manual, con actualizaciones automáticas cuando THYROX evolucione.

### 2. Stakeholders

| Stakeholder | Necesidad |
|-------------|-----------|
| NestorMonroy (mantenedor) | Distribución limpia, actualizaciones sin "re-clonar" |
| Usuarios adoptantes (developers) | `claude plugin install thyrox` → listo para usar |
| Sesiones futuras de Claude | `.thyrox/context/` inicializado correctamente |

### 3. Uso operacional

**Hoy:**
```bash
git clone https://github.com/nestormonroy/thyrox mi-proyecto
cd mi-proyecto
bash setup-template.sh
```

**Objetivo (plugin puro):**
```bash
# En cualquier repo nuevo
claude plugin install thyrox@nestormonroy
# O con un skill que inicialice el estado
/thyrox:init
```

### 4. Atributos de calidad

- **Idempotencia**: la inicialización debe poder correr N veces sin duplicar estado
- **Portabilidad**: funciona en cualquier repo destino (nuevo o existente)
- **Transparencia**: el usuario sabe qué archivos crea el plugin y en qué directorio
- **Actualizabilidad**: `claude plugin update thyrox` actualiza skills/hooks sin tocar estado del proyecto

### 5. Restricciones — hallazgos del deep-review

Las referencias de Claude Code revelan limitaciones críticas:

| Restricción | Fuente | Impacto |
|-------------|--------|---------|
| **No hay lifecycle hook post-install** | `claude-howto/07-plugins/README.md` | El plugin no puede ejecutar setup al instalar |
| **`settings.json` del plugin solo soporta `agent`** | `claude-howto/07-plugins/README.md:276` | No configura permisos ni hooks del proyecto destino |
| **`bin/` solo agrega al PATH del Bash tool** | `claude-howto/07-plugins/README.md:109` | No es un mecanismo de bootstrap |
| **Mecanismo interno de `claude plugin install` no documentado** | — | No se sabe si copia o enlaza archivos |
| **Safety invariant de `.claude/`** | ADR-FASE-35 | Escrituras en `.claude/` requieren confirmación manual |

### 6. Contexto / Sistemas vecinos

- **SessionStart hook** (documentado): se ejecuta al inicio de CADA sesión — workaround viable para inicialización idempotente. Ejemplo oficial en `ultimate-guide.md:13621`.
- **compound-engineering plugin** (Every.to): único ejemplo documentado que crea directorios fuera de `.claude/` en el repo destino (`docs/brainstorms/`, `docs/solutions/`, etc.). Mecanismo interno no documentado.
- **`CLAUDE_PLUGIN_DATA`**: variable de entorno disponible en hooks del plugin para almacenamiento persistente. Diferente de los archivos del proyecto.

### 7. Fuera de alcance

- Publicar en marketplace real (solo self-hosted GitHub)
- Cambiar la metodología THYROX (solo la distribución)
- Migrar el historial de WPs del repo THYROX al repo del usuario

### 8. Criterios de éxito

- [ ] `claude plugin install thyrox` instala skills, agents, hooks correctamente
- [ ] `/thyrox:init` (o SessionStart) crea `.thyrox/context/` con estructura inicial
- [ ] `setup-template.sh` eliminado o reducido a casos edge
- [ ] El hook `session-start.sh` detecta WP activo en la primera sesión
- [ ] La instalación es idempotente (segunda ejecución no rompe estado existente)

---

## Hallazgos del deep-review

**Fuentes analizadas:** `/tmp/reference/claude-howto/` y `/tmp/reference/claude-code-ultimate-guide/`

### Hallazgo crítico: no existe post-install hook

El sistema de plugins no tiene un evento `PostInstall` ni `OnFirstUse`. El workaround
documentado es **SessionStart con lógica idempotente**:

```json
// hooks/hooks.json del plugin
"SessionStart": [{
  "type": "command",
  "command": "[ -d .thyrox/context ] || bash $PLUGIN_DIR/bin/thyrox-init.sh"
}]
```

`$PLUGIN_DIR/bin/thyrox-init.sh` crea la estructura si no existe (idempotente).

### Hallazgo clave: compound-engineering como precedente

El plugin `compound-engineering` de Every.to es el único ejemplo documentado de un
plugin que crea estructura fuera de `.claude/`:

> *"This drops the full docs/brainstorms/, docs/solutions/, docs/plans/, and todos/ structure into your project"*
> — `ultimate-guide.md:4920`

Esto valida que es **posible** crear `.thyrox/context/` desde un plugin. El mecanismo
exacto (hook SessionStart vs command explícito) no está documentado.

### Hallazgo: skill discovery es in-situ, no por copia

Los skills de un plugin se cargan desde la ubicación del plugin con namespace
`plugin-name:skill-name`. NO se copian a `.claude/skills/` del proyecto destino.
Esto es favorable para THYROX: los `workflow-*` skills seguirían viviendo en el plugin,
no en el repo del usuario.

### Hallazgo: `bin/` como mecanismo de init viable

`bin/` agrega ejecutables al PATH del Bash tool **mientras el plugin está habilitado**.
Esto significa que un script `bin/thyrox-init.sh` puede ejecutarse desde SessionStart
hook o desde un skill `/thyrox:init` como `bash thyrox-init.sh`.

---

## Audit interno — Estado actual de la implementación

### 1. `plugin.json` — namespace-only, NO es un plugin funcional

El manifest actual tiene solo 4 campos:

```json
{
  "name": "thyrox",
  "description": "...",
  "version": "2.5.0",
  "author": { "name": "NestorMonroy" }
}
```

**Campos faltantes para un plugin funcional:** `hooks`, `skills`, `agents`, `commands`, `bin`.
THYROX hoy usa el plugin system solo para el namespace `/thyrox:*` — no es un plugin
instalable vía `claude plugin install`.

### 2. Inventario de componentes actuales

**Skills (`.claude/skills/` — 16 directorios):**

| Categoría | Skills |
|-----------|--------|
| Meta-framework | `thyrox/` (SKILL.md + assets/ + evals/ + scripts/) |
| Workflow SDLC | `workflow-analyze/`, `workflow-decompose/`, `workflow-execute/`, `workflow-plan/`, `workflow-strategy/`, `workflow-structure/`, `workflow-track/` |
| Tech stack (proyecto-específicos) | `backend-nodejs/`, `db-mysql/`, `db-postgresql/`, `frontend-react/`, `frontend-webpack/`, `python-mcp/`, `sphinx/` |

**Agentes (`.claude/agents/` — 11 archivos `.md`):**
deep-review, diagrama-ishikawa, mysql-expert, nodejs-expert, postgresql-expert,
react-expert, skill-generator, task-executor, task-planner, tech-detector, webpack-expert

**Scripts (`.claude/scripts/` — 18 archivos):**

| Tipo | Scripts |
|------|---------|
| Hooks activos | `session-start.sh`, `session-resume.sh`, `validate-session-close.sh`, `stop-hook-git-check.sh`, `sync-wp-state.sh`, `bound-detector.py` |
| Utilidades | `project-status.sh`, `update-state.sh`, `close-wp.sh`, `set-session-phase.sh` |
| Validación/detección | `detect_broken_references.py`, `lint-agents.py`, `detect-missing-md-links.sh` y otros |

**Hooks configurados (`.claude/settings.json`):**

| Evento | Script | Propósito |
|--------|--------|-----------|
| SessionStart | `session-start.sh` | Inyecta contexto WP activo al inicio de sesión |
| Stop (x2) | `validate-session-close.sh` + `stop-hook-git-check.sh` | Valida cierre + verifica commits pendientes |
| PostCompact | `session-resume.sh` | Restaura contexto tras compactación |
| PreToolUse (Agent) | `bound-detector.py` | Detecta uso de Agent tool |
| PostToolUse (Write) | `sync-wp-state.sh` | Sincroniza estado WP tras escritura |

**Permisos (`.claude/settings.json` — proyecto-nivel):**
- `defaultMode: acceptEdits`
- Allow: Edit ROADMAP.md, Write references/, git operations, bash scripts, mkdir, ls, echo
- Ask: Edit `.claude/scripts/*.sh`, Edit `.claude/settings.json`
- Deny: git push --force, git reset --hard, rm -rf

### 3. Gaps críticos para plugin-pure

#### GAP-001: No existe `hooks/hooks.json` en el plugin

Los hooks de THYROX viven en `.claude/settings.json` (project-level). En modelo plugin,
deben migrar a `<plugin-dir>/hooks/hooks.json`. Sin esto, instalar el plugin NO configura
los hooks SessionStart, Stop, PostCompact.

#### GAP-002: No existe `bin/` directory

No hay `bin/thyrox-init.sh` ni equivalente. El reemplazo de `setup-template.sh` no existe.

#### GAP-003: `settings.json` del plugin solo soporta `agent` key

Las reglas de permisos (`allow/ask/deny`) no se pueden distribuir vía plugin `settings.json`.
**Solución viable:** `bin/thyrox-init.sh` crea `.claude/settings.json` en el proyecto destino
— un script bash puede escribir ahí sin triggear la safety invariant (el invariant solo bloquea
el Write *tool* del LLM, no operaciones de filesystem desde hooks).

#### GAP-004: Tech skills son proyecto-específicos

Los 7 tech skills (`backend-nodejs`, `db-mysql`, etc.) y `.thyrox/guidelines/` son generados
por `registry/_generator.sh` para el stack del usuario. No deben ir en el plugin — el usuario
los genera con `/thyrox:init` o equivalente.

#### GAP-005: `setup-template.sh` tiene 4 bugs acumulados

| Bug | Problema |
|-----|---------|
| Paths `.claude/context/` | Deberían ser `.thyrox/context/` (FASE 35) |
| Skill name `pm-thyrox` | Debería ser `thyrox` (FASE 29) |
| Branding "PM-THYROX" | Debería ser "THYROX" |
| Crea estado en `.claude/context/` | El estado vive en `.thyrox/context/` |

#### GAP-006: Separación plugin vs. proyecto destino no definida

En modelo template (hoy), el usuario obtiene TODO el repo THYROX incluyendo WPs de desarrollo,
ADRs internos, y decisions de implementación del framework. En modelo plugin, hay separación clara:

| Qué | Dónde vive | Quién lo provee |
|-----|-----------|-----------------|
| Skills (`thyrox/`, `workflow-*/`) | Plugin | THYROX (actualizable) |
| Agentes (deep-review, etc.) | Plugin | THYROX (actualizable) |
| Scripts de hooks | Plugin + `hooks/hooks.json` | THYROX (actualizable) |
| Tech skills (`backend-nodejs/`, etc.) | Proyecto destino | Usuario genera con `/thyrox:init` |
| `.thyrox/context/` (estado) | Proyecto destino | `bin/thyrox-init.sh` crea en primera sesión |
| `.claude/settings.json` (permisos) | Proyecto destino | `bin/thyrox-init.sh` crea en instalación |
| WPs, ADRs, decisions | Proyecto destino | Usuario genera trabajando |

### 4. Qué hace `setup-template.sh` que el modelo plugin elimina

El sed-replacement (`THYROX` → `{PROJECT_NAME}`) era necesario porque el usuario clonaba
el REPO THYROX completo (con toda la referencia al nombre THYROX en archivos core).
En modelo plugin el usuario no clona el repo THYROX — instala el plugin. No hay nada
que renombrar. **Esta funcionalidad desaparece completamente.**

El cleanup de WPs/errors/decisions era necesario por el mismo motivo (el usuario recibía el
historial de desarrollo de THYROX). En plugin mode, el usuario parte de un repo vacío y la
estructura la crea `bin/thyrox-init.sh`. **Esta funcionalidad también desaparece.**

Lo que SIGUE siendo necesario: crear los archivos de estado inicial (`.thyrox/context/now.md`,
`focus.md`, `project-state.md`) y el `ROADMAP.md` + `CHANGELOG.md` iniciales. Esto pasa a
`bin/thyrox-init.sh`.

---

## Arquitectura propuesta (para evaluar en Phase 2)

```
Plugin THYROX
├── .claude-plugin/plugin.json     ← manifest (ya existe)
├── skills/                        ← skills del framework (ya existe como .claude/skills/)
│   ├── thyrox/
│   └── workflow-*/
├── agents/                        ← agentes nativos (ya existe como .claude/agents/)
├── hooks/
│   └── hooks.json                 ← SessionStart: detectar/crear .thyrox/context/
├── bin/
│   └── thyrox-init.sh             ← NUEVO: reemplaza setup-template.sh
│                                     Crea .thyrox/context/ + now.md + focus.md
└── settings.json                  ← solo key "agent" soportada actualmente
```

El flujo de instalación sería:
1. `claude plugin install thyrox@nestormonroy`
2. Primera sesión → SessionStart hook → `thyrox-init.sh` detecta que `.thyrox/context/` no existe → lo crea
3. Claude Code tiene skills `/thyrox:*` disponibles inmediatamente
4. Usuario ejecuta `/thyrox:analyze` para empezar Phase 1

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | Phase 1 → Phase 2 | gate-fase | Análisis completo | Usuario aprueba hallazgos y propuesta de arquitectura |
| SP-02 | Phase 2 → Phase 3 | gate-fase | Estrategia definida | Usuario aprueba arquitectura antes de planificar |
| SP-03 | Phase 4 → Phase 5 | gate-fase | Spec aprobada | Aprobar spec antes de descomponer en tareas |
| SP-04 | Phase 5 → Phase 6 | gate-fase | Task plan aprobado | Autorizar inicio de ejecución |
| SP-05 | Phase 6 → Phase 7 | gate-fase | Implementación completa | Confirmar que la migración funciona correctamente |
| SP-06 | compound-engineering | gate-decision | Mecanismo de init no documentado | Investigar fuente de compound-engineering antes de implementar |
