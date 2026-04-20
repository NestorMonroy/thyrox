```yml
created_at: 2026-04-20 03:04:13
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Tasks Sintetizadas — Clusters F, G, H, I (T-047..T-073)

## Resumen

- 4 clusters procesados (F, G, H, I)
- 26 propuestas brutas extraídas (CRÍTICO y ALTO únicamente)
- 27 tasks finales después de deduplicación (1 fusión: H-01 + I-H01 → T-060)
- 8 CRÍTICO, 14 ALTO, 5 MEDIO

---

## Sección A — Bloques de task-plan listos para insertar

---

### Bloque 21 — Stop Hook: enforcement real

- [ ] T-047 Diseñar política de severidad en validate-session-close.sh
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F01, H-F02)
  - **Hallazgo:** Ambos scripts del Stop hook (`validate-session-close.sh` L116 y `stop-hook-git-check.sh` L39) retornan `exit 0` incondicionalmente. El hook detecta hasta 4 categorías de problemas reales pero no actúa sobre ninguno. El nombre "validate" implica enforcement que no existe.
  - Acción: Introducir dos clases de severidad en `validate-session-close.sh`: WARN (exit 0) para timestamps incompletos y agentes huérfanos con resultado recolectado; BLOCK (exit 2) para `current_work` apuntando a directorio inexistente e inconsistencia crítica de estado.
  - Archivo a modificar: `.claude/scripts/validate-session-close.sh`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-049 (normalizar formato `current_work` — el check de directorio inexistente depende del formato consistente)

- [ ] T-048 Crear hook PreToolUse Bash para validar Conventional Commits
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F05, Gap-2)
  - **Hallazgo:** No existe hook PreToolUse para `Bash(git commit *)`. La invariante I-005 (Conventional Commits) es puramente declarativa — ningún script la verifica en el flujo automatizado.
  - Acción: Crear `.claude/scripts/validate-commit-message.sh` que reciba el input del Bash tool call via stdin, extraiga el mensaje del commit del comando, valide contra regex de Conventional Commits (`^(feat|fix|refactor|docs|chore|test|perf)(\(.+\))?: .{1,72}$`), y retorne deny si no cumple.
  - Agregar entrada PreToolUse en `.claude/settings.json` con matcher `Bash(git commit*)`.
  - Archivos: `.claude/scripts/validate-commit-message.sh` (crear), `.claude/settings.json` (modificar)
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

---

### Bloque 22 — Sincronización de estado: stage y current_work

- [ ] T-049 Normalizar formato del valor `current_work` en now.md
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F07)
  - **Hallazgo:** `sync-wp-state.sh:25` produce `.thyrox/context/work/NOMBRE` (path relativo al repo root); `project-status.sh:44` espera `work/NOMBRE` (relativo a CONTEXT_DIR); `validate-session-close.sh:99` verifica con `[ -d "$CURRENT_WORK" ]` (relativo al cwd). Los tres scripts consumen `current_work` con convenciones distintas — inconsistencia estructural.
  - Acción: Decidir formato canónico (Opción A recomendada: path relativo al repo root `.thyrox/context/work/NOMBRE`). Actualizar los tres scripts para usar el mismo formato. Actualizar también `close-wp.sh` que consume `current_work` implícitamente via `sed`.
  - Archivos: `.claude/scripts/sync-wp-state.sh` (L25), `.claude/scripts/project-status.sh` (L44), `.claude/scripts/validate-session-close.sh` (L98-104), `.claude/scripts/close-wp.sh`
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

- [ ] T-050 Actualizar stage en now.md desde sync-wp-state.sh al cambiar WP
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F03)
  - **Hallazgo:** `sync-wp-state.sh` (PostToolUse Write) actualiza `current_work` en `now.md` pero nunca actualiza `stage:` ni `phase:` (L44-47 solo hacen `sed` sobre `current_work:` y `updated_at:`). El estado de fase se desincroniza silenciosamente cuando el agente escribe en un WP sin actualizar el stage manualmente.
  - Acción: Cuando `sync-wp-state.sh` detecta cambio de `current_work`, agregar campo `stage_sync_required: true` en `now.md` para que `session-start.sh` lo detecte y alerte al agente sobre la necesidad de sincronizar el stage explícitamente.
  - Archivo a modificar: `.claude/scripts/sync-wp-state.sh`
  - **Prioridad:** CRÍTICO
  - **Depende de:** T-049 (normalizar `current_work` primero)

- [ ] T-051 Agregar lint-agents.py al hook SessionStart
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F13)
  - **Hallazgo:** `lint-agents.py` no está en ningún hook — es utilitario manual. Las invariantes I-007 (allowed-tools) e I-008 (description pattern) solo se verifican si el desarrollador lo corre manualmente. El script corre en <1s sobre 25 agentes.
  - Acción: Agregar segunda entrada en el hook SessionStart en `.claude/settings.json` que ejecute `python3 .claude/scripts/lint-agents.py` y filtre solo errores (no warnings). Usar `|| true` para que un fallo del linter no bloquee el inicio de sesión.
  - Archivo a modificar: `.claude/settings.json`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

---

### Bloque 23 — bound-detector: cobertura inglés

- [ ] T-052 Extender bound-detector.py con patrones en inglés
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F04)
  - **Hallazgo:** `UNBOUNDED_SIGNALS` y `BOUND_SIGNALS` solo detectan patrones en español (L16-38). Instrucciones como "analyze every file", "process each item", "review all agents" pasan sin detección. El 30-40% del vocabulario de instrucciones técnicas usa términos en inglés.
  - Acción: Agregar a `UNBOUNDED_SIGNALS`: `r"\bevery\b"`, `r"\beach\b"`, `r"\ball\b"`, `r"\bprocess all\b"`, `r"\bread all\b"`, `r"\banalyze all\b"`, `r"\bfor each\b"`, `r"\bfor every\b"`. Agregar a `BOUND_SIGNALS`: `r"\bmaximum\b"`, `r"\bmax\b"`, `r"\bonly these\b"`, `r"\bno more than\b"`, `r"\bfirst \d+\b"`, `r"\btop \d+\b"`, `r"\bat most\b"`.
  - Archivo a modificar: `.claude/scripts/bound-detector.py`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

---

### Bloque 24 — Workflow skill anatomy: assets y rutas

- [ ] T-053 Crear workflow-structure/assets/document.md.template
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-002)
  - **Hallazgo:** `workflow-structure/SKILL.md` L51 declara `"Para docs técnicos sin template específico: assets/document.md.template"` como instrucción de ejecución directa. El archivo no existe en `workflow-structure/assets/`. El agente no puede seguir la instrucción literal.
  - Acción: Crear template con metadata estándar WP + secciones genéricas para documentos técnicos sin tipo específico (objetivo, contexto, decisión, impacto, referencias).
  - Archivo a crear: `.claude/skills/workflow-structure/assets/document.md.template`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-054 Crear workflow-implement/assets/error-report.md.template
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-005)
  - **Hallazgo:** `workflow-implement/SKILL.md` L82 instruye explícitamente `"crear context/errors/ERR-NNN-descripcion.md usando assets/error-report.md.template"`. El template no existe en `workflow-implement/assets/`. Sin él, el agente crea ERR-NNN sin estructura consistente.
  - Acción: Crear template con campos: descripción del error, contexto, tarea que falló, approach intentado, resultado, siguiente approach propuesto.
  - Archivo a crear: `.claude/skills/workflow-implement/assets/error-report.md.template`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-055 Resolver inconsistencia de ruta para requirements-spec en workflow-structure
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-003)
  - **Hallazgo:** Las instrucciones de creación (L40, L45) indican `work/../{nombre-wp}-requirements-spec.md` pero los exit criteria (L80, L84) verifican `work/.../design/*-requirements-spec.md`. Un agente que sigue las instrucciones y verifica los exit criteria concluirá erróneamente que Phase 7 no completó. Además, workflow-decompose/SKILL.md L24 consume el output de Phase 7 — la ruta ambigua rompe la cadena inter-stages.
  - Acción: Decidir ubicación canónica (`design/` es consistente con el stage-directory estándar THYROX). Actualizar L40, L45 y L80, L84 de `workflow-structure/SKILL.md` para coherencia. Verificar y actualizar si es necesario `workflow-decompose/SKILL.md` L24.
  - Archivos: `.claude/skills/workflow-structure/SKILL.md` (L40, L45, L80, L84), `.claude/skills/workflow-decompose/SKILL.md` (L24 si aplica)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-056 Unificar validate-session-close.sh en workflow-track y workflow-standardize
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-006)
  - **Hallazgo:** Phase 11 ejecuta `workflow-track/scripts/validate-session-close.sh` (versión antigua: verifica focus.md + phase + commits + placeholders). Phase 12 ejecuta `.claude/scripts/validate-session-close.sh` (versión actual: verifica timestamps + agentes huérfanos + consistencia now.md). Las validaciones son distintas e incompatibles — una puede pasar lo que la otra rechaza.
  - Acción: Eliminar `workflow-track/scripts/validate-session-close.sh` y actualizar `workflow-track/SKILL.md` L27 para invocar `.claude/scripts/validate-session-close.sh` (la versión global actual). Verificar que la versión global cubre los casos que la local verificaba.
  - Archivos: `.claude/skills/workflow-track/SKILL.md` (L27), `.claude/skills/workflow-track/scripts/validate-session-close.sh` (eliminar)
  - **Prioridad:** ALTO
  - **Depende de:** T-047 (la versión global de validate-session-close.sh será modificada — unificar después de definir la política de severidad)

- [ ] T-057 Agregar Write/Edit a allowed-tools de workflow-structure, workflow-decompose, workflow-track
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-008)
  - **Hallazgo:** Los tres skills instruyen creación de archivos en sus fases (workflow-structure L40-46, workflow-decompose L38-41, workflow-track L39-63) pero no declaran `Write` ni `Edit` en `allowed-tools`. workflow-pilot, workflow-implement y workflow-standardize sí los declaran. La inconsistencia puede causar comportamiento restrictivo en contextos donde los tools se filtran.
  - Acción: Agregar `Write Edit` al campo `allowed-tools` en el frontmatter de los tres SKILL.md.
  - Archivos: `.claude/skills/workflow-structure/SKILL.md` (L4), `.claude/skills/workflow-decompose/SKILL.md` (L4), `.claude/skills/workflow-track/SKILL.md` (L4)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [ ] T-058 Corregir label "Phase 2 SOLUTION_STRATEGY" en workflow-strategy
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-001)
  - **Hallazgo:** `workflow-strategy/SKILL.md` L32 tiene el encabezado de sección `## Fase a ejecutar: Phase 2 SOLUTION_STRATEGY`. El frontmatter, título y todas las demás referencias internas dicen correctamente "Phase 5". Un agente que infiera la fase activa desde ese encabezado obtendrá número incorrecto.
  - Acción: Corregir L32 a `## Fase a ejecutar: Phase 5 STRATEGY`.
  - Archivo a modificar: `.claude/skills/workflow-strategy/SKILL.md` (L32)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [ ] T-059 Crear workflow-decompose/assets/categorization-plan.md.template
  - **Fuentes:** cluster-g-workflow-anatomy-gaps.md (GAP-004)
  - **Hallazgo:** `workflow-decompose/SKILL.md` L55 declara `"Si hay >50 issues: usar assets/categorization-plan.md.template para categorizar primero"`. El template no existe. Condición de uso poco frecuente pero el template declarado es inexistente.
  - Acción: Crear template con estructura de categorización por tipo (feat/fix/refactor/docs/chore), prioridad (CRÍTICO/ALTO/MEDIO/BAJO) y dominio temático.
  - Archivo a crear: `.claude/skills/workflow-decompose/assets/categorization-plan.md.template`
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

---

### Bloque 25 — Agent quality: descripciones y desambiguación

- [ ] T-060 Crear .claude/ARCHITECTURE.md con inventario canónico de agentes
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-01), cluster-i-registry-adr-gaps.md (H-01)
  - **Hallazgo:** El archivo `.claude/ARCHITECTURE.md` no existe. El sistema tiene 27 agentes instalados sin documento de inventario canónico. No es posible detectar agentes zombies (instalados pero no registrados) ni agentes fantasmas (declarados pero no instalados). 18 de 27 agentes no tienen YML en registry — sin ARCHITECTURE.md no hay registro formal de su existencia ni función.
  - Acción: Crear `.claude/ARCHITECTURE.md` con tabla de agentes que incluya: nombre, función, tipo (coordinator/expert/analysis/infra), YML en registry (sí/no), origen (bootstrap/manual), y nota de solapamientos conocidos con otros agentes.
  - Archivo a crear: `.claude/ARCHITECTURE.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-061 Desambiguar descripciones de deep-dive y agentic-reasoning
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-04)
  - **Hallazgo:** Ambos agentes analizan artefactos buscando afirmaciones no sustentadas. `agentic-reasoning` es específico de THYROX y produce ratios de calibración; `deep-dive` aplica a cualquier artefacto. Para analizar un risk register de THYROX, ambos son candidatos válidos — el runtime puede elegir cualquiera o invocar ambos produciendo análisis duplicados.
  - Acción: Modificar descripción de `agentic-reasoning` para incluir: "Use when artifact IS a THYROX WP document (risk register, exit conditions, analysis, strategy) and the goal is calibration ratio + evidence gap report. For adversarial analysis of any artifact type, use deep-dive instead." Modificar descripción de `deep-dive` para excluir explícitamente el dominio de calibración THYROX de su trigger principal.
  - Archivos: `.claude/agents/agentic-reasoning.md`, `.claude/agents/deep-dive.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

- [ ] T-062 Corregir descripciones de mysql-expert y postgresql-expert
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-02)
  - **Hallazgo:** `mysql-expert` y `postgresql-expert` describen capacidades sin condición de invocación: "Tech-expert para MySQL..." solo enumera lo que sabe, no cuándo invocarlo. I-008 requiere patrón "Use when [condición]..." — sin él, tasa de auto-invocación cae al 56%.
  - Acción: Añadir como primer elemento de descripción: "Use when the user needs MySQL/PostgreSQL-specific help: schema design, query optimization, migrations, or debugging." Actualizar también los YML fuente en registry.
  - Archivos: `.claude/agents/mysql-expert.md`, `.claude/agents/postgresql-expert.md`, `.thyrox/registry/agents/mysql-expert.yml`, `.thyrox/registry/agents/postgresql-expert.yml`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-063 Desambiguar task-planner vs task-synthesizer
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-05)
  - **Hallazgo:** Un usuario que pide "crear un task-plan a partir de estos análisis" encaja en ambas descripciones. `task-planner` podría invocarse cuando se necesita consolidación, y `task-synthesizer` cuando se necesita planificación fresca.
  - Acción: Añadir a `task-planner`: "Use when starting fresh planning — no prior analysis outputs exist. If consolidating outputs from deep-dive or pattern-harvester agents, use task-synthesizer instead." Añadir a `task-synthesizer`: "Use only when consolidating existing agent analysis outputs (not for fresh planning — use task-planner for that)."
  - Archivos: `.claude/agents/task-planner.md`, `.claude/agents/task-synthesizer.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-064 Desambiguar deep-review vs pattern-harvester
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-06)
  - **Hallazgo:** Ambos leen múltiples archivos de un WP y producen análisis de hallazgos. Para un corpus de análisis en `discover/`, ambos son candidatos plausibles. El usuario puede recibir análisis de cobertura cuando necesita síntesis de patrones, o viceversa.
  - Acción: Clarificar en `deep-review`: "Use when checking coverage gaps between consecutive THYROX phases. For extracting actionable patterns from deep-dive or calibration files, use pattern-harvester." Clarificar en `pattern-harvester`: "Use only when processing already-analyzed files (deep-dive outputs, calibration reviews). For phase-to-phase coverage analysis, use deep-review."
  - Archivos: `.claude/agents/deep-review.md`, `.claude/agents/pattern-harvester.md`
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-065 Estandarizar descripciones multilinea de 14 coordinadores a una sola línea
  - **Fuentes:** cluster-h-agent-quality-gaps.md (H-03)
  - **Hallazgo:** Los 14 coordinadores de metodología usan descripción multilinea con "Usar cuando...". El runtime puede truncar descripciones multilinea al evaluar triggers — la condición de invocación quedaría fuera del campo analizado.
  - Acción: Convertir el bloque multilinea de cada coordinador a una sola línea comenzando con "Use when [usuario quiere X metodología]. Coordinator para [nombre metodología] — [qué orquesta]." Alcance: ba-, bpa-, cp-, dmaic-, lean-, pdca-, pm-, pps-, rm-, rup-, sp-, thyrox-coordinator (12 coordinadores con formato multilinea).
  - Archivos: `.claude/agents/ba-coordinator.md`, `.claude/agents/bpa-coordinator.md`, `.claude/agents/cp-coordinator.md`, `.claude/agents/dmaic-coordinator.md`, `.claude/agents/lean-coordinator.md`, `.claude/agents/pdca-coordinator.md`, `.claude/agents/pm-coordinator.md`, `.claude/agents/pps-coordinator.md`, `.claude/agents/rm-coordinator.md`, `.claude/agents/rup-coordinator.md`, `.claude/agents/sp-coordinator.md`, `.claude/agents/thyrox-coordinator.md`
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

---

### Bloque 26 — Registry pipeline: integridad y ADRs

- [ ] T-066 Instalar dependencias MCP o documentar pre-requisito en bootstrap.py
  - **Fuentes:** cluster-i-registry-adr-gaps.md (H-03)
  - **Hallazgo:** `faiss-cpu` y `sentence-transformers` no están instalados en el entorno. `thyrox-memory` MCP server falla al iniciar con `ModuleNotFoundError: No module named 'faiss'`. `bootstrap.py` no verifica ni advierte sobre estas dependencias — el MCP server queda inoperativo en entorno limpio sin error claro durante bootstrap.
  - Acción: Agregar en `bootstrap.py` función `check_python_deps()` que antes de registrar MCP servers en `.mcp.json` verifique con `importlib.util.find_spec()` si `faiss` y `sentence_transformers` están disponibles. Si no: imprimir `WARN: thyrox-memory requiere pip install faiss-cpu sentence-transformers — MCP server inoperativo hasta instalación` y omitir el registro del server.
  - Archivos: `.thyrox/registry/bootstrap.py` (nueva función L340-345 aprox.)
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

- [ ] T-067 Crear ADR para política de coordinators como artefactos estáticos
  - **Fuentes:** cluster-i-registry-adr-gaps.md (GAP-1, H-09)
  - **Hallazgo:** La decisión de que los coordinators NO se generan desde bootstrap.py y son mantenidos manualmente está documentada solo en el comentario de código `bootstrap.py` L46-67. Sin ADR, cualquier mantenedor puede intentar generarlos (rompiendo el sistema) o no saber cómo crear un nuevo coordinator correctamente. La política afecta onboarding y el proceso de agregar nuevas metodologías.
  - Acción: Crear `.thyrox/context/decisions/adr-coordinators-static-artifacts.md` documentando: (a) por qué coordinators no se generan desde bootstrap.py, (b) cómo crear un nuevo coordinator usando dmaic-coordinator.md como template base, (c) la convención de naming `{flow-id}-coordinator.md` y los casos que la violan (pm→pmbok, ba→babok).
  - Archivo a crear: `.thyrox/context/decisions/adr-coordinators-static-artifacts.md`
  - **Prioridad:** CRÍTICO
  - **Depende de:** independiente

- [ ] T-068 Corregir exit code de bootstrap.py en instalaciones con fallos
  - **Fuentes:** cluster-i-registry-adr-gaps.md (H-02, RP-3, RP-4)
  - **Hallazgo:** `main()` retorna exit code 0 incluso cuando hay `[FAIL]` en instalación de core agents o tech agents. El mensaje "Bootstrap completado" usa el conteo de todos los `.md` existentes, no solo los generados — si 0 agentes fueron generados exitosamente en esta ejecución, el resumen es idéntico a una instalación completa. Un pipeline CI que verifique el exit code obtiene falso positivo.
  - Acción: Trackear fallos en `install_core_agents()` (L241-263) e `install_tech_agent()` (L266-312). Distinguir "skip por ya-existe" (no-fallo) de "fail por no encontrado" (fallo real). Retornar exit code 1 desde `main()` si algún agente requerido falló. Ajustar el conteo final para mostrar solo agentes generados en esta ejecución vs. total en disco.
  - Archivo a modificar: `.thyrox/registry/bootstrap.py` (L241-263, L396-413, L425-429)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-069 Crear ADR para python-mcp como skill manual fuera del pipeline
  - **Fuentes:** cluster-i-registry-adr-gaps.md (GAP-2, H-04)
  - **Hallazgo:** `python-mcp.instructions.md` está listada en `CLAUDE.md` bajo "Generadas por `registry/_generator.sh`" cuando fue creada manualmente y no tiene template en el registry. Cualquier intento de actualizar el guideline buscará el template en el registry y no lo encontrará. La narrativa de "generado por registry" es performativa para este caso.
  - Acción: Crear `.thyrox/context/decisions/adr-python-mcp-manual-skill.md` documentando por qué python-mcp es infraestructura del framework y no un tech stack externo. Adicionalmente, agregar nota aclaratoria en `CLAUDE.md` bajo los `@imports` que distinga guidelines generadas (5) vs. manuales (python-mcp).
  - Archivos: `.thyrox/context/decisions/adr-python-mcp-manual-skill.md` (crear), `.claude/CLAUDE.md` (nota en sección @imports)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

- [ ] T-070 Agregar verificación de output no-vacío en _generator.sh
  - **Fuentes:** cluster-i-registry-adr-gaps.md (H-08)
  - **Hallazgo:** Si el contenido entre marcadores `SKILL_START/SKILL_END` está vacío (marcadores presentes sin contenido entre ellos), `awk` produce archivo vacío sin error. `_generator.sh` reporta `[GREEN] Generated` con archivos vacíos porque `awk` siempre retorna exit 0.
  - Acción: Después de las líneas L136-137 (redirecciones de output), agregar: `[ -s "$SKILL_FILE" ] || { echo -e "${RED}ERROR: $SKILL_FILE generado vacío${NC}" >&2; exit 1; }` y equivalente para `$INSTRUCTIONS_FILE`.
  - Archivo a modificar: `.thyrox/registry/_generator.sh` (L138, inserción)
  - **Prioridad:** ALTO
  - **Depende de:** independiente

---

### Bloque 27 — Correcciones de scripts: fallos silenciosos y consistencia

- [ ] T-071 Agregar exit 0 explícito al final de sync-wp-state.sh
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F11)
  - **Hallazgo:** `sync-wp-state.sh` no tiene `exit 0` explícito al final (L57 es el último comando — el append a `phase-history.jsonl`). Si el append falla (permisos, directorio inexistente), el PostToolUse hook retorna exit 1. El comportamiento de Claude Code ante un PostToolUse con exit 1 no está documentado — puede interrumpir la operación Write.
  - Acción: Agregar `exit 0` explícito como última línea del script para garantizar que la actualización exitosa de `now.md` no sea opacada por el fallo del append al historial.
  - Archivo a modificar: `.claude/scripts/sync-wp-state.sh`
  - **Prioridad:** MEDIO
  - **Depende de:** T-049 (el script sync-wp-state.sh se modifica en T-049 también — consolidar edición)

- [ ] T-072 Corregir branch hardcodeado en update-state.sh
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F09)
  - **Hallazgo:** `update-state.sh` L81 tiene hardcodeado `**Branch activo:** \`claude/check-merge-status-Dcyvj\``. El script se presenta como "Regenera project-state.md desde el estado real del repo" pero el branch es incorrecto en cualquier sesión que no esté en ese branch específico.
  - Acción: Reemplazar el valor hardcodeado con `$(git branch --show-current 2>/dev/null || echo "unknown")` en la línea de generación de project-state.md.
  - Archivo a modificar: `.claude/scripts/update-state.sh` (L81)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

- [ ] T-073 Corregir inconsistencia de maxdepth en búsqueda de task-plan
  - **Fuentes:** cluster-f-hooks-scripts-gaps.md (H-F06)
  - **Hallazgo:** `session-start.sh:61` usa `find "$WP_DIR" -maxdepth 2 -name "*-task-plan.md"` (encuentra task-plan en subdirectorios como `plan-execution/`). `session-resume.sh:65` usa `maxdepth 1` — no encuentra task-plan si está en subdirectorio. La "próxima tarea" reportada difiere entre inicio de sesión y post-compactación para el WP actual.
  - Acción: Cambiar `maxdepth 1` a `maxdepth 2` en `session-resume.sh:65` para consistencia con `session-start.sh`.
  - Archivo a modificar: `.claude/scripts/session-resume.sh` (L65)
  - **Prioridad:** MEDIO
  - **Depende de:** independiente

---

## Sección B — DAG adicional

```
T-047 ← T-049           (validate-session-close usa current_work — normalizar primero)
T-050 ← T-049           (sync-wp-state modifica now.md — normalizar formato primero)
T-056 ← T-047           (unificar validate-session-close.sh después de definir política)
T-071 ← T-049           (sync-wp-state.sh se modifica en T-049 — editar en la misma pasada)

T-048  independiente
T-051  independiente
T-052  independiente
T-053  independiente
T-054  independiente
T-055  independiente
T-057  independiente
T-058  independiente
T-059  independiente
T-060  independiente
T-061  independiente
T-062  independiente
T-063  independiente
T-064  independiente
T-065  independiente
T-066  independiente
T-067  independiente
T-068  independiente
T-069  independiente
T-070  independiente
T-072  independiente
T-073  independiente
```

**Orden topológico de ejecución sugerido:**

1. Sin dependencias (ejecutables en cualquier orden): T-048, T-051, T-052, T-053, T-054, T-055, T-057, T-058, T-059, T-060, T-061, T-062, T-063, T-064, T-065, T-066, T-067, T-068, T-069, T-070, T-072, T-073
2. T-049 (base para el grupo de sincronización)
3. T-047 y T-050 (dependen de T-049; ejecutables en paralelo entre sí)
4. T-071 (puede consolidarse con T-049 en una sola edición de sync-wp-state.sh)
5. T-056 (depende de T-047)

---

## Sección C — Hallazgos descartados

| Hallazgo | Cluster | Razón de descarte |
|----------|---------|-------------------|
| H-F08: COMMANDS_SYNCED=true hardcodeado en session-start.sh | F | MEDIO — la rama else nunca ejecuta pero el impacto es solo informativo (muestra texto incorrecto en una línea de UI). TD-008 mencionado en el código sugiere que es deuda técnica ya registrada; no justifica task nueva sin conocer estado de TD-008. |
| H-F10: context-audit.sh selecciona WP por timestamp filesystem | F | MEDIO — utilitario manual sin hook. El comportamiento es sub-óptimo pero no genera estado corrupto. La corrección (leer now.md en lugar de `ls -t`) es deseable pero no bloquea ningún flujo crítico. |
| H-F12: close-wp.sh no hace cleanup si mv falla | F | BAJO — fallo poco frecuente (requiere fallo de mv sobre un tmp file). Sin efectos en estado del sistema salvo archivo .tmp huérfano. |
| H-F14: session-start.sh no verifica consistencia de now.md antes de inyectar | F | MEDIO — el análisis señala que la verificación ocurre al cierre, no al inicio. El problema existe pero T-047 (policy en validate-session-close) es el abordaje correcto; agregar verificación en session-start sería redundante hasta tener T-047 implementado. Candidato para siguiente ciclo. |
| H-F15: bound claro + unbounded signal → allow | F | MEDIO — caso de borde ("read 3 files then process everything"). La lógica actual prioriza el bound claro. Cambiar este comportamiento requiere rediseño de la lógica de scoring, no solo añadir patrones. Riesgo de falsos negativos alto. Candidato para evaluación post-T-052. |
| GAP-007 (workflow-track L35: "Phase 7" residual) | G | BAJO — "Phase 7 es single-agent por diseño" cuando debería decir "Phase 11". Impacto operacional mínimo — es un comentario de diseño dentro del SKILL.md, no una instrucción de ejecución. |
| H-07: deep-dive sin criterio de terminación | H | MEDIO — el análisis es correcto pero la solución (definir criterio de suficiencia) requiere decisión de diseño sobre qué constituye "análisis suficiente" en deep-dive. No es un fix de una línea. Candidato para ADR separado. |
| H-08: 18 agentes sin YML en registry | H | MEDIO — el hallazgo está cubierto parcialmente por T-060 (ARCHITECTURE.md que documenta el estado) y T-067 (ADR que registra la política). Crear 18 YMLs de respaldo para agentes estáticos no agrega valor si la política dice que son manuales. |
| H-09: deep-dive descripción larga — riesgo de truncamiento | H | BAJO — riesgo latente pero no confirmado. La descripción funciona actualmente. T-061 (desambiguar deep-dive/agentic-reasoning) implica revisar la descripción — si resulta demasiado larga, acortarla en esa misma tarea. |
| H-10: tech-experts con MCP tools sin fallback | H | BAJO — degradación silenciosa es real pero el scope de la solución (declarar fallback en cada expert) no está claro. No hay mecanismo en el formato de agentes para declarar fallback explícito. |
| H-11: umbral 0.75 en agentic-reasoning no derivado de datos | H | BAJO — hipótesis útil no derivada. Cambiar el umbral requiere datos empíricos que no existen. Documentar en el body del agente que es hipótesis de trabajo es lo correcto, pero es BAJO impacto. |
| GAP-3/H-11: naming mismatch pmbok→pm / babok→ba | I | MEDIO — inconsistencia real pero no rompe funcionalidad. `routing-rules.yml` usa los nombres correctos. La inconsistencia con la convención declarada en bootstrap.py es una deuda de documentación cubierta por T-067 (que menciona los casos que violan la convención de naming). |
| H-06/DEP-2: paths relativos en .mcp.json | I | ALTO — válido pero fuera del scope de calibración. El problema (paths relativos asumiendo cwd) es una limitación del mecanismo MCP de Claude Code, no un bug de los scripts THYROX. Documentar el supuesto en un README es deseable pero no crítico para el WP actual. |
| H-13/DEP-3: python sin versión mínima en .mcp.json | I | MEDIO — real pero el impacto es solo en entornos con Python <3.10 (poco frecuente en desarrollo activo). T-066 (check de dependencias en bootstrap) es el abordaje principal para el entorno MCP. |
| H-06/DEP-4: awk y sed asumidos en PATH | I | BAJO — entornos sin awk/sed son excepcionales. set -euo pipefail detectaría la ausencia con error aunque críptico. |
| H-06/H-07: bug `action` siempre "sobreescrito" + docstring incorrecto | I | BAJO — cosmético. El bug produce log incorrecto ("sobreescrito" vs "creado") pero no afecta el archivo generado. El docstring incorrecto es solo documentación. |
```
