```yml
created_at: 2026-04-19 17:29:12
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — DIAGNOSE
author: deep-dive
status: Borrador
version: 1.0.0
veredicto_síntesis: PARCIALMENTE SÓLIDO
saltos_lógicos: 7
contradicciones: 6
engaños_estructurales: 4
```

# Deep-Dive Adversarial — Motor THYROX: ¿Sólido o No?

**Pregunta central:** ¿El motor actual de THYROX funciona como afirma que funciona?
**Artefactos analizados:** 14 archivos primarios + verificaciones cruzadas en disco.

---

## VEREDICTO GLOBAL

**PARCIALMENTE SÓLIDO**

Criterio operacional: SÓLIDO = los mecanismos core funcionan como el sistema afirma. FRÁGIL = hay fallos silenciosos o engaños estructurales que invalidan claims centrales. PARCIALMENTE SÓLIDO = la infraestructura de hooks funciona, el SKILL describe el proceso correctamente, pero hay 3 áreas con divergencia verificable entre lo declarado y lo real: (1) el registro de agentes no es la fuente de verdad que afirma ser, (2) las guidelines tienen carga no verificada, (3) la arquitectura documentada no coincide con lo implementado.

---

## SCORE POR DIMENSIÓN

| Dimensión | Score | Veredicto |
|-----------|-------|-----------|
| 1 — Hooks (infraestructura) | 4/5 | SÓLIDO con 1 gap |
| 2 — Skill activation (metodología) | 3/5 | PARCIALMENTE SÓLIDO |
| 3 — State management (persistencia) | 4/5 | SÓLIDO con 1 gap |
| 4 — Guidelines (directivas activas) | 2/5 | FRÁGIL |
| 5 — Registry y agentes | 2/5 | FRÁGIL |
| 6 — Deuda técnica activa | 3/5 | MIXTO |

---

## CAPA 1: Lectura inicial — qué afirma el sistema

El sistema THYROX afirma:

1. **Hooks:** 5 eventos de hook (SessionStart, Stop x2, PostCompact, PreToolUse, PostToolUse) automatizan contexto, validación y estado.
2. **Skill activation:** el thyrox SKILL guía la ejecución de 12 stages. Si el Skill tool no está disponible, CLAUDE.md es el fallback.
3. **State management:** `now.md` es la fuente de verdad de estado; `sync-wp-state.sh` lo actualiza deterministicamente.
4. **Guidelines:** 6 archivos `.instructions.md` en `.thyrox/guidelines/` están "siempre activos" vía `@imports` en CLAUDE.md.
5. **Registry:** `.thyrox/registry/` es "la fuente de verdad del sistema. Todo lo que aparece en `.claude/agents/` y `.thyrox/guidelines/` se genera a partir de él" (ARCHITECTURE.md:99-100).
6. **Invariantes:** I-001..I-011 en `thyrox-invariants.md` cargan "incondicionalmente en cada sesión" (I-009).

---

## CAPA 2: Aislamiento de capas

### Frameworks teóricos
- El ciclo de 12 stages THYROX es una metodología propia bien documentada en SKILL.md.
- Los 11 namespaces metodológicos (pdca, dmaic, rup, etc.) son frameworks establecidos correctamente referenciados.
- El hook system es infraestructura real de Claude Code documentada en hook-output-control.md.

### Aplicaciones concretas
- La aplicación de hooks a los scripts es verificable: settings.json + scripts leídos.
- El claim "fuente de verdad" del registry requiere verificación en disco — y falla (ver Capa 4).

### Números específicos
- "23 agentes" — project-state.md:21. FALSO: hay 25 en `.claude/agents/`.
- "3 hooks" — ARCHITECTURE.md:124 ("THYROX usa 3 hooks"). FALSO: hay 6 hooks configurados.
- "56% éxito rate sin patrón Use when..." — I-008. Sin fuente empírica citada. INCIERTO.
- "11 coordinators" — ARCHITECTURE.md tabla:77-88. Los 11 YML de metodología existen en registry/methodologies/ (verificado). VERDADERO.

### Afirmaciones de garantía
- "Todo lo que aparece en `.claude/agents/` se genera a partir de él [registry]" — ARCHITECTURE.md:100. FALSO: 16 de 25 agentes no tienen YML en el registry.
- "@imports siempre activos" — CLAUDE.md:79-86. INCIERTO: TD-040 documenta que esto no fue verificado.
- "I-001..I-011 cargan incondicionalmente" — I-009. VERDADERO para el mecanismo de `.claude/rules/`, INCIERTO para la efectividad real del enforcement.

