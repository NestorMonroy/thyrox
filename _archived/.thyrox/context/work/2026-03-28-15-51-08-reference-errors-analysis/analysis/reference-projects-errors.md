```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
Fuente: 14 proyectos de referencia analizados
```

# Errores y Anti-Patterns de los 14 Proyectos de Referencia

Análisis de errores, debilidades y anti-patterns encontrados en cada proyecto.
Objetivo: NO cometer estos mismos errores en THYROX.

---

## Errores por Proyecto

### 1. spec-kit
| Lo bueno | Errores |
|----------|---------|
| Pipeline specify→plan→tasks→implement | Constitution como archivo separado que puede no leerse |
| Marcadores [NEEDS CLARIFICATION] | Archivos de 800+ líneas por comando — instruction bloat |
| Trazabilidad FR→Task→Checklist | Sin hooks de enforcement — depende de disciplina |
| | Sin session logs ni persistencia cross-sesión |

### 2. claude-pipe
| Lo bueno | Errores |
|----------|---------|
| Solo 2 docs (PRD + BUILD_SPEC) — overhead cero | Sin constitution, sin principios — todo implícito |
| Scope In/Out explícito | Sin trazabilidad (ni ADRs, ni error tracking) |
| | Sin enforcement de ningún tipo |
| | Metodología no transferible — específica de un proyecto |
| | Sin tracking más allá de checkboxes |

### 3. claude-mlx-tts
| Lo bueno | Errores |
|----------|---------|
| Documentación por audiencia (6 capas) | Plugin-específico — no transfiere a otros proyectos |
| CLAUDE.md como AI contract | Pre-autorización de tools es específica de plugins |
| Hooks como enforcement automático | Dependencia de Beads (tooling externo) |
| | Sin pipeline plan/spec |

### 4. oh-my-claude
| Lo bueno | Errores |
|----------|---------|
| STV (Spec-Trace-Verify) | Overhead alto — requiere MCP server infrastructure |
| Decision gate por switching cost | Dependencia multi-modelo (GPT-5.2 como Oracle) |
| Save/load cross-sesión | Sin CLAUDE.md estándar (usa plugins/) |
| Session logs via hooks | Ralph loops requieren infraestructura significativa |
| | Complejidad excesiva para uso individual |

### 5. conv-temp
| Lo bueno | Errores |
|----------|---------|
| 3-tier memory (essential/contextual/archive) | Requiere disciplina manual EXTREMA |
| Descubierto empíricamente (40 días) | Context pressure degrada con el tiempo |
| Transcripts inmutables | Pérdida de matices en compresión |
| | Depende de un solo maintainer — no escala |
| | Sin enforcement — puramente manual |
| | Sin formato estructurado para sesiones |

### 6. clawpal
| Lo bueno | Errores |
|----------|---------|
| 48 planes inmutables con fechas | 48 documentos en 14 días = proliferación sin cleanup |
| Design+implementation pairs | Sin constitution ni principios |
| TDD prescrito en planes | Sin enforcement — depende de disciplina |
| Observable behavior criteria | Sin persistencia de sesión |
| | Sin metadata (YAML frontmatter) en planes |

### 7. Cortex-Template
| Lo bueno | Errores |
|----------|---------|
| Layer 0-3 con KPI (<2000 líneas) | 90+ agentes = sobreingeniería masiva |
| Constitution inmutable con halt conditions | BSI claims solo para multi-instancia |
| focus.md + now.md para estado | brain-engine (SQLite+RAG) premature optimization |
| Scribe pattern (single writer) | 4 tiers de contexto cuando 2-3 bastan |
| PATHS.md anti-hallucination | Signals (SPAWN, RETURN) solo para multi-agente |
| | Workflows YAML no ejecutables sin tooling custom |

