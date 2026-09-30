```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis (Phase 1: ANALYZE)
Tema: LOG.md, outputs/, y mezcla de niveles de decisión
```

# Análisis: LOG.md, outputs/, y niveles de decisión

## 1. ¿Cómo documentan logs los proyectos de referencia?

| Proyecto | Tiene log? | Qué registra | Formato |
|----------|-----------|-------------|---------|
| build-ledger | LOG.md | Acciones de agentes (CLAIM/RELEASE) | `[YYYY-MM-DD HH:MM] Agent :: Message` |
| agentic-framework | JOURNAL.md | Progreso por sesión (focus, accomplished, next) | Markdown narrativo |
| trae-agent | trajectory.json | TODA interacción LLM + tool calls + resultados | JSON automático |
| oh-my-claude | claude-and-me plugin | Transcripts de sesión | JSONL automático vía hook |
| Cortex-Template | metabolism/ | Métricas de sesión (tokens, context peak, commits) | YAML |
| conv-temp | Transcripts diarios | Conversaciones completas | Texto crudo |
| valet | No tiene log separado | Estado en .beans/ frontmatter | YAML status field |
| clawpal | cc.md | Feedback loop Claude→Codex | Markdown con actions |
| spec-kit | No tiene log | Progreso en tasks.md checkboxes | `- [ ]` → `- [x]` |
| claude-pipe | No tiene log | — | — |
| ClaudeViewer | No tiene log | — | — |
| almanack | No tiene log | — | — |
| cc-warp | No tiene log separado | — | — |

**Hallazgo:** Solo 2 de 14 proyectos tienen un LOG.md explícito:
- **build-ledger** — Pero es para COORDINACIÓN MULTI-AGENTE (CLAIM/RELEASE). No para tracking de trabajo.
- **agentic-framework** — Pero es JOURNAL.md con progreso narrativo, no append-only log.

Los demás o no tienen log, o lo hacen automáticamente (trae-agent trajectory, oh-my-claude hooks), o usan checkboxes en tasks.

**¿LOG.md es realmente necesario?** La mayoría de proyectos exitosos NO lo tienen. El progreso se trackea con:
- Checkboxes en plan.md (`- [ ]` → `- [x]`)
- YAML status en frontmatter (status: done)
- Git log (los commits SON el log)

**Conclusión:** LOG.md append-only es un concepto de build-ledger para multi-agente. THYROX es single-agent. **No necesitamos LOG.md.** Git log + checkboxes en plan.md son suficientes.

---

## 2. ¿outputs/ dentro de work/?

### Qué dice spec-kit

spec-kit NO tiene outputs/ dentro del directorio de feature. Todo el output de spec-kit es:

```
specs/001-feature-name/
├── spec.md              ← QUÉ (requirements)
├── plan.md              ← CÓMO (architecture)
├── research.md          ← Investigación
├── data-model.md        ← Entidades
├── contracts/           ← APIs
├── tasks.md             ← Tasks con checkboxes
├── quickstart.md        ← Escenarios clave
└── checklists/          ← Validación de calidad
```

**No hay outputs/.** El output es el CÓDIGO que se genera en el repo real (no dentro de specs/). Los docs dentro de specs/ son el PLAN, no el resultado.

### Qué dice valet

```
.beans/agent-ops-mj3a--memory-journal-and-autoload.md
```

Un solo archivo. El output es el CÓDIGO en packages/. No hay outputs/ dentro del bean.

### Qué dice agentic-framework

```
.agentic/journal/manifests/F-0116.manifest.md
```

Los manifests APUNTAN al código (commits, archivos cambiados). No CONTIENEN el output.

### Qué dice tu .mywork/

```
changes/20260131-061552-correccion-582-warnings/
├── build-logs/    ← Output de builds
├── PLAN.md
├── TRACKING.md
└── DECISIONES.md
```

Aquí SÍ hay output (build-logs/) — pero es porque el TRABAJO era corregir builds de Sphinx, y los logs eran EVIDENCIA del trabajo, no código producido.

### Análisis

`outputs/` tiene sentido SOLO cuando el output no es código en el repo:
- Build logs → evidencia de que el build pasó
- Reportes generados → artefactos de análisis
- Screenshots → evidencia visual

Pero si el output es código (commits), NO va en outputs/ — va en el repo. Los commits con referencia al work package son el tracking.

**Conclusión:** `outputs/` NO debería ser estándar en cada work directory. Solo cuando el trabajo produce artefactos que no son código (logs, reportes, evidencia). Y en ese caso, es OPCIONAL.

---

## 3. ¿Estamos mezclando niveles de decisión?