---

## CAPA 3: Saltos lógicos

```
SALTO-01: [Registry es fuente de verdad] → [.claude/agents/ se genera desde él]
Ubicación: ARCHITECTURE.md:99-100
Tipo: conclusión especulativa — el claim no está derivado, es declarativo
Tamaño: CRÍTICO
Evidencia contraria: 16 de 25 agentes en .claude/agents/ no tienen YML en registry.
  Los agentes instalados sin YML: agentic-reasoning, ba-coordinator, bpa-coordinator,
  cp-coordinator, deep-dive, deep-review, diagrama-ishikawa, dmaic-coordinator,
  lean-coordinator, pdca-coordinator, pm-coordinator, pps-coordinator, rm-coordinator,
  rup-coordinator, sp-coordinator, thyrox-coordinator.
  Estos 16 no pueden haber sido "generados por el registry" si no tienen YML fuente.
Justificación faltante: ¿cómo se instalaron estos 16? ¿Son manuales? ¿Hay un flujo
  distinto de bootstrap.py para coordinators? ARCHITECTURE.md no documenta la distinción.
```

```
SALTO-02: [@imports en CLAUDE.md] → [guidelines siempre activas]
Ubicación: CLAUDE.md:77-86, TD-040
Tipo: extrapolación sin datos
Tamaño: CRÍTICO
Evidencia: TD-040 confirma que "nunca se verificó que el mecanismo de carga funcione
  en sesiones reales" (technical-debt.md, TD-040:427-431). El estado es "[-] En progreso —
  @imports agregados en CLAUDE.md (FASE 36), verificación pendiente".
  El mecanismo @path para .instructions.md no está documentado como "verificado en producción".
Justificación faltante: Una sesión de prueba donde Claude aplique reglas de Node.js
  sin instrucción explícita.
```

```
SALTO-03: [Locked Decisions en CLAUDE.md] → [enforced por mecanismos reales]
Ubicación: CLAUDE.md:12-28 (sección Locked Decisions)
Tipo: analogía sin derivación
Tamaño: medio
Evidencia: Las 7 Locked Decisions son texto declarativo. No hay ningún hook, script
  ni validación que detecte violaciones. Un Claude que ignora LD-1 (ANALYZE first)
  no genera ninguna alerta del sistema.
Justificación faltante: Cualquier mecanismo de enforcement distinto de instrucción
  de texto — hook PreToolUse que detecte plan sin WP activo, validate-session-close.sh
  que verifique discover/ antes de permitir close.
```

```
SALTO-04: [ARCHITECTURE.md dice "THYROX usa 3 hooks"] → [el sistema tiene 3 hooks]
Ubicación: ARCHITECTURE.md:124, tabla 126-130
Tipo: afirmación de garantía sin base
Tamaño: medio
Evidencia: settings.json tiene 6 hooks (SessionStart×1, Stop×2, PostCompact×1,
  PreToolUse×1, PostToolUse×1). ARCHITECTURE.md documenta solo 3 (SessionStart,
  PostCompact, Stop×1 — git-check). Omite completamente: validate-session-close.sh,
  bound-detector.py (PreToolUse), sync-wp-state.sh (PostToolUse).
Justificación faltante: Actualización de ARCHITECTURE.md para reflejar el estado real.
```

```
SALTO-05: [I-007 "allowed-tools en cada skill"] → [2pts de 14 en quality gate]
Ubicación: thyrox-invariants.md:64-67
Tipo: notación formal encubriendo especulación
Tamaño: medio
Evidencia: El "quality gate (2pts de 14)" no tiene referencia a ningún documento de
  quality gate. No existe ningún archivo de evaluación de skills con ese criterio
  verificable en el repo. El "14" y el "2" son números sin fuente.
Justificación faltante: El documento de quality gate que define los 14 criterios.
```