### 8. trae-agent
| Lo bueno | Errores |
|----------|---------|
| Sequential thinking como tool explícito | No es PM framework — requiere traducción |
| Trajectory recording automático | SWE-bench solo para code, no PM/docs |
| Agent loop con state machine | CKG requiere SQLite infrastructure |
| task_done tool con verificación | Sin persistencia cross-sesión |
| | Sin mecanismo de human handoff |

### 9. build-ledger
| Lo bueno | Errores |
|----------|---------|
| LOG.md append-only | Diseñado para multi-agente — overhead masivo para single-dev |
| Research "truths" verificadas | Consenso unánime (4/4) bloquea progreso |
| CLAIM/RELEASE locking | Locking solo necesario con agentes concurrentes |
| 10-section handoffs | Naming authority demasiado rígido para proyectos pequeños |
| | Depende de árbitro humano disponible |

### 10. agentic-framework
| Lo bueno | Errores |
|----------|---------|
| L-0002: instruction bloat kills compliance | Creció CLAUDE.md de 50→300 antes de descubrir L-0002 |
| 3-layer architecture | STATUS.md + TODO.md + BACKLOG.json = 3 sistemas que se solapan |
| HUMAN_NEEDED.md handoff | Multi-tool support añade mantenimiento |
| L-NNNN lessons con estructura | 16 pre-commit gates pueden ser excesivos |
| Graduated enforcement | Dialectical plan review añade tiempo |
| 626 tests como safety net | Directorio complejo requiere curva de aprendizaje |

### 11. almanack
| Lo bueno | Errores |
|----------|---------|
| Principios sobre procedimientos | No es framework — es knowledge base personal |
| CLAUDE.md como contrato vivo | Sin enforcement — puramente filosófico |
| Mental models numerados | "Cada corrección = nueva regla" → CLAUDE.md bloat |
| | Sin workflow estructurado ni fases |
| | Sin métricas de efectividad |
| | Models subjetivos sin validación |

### 12. ClaudeViewer
| Lo bueno | Errores |
|----------|---------|
| .serena/memories/ modular (20-50 líneas) | .serena/ es dependencia propietaria |
| spec→implPlan→ui pipeline | Requiere read/write/list_memories — tool-specific |
| CLAUDE.md corto y prescriptivo | Sin error tracking ni decision log |
| task_completion_checklist verificable | Sin persistencia cross-sesión propia |
| | Proyecto muy pequeño — escalabilidad no probada |

### 13. cc-warp
| Lo bueno | Errores |
|----------|---------|
| 5-layer orchestration system | **4,397 archivos** — complejidad masiva |
| Generic→specialized transformation | 9 agentes especializados solo en planning |
| Reference diaries (500+ líneas) | 5 capas de orquestación = sobreingeniería |
| 4 comandos de planning secuenciales | CLAUDE.md ~300 líneas — viola L-0002 |
| | **Mejor teoría de los 14, peor ratio teoría/resultado** |
| | Sin enforcement — todo conceptual |
| | foco_atual.md es filosófico, no operacional |

### 14. valet
| Lo bueno | Errores |
|----------|---------|
| .beans/ con YAML frontmatter | CLAUDE.md ~150 líneas — borderline largo |
| Triple system (beans+specs+plans) | depends_on puede crear deadlocks circulares |
| 9 locked decisions en CLAUDE.md | 40+ design+implementation pairs = mucho mantenimiento |
| V1/V2 versioned visions | V1 inmutable = no puedes corregir errores sin V2 |
| | Sin session logs ni trajectory recording |
| | Sin error/lesson tracking |

---

## TOP 12 Anti-Patterns por Categoría

### AP-01: Enforcement por Disciplina (10/14 proyectos)

**El más crítico.** Cuando las reglas dependen de que alguien las lea y las siga, no funcionan.