### Los niveles

```
NIVEL 1: ESTRATÉGICO (largo plazo, cambia rara vez)
  → constitution.md (principios inmutables)
  → decisions/ ADRs (decisiones arquitectónicas)
  → project-state.md (qué ES el proyecto)

NIVEL 2: TÁCTICO (mediano plazo, por trabajo/feature)
  → work/YYYY-MM-DD-HH-MM-SS-nombre/
  → spec.md, plan.md, lessons.md

NIVEL 3: OPERACIONAL (corto plazo, por sesión/acción)
  → focus.md (qué hago AHORA)
  → now.md (estado de sesión)
  → LOG.md ← ¿ESTE NIVEL NECESITA ARCHIVO PROPIO?
```

### ¿Qué mezcla LOG.md?

LOG.md append-only mezclaría:
- Nivel 2: "Empecé work/2026-03-28-covariance/" (táctico)
- Nivel 3: "Edité SKILL.md línea 45" (operacional)
- Nivel 3: "Ejecuté validate-phase-readiness.sh" (operacional)
- Nivel 2: "Completé task T-003" (táctico)

Esto es exactamente la mezcla que mencionas. Los commits ya capturan el nivel operacional (qué archivos cambiaron). Poner eso TAMBIÉN en un LOG.md es duplicación.

### Lo que cada nivel necesita

| Nivel | Qué documenta | Dónde vive | Quién lo actualiza |
|-------|--------------|-----------|-------------------|
| **Estratégico** | Principios, decisiones, identidad del proyecto | constitution.md, decisions/, project-state.md | Humano + consenso |
| **Táctico** | Planes de trabajo, specs, lecciones | work/YYYY-MM-DD/ (spec.md, plan.md, lessons.md) | Claude + humano |
| **Operacional** | Qué cambió, cuándo | Git log + checkboxes en plan.md | Git automático |

**LOG.md es operacional.** Y el nivel operacional ya está cubierto por git log + checkboxes. **No necesita archivo propio.**

### Dónde sí estamos mezclando

El problema real es que `context/` mezcla niveles:

```
context/
├── project-state.md          ← ESTRATÉGICO (metadata del proyecto)
├── constitution.md           ← ESTRATÉGICO (principios)
├── decisions/                ← ESTRATÉGICO (ADRs)
├── focus.md                  ← OPERACIONAL (qué hago ahora)
├── now.md                    ← OPERACIONAL (estado de sesión)
├── analysis/                 ← TÁCTICO (mezcla de diagnósticos y planes)
└── work/                     ← TÁCTICO (paquetes de trabajo)
```

¿Deberían estar separados por nivel? Veamos qué hacen los proyectos:

- **agentic-framework:** TODO en `.agentic/` sin separar por nivel. Pero cada archivo sabe qué nivel es (STATUS = operacional, FEATURES = estratégico).
- **Cortex-Template:** Separación implícita (KERNEL = estratégico, focus/now = operacional, workspace = táctico).
- **valet:** Sin separación. .beans/ mezcla todos los niveles pero cada bean tiene su propio scope.

**Ningún proyecto separa explícitamente por nivel.** Lo que hacen es que cada archivo SABE su nivel (por su nombre y propósito), no por su ubicación.

---

## Conclusiones

### 1. LOG.md → NO necesario

Git log + checkboxes en plan.md cubren el tracking operacional. LOG.md sería duplicación. Solo tiene sentido para coordinación multi-agente (build-ledger pattern).

### 2. outputs/ → OPCIONAL, no estándar

Solo cuando el trabajo produce artefactos que no son código (build logs, reportes, evidencia). No es una carpeta estándar en cada work/.

### 3. Niveles → No separar por directorio, separar por archivo

Cada archivo sabe su nivel. No crear subdirectorios por nivel. Mantener todo en `context/` con nombres claros.

### 4. Estructura corregida

```
context/
├── project-state.md          ← Estratégico: qué ES el proyecto
├── constitution.md           ← Estratégico: principios inmutables
├── focus.md                  ← Operacional: dirección actual
├── now.md                    ← Operacional: estado de sesión
├── decisions/                ← Estratégico: ADRs
│   └── adr-NNN.md
└── work/                     ← Táctico: paquetes de trabajo
    └── YYYY-MM-DD-HH-MM-SS-nombre/
        ├── spec.md           ← Qué y por qué
        ├── plan.md           ← Cómo (tasks con checkboxes)
        └── lessons.md        ← Qué aprendimos
```

Sin LOG.md. Sin outputs/ estándar. Sin mezcla de niveles.

---

**Última actualización:** 2026-03-28