```
SALTO-06: [bound-detector.py detecta "instrucciones sin bound"] → [protege agentes]
Ubicación: settings.json:78-85, bound-detector.py
Tipo: aplicación correcta pero con gap de cobertura no declarado
Tamaño: medio
Evidencia: bound-detector.py opera correctamente para el Agent tool. Pero su UNBOUNDED_SIGNALS
  lista (líneas 16-23) usa patrones en español exclusivamente, con una excepción: "read ALL"
  y "leer todos". Instrucciones en inglés con patrones como "process all", "analyze every",
  "check each" no son detectadas. El sistema afirma proteger contra unbounded agents pero
  el detector tiene cobertura parcial en inglés.
Justificación faltante: Documentación del scope de detección (solo español + 2 inglés).
```

```
SALTO-07: [validate-session-close.sh Check 3 detecta WPs activos] → [estado consistente]
Ubicación: validate-session-close.sh:66-105
Tipo: extrapolación sin datos
Tamaño: medio
Evidencia: El script usa un criterio específico: WP activo = sin lessons-learned.md Y con
  tareas pendientes en task-plan. WPs en stages 1-7 (sin task-plan todavía) nunca serán
  detectados como activos aunque lo estén. Un WP en Stage 3 ANALYZE sin task-plan pasaría
  el check incorrectamente como "sin WPs activos".
Justificación faltante: El criterio debería ser: WP activo = directorio existe sin
  lessons-learned.md (independiente de task-plan).
```

---

## CAPA 4: Contradicciones

```
CONTRADICCIÓN-01:
Afirmación A: "Todo lo que aparece en `.claude/agents/` y `.thyrox/guidelines/` se genera
  a partir de él [registry]" (ARCHITECTURE.md:99-100)
Afirmación B: 16 de 25 agentes en .claude/agents/ no tienen YML correspondiente en
  .thyrox/registry/agents/. Los verificados: agentic-reasoning.md, ba-coordinator.md,
  bpa-coordinator.md, cp-coordinator.md, deep-dive.md, deep-review.md,
  diagrama-ishikawa.md, dmaic-coordinator.md, lean-coordinator.md, pdca-coordinator.md,
  pm-coordinator.md, pps-coordinator.md, rm-coordinator.md, rup-coordinator.md,
  sp-coordinator.md, thyrox-coordinator.md — sin YML en registry.
Por qué chocan: Si el registry es la fuente de verdad y bootstrap.py genera los agentes,
  no pueden existir 16 agentes sin YML fuente, a menos que hayan sido instalados manualmente.
Cuál prevalece: B. El disco no miente. El claim de ARCHITECTURE.md es FALSO para 16/25
  agentes (64% del total).
```

```
CONTRADICCIÓN-02:
Afirmación A: "THYROX usa 3 hooks" con tabla de 3 entradas (ARCHITECTURE.md:124-130)
Afirmación B: settings.json tiene 5 eventos de hook con 6 scripts totales.
  Hooks documentados: SessionStart (session-start.sh), PostCompact (session-resume.sh),
  Stop (stop-hook-git-check.sh).
  Hooks NO documentados en ARCHITECTURE.md: Stop (validate-session-close.sh),
  PreToolUse (bound-detector.py), PostToolUse (sync-wp-state.sh).
Por qué chocan: La documentación de arquitectura omite 3 de 6 hooks operativos.
  Los 3 omitidos incluyen bound-detector.py (seguridad de agentes) y sync-wp-state.sh
  (persistencia de estado) — ambos son funcionalidad core, no auxiliar.
Cuál prevalece: B. Los hooks existen y están activos. ARCHITECTURE.md está desactualizado.
```

```
CONTRADICCIÓN-03:
Afirmación A: "23 agentes nativos" — project-state.md:21, con lista de 23
Afirmación B: 25 archivos .md en .claude/agents/ (verificado: ls | wc -l = 25)
Por qué chocan: project-state.md fue generado por update-state.sh o editado manualmente
  en un momento donde había 23 agentes. Dos agentes fueron agregados posteriormente sin
  actualizar el dashboard: agentic-reasoning.md y deep-dive.md (ambos visibles en ls).
Cuál prevalece: B. El disco tiene 25.
```

```
CONTRADICCIÓN-04:
Afirmación A: "model: PROHIBIDO — bootstrap.py no lo propaga a agentes nativos"
  (registry/agents/README.md)
Afirmación B: task-executor.yml tiene `model: claude-sonnet-4-6` en línea 6
  (verificado directamente).
  Además: nodejs-expert.yml, react-expert.yml, webpack-expert.yml, postgresql-expert.yml,
  mysql-expert.yml también tienen model: (mencionado en TD-037).
Por qué chocan: La spec del registry dice PROHIBIDO pero 6 de 9 YMLs lo tienen.
  El registro de TD-037 documenta el problema pero sigue sin resolver (estado: Pendiente).
Cuál prevalece: La spec del README es la declaración de intención (VERDADERO como
  intención), pero los YMLs actuales violan esa intención (VERDADERO como realidad).
  Coexisten — el sistema tiene inconsistencia interna documentada sin resolver.
```