| Enforcement real (funciona) | Enforcement documental (falla) |
|----------------------------|-------------------------------|
| agentic-framework: 16 pre-commit hooks | THYROX: "el SKILL dice que deberías..." |
| claude-mlx-tts: Stop + Permission hooks | claude-pipe: nada |
| oh-my-claude: hooks + Ralph loops | almanack: nada |
| trae-agent: task_done tool + verify | cc-warp: todo conceptual |
| Cortex: halt conditions | conv-temp: disciplina manual |

**Lección para THYROX:** Las EXIT_CONDITIONS que dicen "STOP" pero nada realmente para son decorativas. Necesitamos enforcement ejecutable (hooks, scripts de validación).

### AP-02: Instruction Bloat (confirmado por 4+ proyectos)

| Proyecto | Líneas CLAUDE.md | Compliance |
|----------|-----------------|------------|
| almanack | ~40 | Alta |
| Cortex | ~50 | Alta |
| ClaudeViewer | ~60 | Alta |
| agentic-framework | <100 (post L-0002) | Alta (después del fix) |
| valet | ~150 | Borderline |
| cc-warp | ~300 | Baja |

**Lección:** agentic-framework descubrió L-0002 por las malas: cuando TODO es "MANDATORY", NADA destaca. El LLM tiene un presupuesto de atención finito. THYROX CLAUDE.md está en 51 líneas — bien.

### AP-03: Work-logs Manuales que Nadie Escribe (8/14)

**Lo que no funciona:**
- THYROX: work-logs narrativos manuales → siempre vacíos (ERR-021)
- conv-temp: transcripts manuales → requiere disciplina extrema

**Lo que sí funciona:**
- trae-agent: trajectory recording automático
- oh-my-claude: session hooks automáticos
- spec-kit / claude-pipe: NO work-logs, solo checkboxes + git log

**Lección:** O es automático o no existe. Git log + checkboxes es suficiente.

### AP-04: Sin Mecanismo de Handoff Humano (12/14)

Solo 2 proyectos tienen handoff persistente:
- agentic-framework: `HUMAN_NEEDED.md` con HN-NNNN tipado
- build-ledger: Tiered authority con árbitro Tier 3

**Lección:** Cuando la IA necesita una decisión humana, lo dice en chat y la petición se pierde. Se necesita un registro persistente de "qué necesita decidir el humano."

### AP-05: Mezcla de Capas (rules + procedures + state en el mismo archivo)

- THYROX: SKILL.md mezcla reglas (Layer 1) + fases detalladas (L2) + convenciones (L1)
- cc-warp: foco_atual.md mezcla filosofía con instrucciones operacionales
- almanack: CLAUDE.md mezcla quality rules con language-specific standards

**Lección:** 3 capas separadas: (1) Constitution/rules — siempre cargada, corta, inmutable; (2) Playbooks/fases — cargada cuando se necesita; (3) State — leída en puntos de decisión.

### AP-06: Errores sin Feedback Loop (12/14)

| Proyecto | Error tracking | ¿Se convierte en prevención? |
|----------|---------------|------------------------------|
| agentic-framework | L-NNNN (What/Why/Action/Insight) | Sí — lecciones se vuelven reglas |
| almanack | Correcciones añadidas a CLAUDE.md | Sí — cada error se vuelve regla |
| THYROX | ERR-NNN (descripción libre) | **No** — documentados pero no convertidos en prevención |

**Lección:** THYROX tiene ERR-001 a ERR-028 pero NO alimentan de vuelta al SKILL.md o CLAUDE.md. ERR-002 recurrió como ERR-006 porque no hubo prevención. El ciclo está roto.

### AP-07: Sobreingeniería / Complejidad sin Payoff

| Proyecto | Qué sobreingenierizaron | Ratio teoría/resultado |
|----------|------------------------|----------------------|
| cc-warp | 4,397 archivos, 9 agentes, 5 capas | **Peor ratio de los 14** |
| Cortex | 90+ agentes, BSI, brain-engine | Solo justificado a escala masiva |
| build-ledger | Votación unánime, naming authority | Solo para swarms multi-agente |
| oh-my-claude | MCP servers, multi-modelo | Alto overhead de infraestructura |