```
CONTRADICCIÓN-05:
Afirmación A: "close-wp.sh NO es un hook. Es un script de cierre manual del WP"
  (ARCHITECTURE.md:131-133)
Afirmación B: close-wp.sh existe en .claude/scripts/ (verificado en ls de scripts).
  ARCHITECTURE.md lo describe como script que "Resetea now.md y llama a update-state.sh".
  Pero project-state.md:83-84 listas update-state.sh como un script de gestión, mientras
  que ARCHITECTURE.md describe close-wp.sh como el que llama a update-state.sh.
Por qué chocan: No es contradicción interna mayor — pero ARCHITECTURE.md documenta
  close-wp.sh en el contexto de hooks, creando confusión sobre si es parte del sistema
  de hooks o no. La distinción "NO es un hook" en el mismo párrafo sobre hooks revela
  que el límite no está claro ni en la documentación.
Cuál prevalece: Coexisten. Minor — no invalida funcionalidad.
```

```
CONTRADICCIÓN-06:
Afirmación A: SKILL.md:338-356 (Modelo de permisos) dice que "ADRs (.thyrox/context/decisions/**):
  Prompt (ask)" — requieren prompt de confirmación.
Afirmación B: settings.json no tiene ninguna regla "ask" para .thyrox/context/decisions/.
  El defaultMode es "acceptEdits" y los "ask" explícitos son solo:
  "Edit(/.claude/scripts/*.sh)" y "Edit(/.claude/settings.json)".
Por qué chocan: El SKILL documenta que ADRs requieren prompt, pero settings.json no
  configura ese comportamiento. En la práctica, un Claude con acceptEdits puede crear
  o modificar ADRs sin prompt.
Cuál prevalece: B (settings.json). La configuración real del sistema no implementa
  el gate documentado en SKILL.md para ADRs. El gate es declarativo, no técnico.
```

---

## CAPA 5: Engaños estructurales

| Patrón | Instancia | Efecto |
|--------|-----------|--------|
| **Credibilidad prestada** | ARCHITECTURE.md invoca el concepto de "fuente de verdad" (término de arquitectura de datos) aplicado al registry, sin que el registry cumpla el criterio técnico de fuente de verdad (no puede haber datos en el destino sin origen en la fuente). 64% de los agentes no tienen origen en el registry. | Crea apariencia de arquitectura coherente cuando la realidad es un sistema híbrido sin regla clara. |
| **Notación formal encubriendo especulación** | I-008 en thyrox-invariants.md: "Auto-invocación tiene 56% éxito rate sin este patrón". El número 56% aparece como dato empírico sin citar la fuente, el método de medición, ni el tamaño de muestra. | El 56% crea apariencia de calibración empírica. Es INCIERTO — puede ser observación informal, benchmark de terceros, o estimación. |
| **Limitación enterrada** | TD-040 documenta que los @imports de CLAUDE.md "nunca se verificó que el mecanismo de carga funcione en sesiones reales". Pero CLAUDE.md presenta los @imports bajo el título "Tech-stack guidelines — @imports / Directivas siempre activas". La limitación crítica vive en technical-debt.md:411-438, separada del claim de CLAUDE.md:79-86 sin conexión explícita. | Un lector de CLAUDE.md asume que las guidelines están activas. Solo quien lea TD-040 sabe que eso no está verificado. |
| **Profecía auto-cumplida** | El sistema documenta que I-001..I-011 "cargan incondicionalmente". Esto es verdad del mecanismo (.claude/rules/ carga siempre). Pero el sistema concluye que las invariantes son "enforcement" cuando son instrucciones de texto. El mecanismo de carga es real; el enforcement no lo es. La carga garantiza que Claude lee las reglas — no que las siga. | Crea apariencia de enforcement técnico cuando el enforcement es exclusivamente instrucción LLM. |

---

## CAPA 6: Veredicto

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente |
|-------|--------------------------|--------|
| SessionStart hook ejecuta session-start.sh | settings.json:41-50, session-start.sh existe y es ejecutable bash | settings.json:41-50 |
| Stop hooks ejecutan validate-session-close.sh y stop-hook-git-check.sh | settings.json:52-65, ambos scripts existen | settings.json:52-65 |
| PostCompact hook ejecuta session-resume.sh | settings.json:66-72, session-resume.sh existe | settings.json:66-72 |
| PreToolUse bloquea Agent calls sin bound | bound-detector.py implementa lógica de 4 pasos con deny correcto, settings.json matcher "Agent" | bound-detector.py:114-156, settings.json:76-84 |
| PostToolUse Write actualiza now.md via sync-wp-state.sh | sync-wp-state.sh implementación correcta, hook-output-control.md confirma tool_input.file_path en PostToolUse | sync-wp-state.sh + hook-output-control.md |
| validate-session-close.sh siempre exit 0 | línea 116: `exit 0 # Nunca bloquear Stop hook` — el Stop hook nunca se bloquea | validate-session-close.sh:116 |
| Los 6 hooks producen output de texto plano (no JSON estructurado) | Los scripts bash usan echo, no print(json.dumps(...)). Solo bound-detector.py usa JSON. | session-start.sh, validate-session-close.sh, stop-hook-git-check.sh, session-resume.sh |
| task-executor.yml viola la regla model: prohibido | `model: claude-sonnet-4-6` en línea 6 del YML | registry/agents/task-executor.yml:6 |
| 16 agentes en .claude/agents/ no tienen YML en registry | comm -13 de ls registry vs ls agents = 16 sin YML | verificación en disco |
| 11 YMLs de metodología existen en registry/methodologies/ | ls confirma babok.yml, bpa.yml, cp.yml, dmaic.yml, lean.yml, pdca.yml, pmbok.yml, pps.yml, rm.yml, rup.yml, sp.yml | registry/methodologies/ ls |
| routing-rules.yml existe | ls confirma archivo en .thyrox/registry/ | verificación en disco |
| I-001..I-011 cargan en cada sesión (mecanismo) | .claude/rules/ se carga automáticamente — confirmado por I-009 y la especificación de Claude Code | thyrox-invariants.md + claude-code-components.md |
| plugin.json existe en .claude-plugin/ | ls confirma plugin.json | .claude-plugin/plugin.json |
| now.md estado actual Stage 8 — PLAN EXECUTION | now.md:9 `stage: Stage 8 — PLAN EXECUTION` | .thyrox/context/now.md:9 |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia |
|-------|-----------------|------------------------|
| "Todo lo que aparece en .claude/agents/ se genera a partir del registry" (ARCHITECTURE.md:99-100) | 16 de 25 agentes no tienen YML en registry — no pueden haber sido generados desde una fuente inexistente | comm -13 resultado: 16 agentes sin YML |
| "THYROX usa 3 hooks" (ARCHITECTURE.md:124) | settings.json tiene 6 hooks en 5 eventos | python3 count: Total hooks: 6 |
| "23 agentes nativos" (project-state.md:21) | ls .claude/agents/ | wc -l = 25 | ls verificado |
| ADRs requieren "Prompt (ask)" (SKILL.md:344) | settings.json no configura ask para .thyrox/context/decisions/ — defaultMode acceptEdits aplica | settings.json:8 defaultMode + ausencia de regla ask para decisions/ |
| "model: PROHIBIDO" en registry YMLs (README:26) | 6 de 9 YMLs tienen model: (task-executor.yml verificado, resto documentado en TD-037) | task-executor.yml:6, TD-037 |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| "@imports en CLAUDE.md cargan guidelines como directivas activas" | TD-040 confirma que nunca fue verificado en sesión real. No existe evidencia de que Claude aplique las reglas de Node.js sin instrucción explícita. | Una sesión de prueba donde Claude rechace "lógica de negocio en handlers" sin instrucción adicional |
| "Auto-invocación tiene 56% éxito rate sin patrón Use when..." (I-008) | Ninguna fuente citada. No hay benchmark documentado en el repo. | Referencia al estudio o benchmark que produce ese número |
| "I-001..I-011 son enforcement" | El mecanismo de carga es real; pero las invariantes son instrucciones de texto que Claude puede ignorar. No existe prueba de que Claude las siga consistentemente. | Sesión de prueba donde se intente crear plan sin WP activo y el sistema lo detecte |
| El routing-rules.yml es usado por thyrox-coordinator en producción | routing-rules.yml existe pero no hay evidencia de que thyrox-coordinator lo lea activamente en sesiones reales | Sesión de prueba con problema de "waste" para verificar que activa lean-coordinator |
| El mecanismo de coordinator worktrees funciona (ARCHITECTURE.md:49 "isolation: worktree") | Ningún YML de agente en el registry incluye isolation: worktree. El claim en ARCHITECTURE.md no tiene respaldo en los agentes existentes. | Verificar los .md de coordinators en .claude/agents/ para isolation field |