**Lección:** claude-pipe tiene 12KB de docs y produjo código funcional. cc-warp tiene 4,397 archivos. Construir infraestructura para escala que no tienes = desperdicio.

### AP-08: Dispersión de Artefactos

**Funciona:** Un directorio por feature (spec-kit: `specs/{feature}/`)
**Falla:** Dispersar analysis/, tasks/, errors/, epics/ en directorios separados sin link

**Lección:** THYROX ya corrigió esto con work packages (`work/YYYY-MM-DD-HH-MM-SS-nombre/`) que agrupan todo de un feature.

### AP-09: Decision Gates Decorativos (6/14)

EXIT_CONDITIONS que dicen "STOP" pero nada realmente para:
- THYROX: "Salir cuando..." es guía, no enforcement
- cc-warp: todo conceptual, sin hooks

**Lo que funciona:**
- agentic-framework: graduated enforcement (hard blocks + soft warns)
- Cortex: halt conditions en constitution
- trae-agent: task_done tool que verifica antes de completar

### AP-10: Sin Eficiencia de Tokens

| Token-eficiente | Token-ineficiente |
|----------------|-------------------|
| agentic-framework: scripts que output solo datos relevantes (200 vs 5000 tokens) | THYROX: lee archivos completos cada vez |
| Cortex: context-tier-split (headers 20 líneas + detail on demand) | cc-warp: reference diaries 500+ líneas |
| ClaudeViewer: modules 20-50 líneas | |

### AP-11: Sin Evaluación / Sin Benchmarks (12/14)

Solo 2 miden si su metodología funciona:
- trae-agent: SWE-bench benchmarking
- agentic-framework: 626 tests como safety net

**Lección:** THYROX ya tiene 54 test cases — está mejor que 12/14 proyectos en esto.

### AP-12: Inmutabilidad de Documentos

| Funciona | Falla |
|----------|-------|
| clawpal: nuevo archivo por cambio | THYROX: edita in-place, pierde historial de WHY |
| conv-temp: transcripts inmutables | valet: V1 inmutable = no puedes corregir errores |
| build-ledger: LOG.md append-only | |

**Lección:** Git resuelve esto si se hacen commits descriptivos. No necesitamos inmutabilidad de archivos.

---

## Aplicación a THYROX: Errores que NO debemos cometer

### YA corregidos en THYROX
- [x] Instruction bloat en CLAUDE.md (reducido a 51 líneas)
- [x] Dispersión de artefactos (work packages con timestamp)
- [x] Sin evaluación (54 test cases creados)
- [x] Work-logs manuales eliminados (git log + checkboxes)

### Riesgos ACTIVOS en THYROX
1. **AP-01:** Sin enforcement ejecutable — EXIT_CONDITIONS son decorativas
2. **AP-06:** ERR-NNN no alimenta prevención — ERR-002 recurrió como ERR-006
3. **AP-04:** Sin mecanismo de handoff humano persistente
4. **AP-10:** Sin eficiencia de tokens — lee archivos completos
5. **AP-05:** SKILL.md mezcla reglas con procedimientos
6. **AP-09:** Decision gates sin enforcement real

### Proyectos modelo a seguir por categoría
| Necesidad | Proyecto modelo | Qué copiar |
|-----------|----------------|------------|
| Enforcement | agentic-framework | Pre-commit hooks graduated |
| Error→Prevention | agentic-framework | L-NNNN con What/Why/Action/Insight |
| Human handoff | agentic-framework | HUMAN_NEEDED.md |
| Token efficiency | ClaudeViewer | Modules 20-50 líneas |
| Simplicity | claude-pipe | 2 docs, zero overhead |
| Session state | Cortex-Template | focus.md + now.md (ya adoptado) |
| Trazabilidad | spec-kit | FR→Task→Checklist pipeline |