### Patrón dominante

**Documentación declarativa de propiedades que el sistema no implementa técnicamente.**

El motor THYROX opera en tres capas que el sistema no distingue claramente:
1. **Infraestructura real** (hooks): funciona como se describe, con la excepción de que ARCHITECTURE.md omite 3 hooks.
2. **Estado semántico** (now.md, SKILL.md): funcionan correctamente como instrumentos de orientación LLM.
3. **Claims de arquitectura** (fuente de verdad, generación desde registry, enforcement de invariantes): no tienen implementación técnica verificable — son declaraciones de intención presentadas como hechos.

El patrón opera así: se cita la infraestructura real (hooks funcionando) como evidencia de que la arquitectura declarada es sólida, cuando las capas de "fuente de verdad" y "enforcement" son puramente textuales. Un sistema con 6 hooks que funcionan puede declarar que "el registry es la fuente de verdad" sin que nadie verifique que 64% de los agentes no tienen YML fuente.

---

## HALLAZGOS POR DIMENSIÓN

### Dimensión 1 — Hooks (infraestructura de automatización)

**Score: 4/5. Sólido con 1 gap de documentación y 1 gap de cobertura.**

Los 6 hooks configurados en settings.json funcionan correctamente para su propósito declarado:

- `session-start.sh` (SessionStart): lee now.md, extrae WP activo, phase, próxima tarea y tech skills. Output correcto de texto plano. **FUNCIONA.**
- `validate-session-close.sh` (Stop): 3 checks (timestamps, agentes huérfanos, consistencia now.md). Exit 0 siempre — no bloquea. **FUNCIONA.**
- `stop-hook-git-check.sh` (Stop): verifica cambios sin commitear, maneja stop_hook_active para prevenir loops. **FUNCIONA.**
- `session-resume.sh` (PostCompact): re-inyecta contexto si compact_summary no menciona el WP. **FUNCIONA.**
- `bound-detector.py` (PreToolUse, matcher Agent): 4-paso lógica de detección, JSON output correcto para permissionDecision. **FUNCIONA con cobertura parcial en inglés** (SALTO-06).
- `sync-wp-state.sh` (PostToolUse, matcher Write): extrae file_path, actualiza now.md, registra en phase-history.jsonl. **FUNCIONA.**

**Gap crítico:** ARCHITECTURE.md:124-130 documenta 3 hooks y omite 3. Quien lea ARCHITECTURE.md para entender el sistema tiene una visión incompleta de la automatización activa.

**Gap de output format:** Los hooks de bash producen texto plano (echo). hook-output-control.md:29-52 especifica JSON output para comportamientos controlados (suppressOutput, systemMessage, additionalContext). Los hooks de bash no usan este formato — producen mensajes visibles en UI pero sin control programático sobre la sesión. No es un fallo funcional (los scripts cumplen su propósito), pero limita la sofisticación posible.

---

### Dimensión 2 — Skill activation (metodología)

**Score: 3/5. Funciona como orientación, falla como enforcement.**

El SKILL.md (`thyrox`) es un documento de alta calidad que:
- Describe los 12 stages con claridad.
- Proporciona tabla de artefactos por fase con rutas y templates.
- Documenta el modelo de permisos (Plano A y Plano B).
- Incluye 47 references on-demand.
- Tiene description correcta con patrón "Use when".

**Lo que funciona:** La activación por descripción es plausible — SKILL.md:3 sigue el patrón I-008. Las instrucciones son procesables.

**Lo que no funciona como se afirma:**
- Los "Locked Decisions" de CLAUDE.md (CLAUDE.md:12-28) son texto, no enforcement. No hay PreToolUse que detecte violación de LD-1 ("ANALYZE first"). Un LLM que los ignore no genera alerta.
- El fallback "Si el Skill tool no está disponible: leer SKILL.md" (CLAUDE.md:109) asume que CLAUDE.md anuncia la ausencia del Skill tool — pero no hay ningún mecanismo que detecte esta condición. Es instrucción para Claude, no verificación automática.
- CONTRADICCIÓN-06: SKILL.md dice que ADRs requieren "Prompt (ask)" pero settings.json no lo configura. El Plano B documentado en SKILL.md no coincide con el Plano B implementado en settings.json.

---

### Dimensión 3 — State management (persistencia)

**Score: 4/5. Sólido con 1 gap en criterio de WP activo.**

`now.md` funciona correctamente: estado actual Stage 8 — PLAN EXECUTION, WP metodología-calibration correcto. El sync-wp-state.sh actualiza deterministicamente current_work cuando se escribe en .thyrox/context/work/**.

`validate-session-close.sh` Check 3 tiene un gap: un WP en stages 1-7 sin task-plan (que es la norma hasta Stage 8) no será detectado como activo por el criterio actual. El script usa:
```bash
task_plan=$(find "$wp_dir" -maxdepth 2 -name "*-task-plan.md" 2>/dev/null | head -1)
if [ -n "$task_plan" ] && grep -q "^- \[ \]" "$task_plan"
```
Un WP en Stage 3 ANALYZE (sin task-plan todavía) pasaría como "sin WPs activos" cuando sí está activo. Este es SALTO-07: el criterio real de "WP activo" debería ser "sin lessons-learned.md", no "con task-plan con tareas pendientes".

---

### Dimensión 4 — Guidelines (directivas activas)

**Score: 2/5. FRÁGIL.**

Los 6 archivos `.instructions.md` en `.thyrox/guidelines/` existen con contenido sustancial (693 líneas totales, 88-161 líneas por archivo). Los @imports en CLAUDE.md:81-86 usan rutas `@.thyrox/guidelines/{file}` — la ruta es correcta relativa a la raíz del proyecto.

**El problema central (TD-040):** "nunca se verificó que el mecanismo de carga funcione en sesiones reales" (technical-debt.md:427-430). Este TD lleva estado "En progreso" desde FASE 36. No hay evidencia documentada de que Claude aplique las reglas de `backend-nodejs.instructions.md` sin instrucción explícita.

**El riesgo concreto:** Si `@path` para `.instructions.md` fuera del directorio `.claude/` no funciona según la especificación de Claude Code, las 693 líneas de directivas no estarían activas. El sistema opera bajo el supuesto de que funcionan, sin haberlo verificado. TD-040 propone como solución migrar a `.claude/rules/` si falla — pero esa migración nunca fue ejecutada ni la verificación fue realizada.

**Impacto:** Si las guidelines no cargan, el stack técnico del proyecto (Node.js, React, PostgreSQL, MySQL, Webpack, Python MCP) opera sin directivas específicas, confiando solo en el conocimiento base del modelo.

---

### Dimensión 5 — Registry y agentes

**Score: 2/5. FRÁGIL.**

**El claim central está roto:** ARCHITECTURE.md:99-100 dice que el registry es "la fuente de verdad" y que todo en `.claude/agents/` "se genera a partir de él". La verificación muestra:

- Registry: 9 YMLs (task-executor, task-planner, tech-detector, skill-generator, nodejs-expert, react-expert, webpack-expert, postgresql-expert, mysql-expert).
- `.claude/agents/`: 25 archivos .md.
- Sin YML en registry: 16 agentes (64%).

Los 16 agentes sin YML incluyen TODOS los coordinators (11) y agentes core de análisis (deep-dive, deep-review, diagrama-ishikawa, agentic-reasoning). Estos no son agentes periféricos — son el core del sistema metodológico THYROX.

**Por qué ocurrió esto:** bootstrap.py solo puede procesar core agents (4 hardcodeados en CORE_AGENTS) y tech-experts (con patrón `{tech}-expert.yml`). Los coordinators y agentes de análisis fueron instalados manualmente en `.claude/agents/` sin crear YMLs fuente en el registry. El sistema creció por fuera del flujo declarado.

**TD-037 y TD-038:** Documentan problemas derivados de este estado:
- TD-037: 6 YMLs tienen `model:` prohibido — pendiente.
- TD-038: webpack-expert tiene YML pero fue instalado manualmente — inconsistencia de flujo.

**Adicionalmente:** plugin.json en `.claude-plugin/` declara `"agents": "../.claude/agents"` — apuntando correctamente. Pero la fuente de verdad del registry no es fuente de verdad para 16 de 25 agentes.

---

### Dimensión 6 — Deuda técnica activa

**Score: 3/5. Mixto — algunos TDs afectan funcionalidad core.**

| TD | Estado | Impacto en core |
|----|--------|-----------------|
| TD-010 | En progreso | BAJO — benchmark comparativo, no afecta operación |
| TD-037 | Pendiente | MEDIO — inconsistencia en spec vs YMLs. No falla en tiempo de ejecución (bootstrap.py ignora model:) pero indica descontrol del registry |
| TD-038 | Pendiente | BAJO — inconsistencia documental en webpack-expert |
| TD-039 | Pendiente | BAJO — riesgo de divergencia a largo plazo |
| TD-040 | En progreso | ALTO — si @imports no cargan, todo el stack técnico opera sin directivas |
| TD-041 | Pendiente | BAJO — gaps de referencia, no funcionalidad core |
| TD-042 | Pendiente | MEDIO — validate-session-close.sh no verifica PAT-004. Permite falso positivo de estado |

**TD con mayor riesgo de fallo silencioso:** TD-040 y TD-042.

- **TD-040:** Si guidelines no cargan → el sistema cree que las directivas están activas pero no lo están. El fallo es silencioso — ningún hook alerta sobre guidelines inactivas.
- **TD-042:** validate-session-close.sh puede reportar "sin problemas" cuando los checkboxes T-NNN marcados [x] no tienen commits correspondientes. El task-plan puede reflejar estado falso sin detección.

---

## RESUMEN EJECUTIVO

### Qué está verificadamente sólido

1. **Infraestructura de hooks:** Los 6 hooks funcionan correctamente. session-start.sh, validate-session-close.sh, stop-hook-git-check.sh, session-resume.sh, bound-detector.py, sync-wp-state.sh implementan su función declarada. Siempre exit 0 (nunca bloquean).
2. **now.md como estado:** El mecanismo de sincronización via PostToolUse Write → sync-wp-state.sh es determinístico y correcto. El estado actual del WP está bien representado.
3. **SKILL.md como guía metodológica:** El documento es de calidad, describe el proceso con precisión, tiene references on-demand y el patrón de descripción correcto para activación.
4. **Registry de metodologías:** 11 YMLs de metodología + routing-rules.yml existen y el sistema de coordinators tiene base real.
5. **plugin.json:** Existe y apunta correctamente a agents/ y skills/.

### Qué está verificadamente roto

1. **Claim "registry es fuente de verdad":** FALSO para 64% de los agentes. 16 agentes no tienen origen en el registry.
2. **Conteo de hooks en ARCHITECTURE.md:** 3 documentados vs 6 reales. ARCHITECTURE.md omite los 3 hooks más críticos para el comportamiento del sistema.
3. **Conteo de agentes:** 23 en project-state.md vs 25 en disco.
4. **Gate de ADRs:** SKILL.md dice "Prompt (ask)" para ADRs pero settings.json usa acceptEdits por defecto sin regla específica para decisions/.
5. **model: PROHIBIDO en registry:** 6 de 9 YMLs lo tienen — spec y realidad divergen sin corrección.

### Qué es incierto

1. **Efectividad de @imports para guidelines:** TD-040 lleva desde FASE 36 sin verificación. Puede ser que 693 líneas de directivas técnicas no estén activas en ninguna sesión.
2. **Enforcement real de invariantes:** Las invariantes se cargan (el mecanismo funciona), pero si Claude las cumple consistentemente es una propiedad del modelo, no del sistema.
3. **Cobertura del bound-detector en inglés:** El detector cubre español + 2 patrones inglés. Instrucciones en inglés con "process all", "check each" no son interceptadas.
4. **"56% éxito rate":** Número sin fuente verificable.

### El diagnóstico en una frase

El motor tiene infraestructura de hooks real y funcional, pero su arquitectura declarada (registry como fuente de verdad, enforcement de invariantes, guidelines siempre activas) es mayoritariamente texto aspiracional sin implementación técnica de respaldo. El sistema es operacionalmente funcional pero arquitectónicamente autodescriptivo — se describe a sí mismo con más solidez de la que tiene.
```
