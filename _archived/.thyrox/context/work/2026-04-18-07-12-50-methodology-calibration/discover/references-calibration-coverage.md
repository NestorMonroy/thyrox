```yml
created_at: 2026-04-18 07:30:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-review (afd2490b6e7411c5a)
status: Borrador
corpus: 49 referencias (.claude/references/)
cobertura: 49/49
```

# Deep-Review — Referencias para methodology-calibration (ÉPICA 42)

**Problema central:** THYROX opera con realismo performativo — afirma calidad en artefactos sin mecanismo de validación. Cambio sistémico: assertion → evidence-backed quality.

---

## Patrones identificados

### Categoría 1: Confianza probabilística y fiabilidad del sistema — ALTA RELEVANCIA

**P-1.1: El espectro determinístico/probabilístico está documentado**
- `claude-code-components.md` — Capa 0 Hooks = 100% determinístico, Capa 2 Skills = probabilístico
- `command-execution-model.md` — `context: fork` = determinista vs routing by description = probabilístico
- `skill-vs-agent.md` — tabla de capas con reliability diferencial

**P-1.2: Estimaciones P empíricas ya existen en el corpus**
- `benchmark-skill-vs-claude.md` — P(completar correctamente con SKILL) ≈ 70%, P(sin framework) ≈ 40%. **Único archivo con notación P() explícita.**
- `context-engineering.md` — tabla de adherencia por tamaño CLAUDE.md: 1-100 líneas = ~95%, 100-200 = ~88%, ..., 600+ = ~45%. Fuente: HumanLayer empirical data.

**P-1.3: El 56% Reliability Warning es el benchmark de referencia del sistema**
- `glossary.md` — agentes invocan skills on-demand solo 56% del tiempo (Vercel/Gao 2026)

**P-1.4: El "80% Problem" como límite de confianza operacional**
- `glossary.md` — "AI handles 80% reliably; 20% needs human expertise" (Addy Osmani)

---

### Categoría 2: Mecanismos de validación de artefactos — MEDIA-ALTA RELEVANCIA

**P-2.1: Tabla de efectividad diferencial de enforcement — única en el corpus**
- `production-safety.md` — `permissions.deny` = 100%, `PreToolUse hook` = 100%, `CLAUDE.md rules` = ~70%, `PostToolUse warnings` = ~30%, `Git hooks` = 100%

**P-2.2: Stop hooks como quality gates verificables**
- `hook-authoring.md` — Stop hooks con `continue: false` + `stopReason`. Mecanismo más cercano a un gate con criterio verificable.

**P-2.3: SDD — F.I.R.S.T. / Self-validating como propiedad de exit criteria**
- `sdd.md` — S = Self-validating: "Resultado booleano claro: pasa o falla, sin interpretación manual." Exactamente la propiedad que falta en los exit criteria de stages THYROX.

**P-2.4: Eval-Driven Development como TDD para agentes**
- `development-methodologies.md` y `sdd.md` — JiTTesting: 4x mejora en detección de regresiones, 70% reducción carga de revisión humana. Closest pattern to evidence-backed quality.

---

### Categoría 3: Incertidumbre y calibración epistémica — BAJA-MEDIA RELEVANCIA

**P-3.1: Trust Calibration — framework conceptual sin protocolo operacional**
- `glossary.md` — "Framework para hacer coincidir esfuerzo de verificación con nivel de riesgo real"
- `visual-reference.md` — Diagrama 7: boilerplate / business logic / security-critical con niveles de revisión diferenciados. Sin umbrales cuantitativos.

**P-3.2: Artifact Paradox — nombre exacto para realismo performativo**
- `glossary.md` — "users who produce AI artifacts are LESS likely to question reasoning behind them" (Anthropic AI Fluency Index 2026). **Nombra directamente el problema del WP.**

**P-3.3: Verification debt, Verification paradox, Comprehension debt**
- `glossary.md` — articulan el problema pero sin mecanismo de cuantificación.

**P-3.4: Anti-hallucination protocol como evidence-anchoring**
- `glossary.md` — "verificar afirmaciones contra código o documentación real"
- `long-context-tips.md` — "Grounding responses in quotes"

---

### Categoría 4: Umbrales cuantitativos — RELEVANCIA ESTRUCTURAL

**P-4.1: Todos los umbrales existentes son operacionales, no epistemológicos**
- Context window: 70% = orange zone, 90% = red zone (`visual-reference.md`)
- Cache hit ratio: >80% = healthy (`known-issues.md`)
- Coverage: ≥80% para código nuevo (`production-safety.md`)
- DMAIC baseline σ: campo existe en `coordinator-integration.md`, protocolo de uso ausente

**P-4.2: 56%/70%/80% son los únicos benchmarks de calidad de sistema disponibles**
No hay equivalentes para artefactos WP (discover-analysis, risk-register, exit-conditions).

---

## Gaps vs el problema del WP

| Gap | Descripción | Estado en corpus | Impacto |
|-----|-------------|-----------------|---------|
| **G-1** | Mecanismo de cuantificación de confianza en artefactos WP | **Completamente ausente** | Alto |
| **G-2** | Exit criteria como predicados verificables (no afirmaciones) | Semilla en `sdd.md` (F.I.R.S.T.), sin mapeo a stages | Alto |
| **G-3** | Distinción epistémica vs aleatoria | **Completamente ausente** en los 49 archivos | Medio |
| **G-4** | Protocolo de uso del baseline σ de DMAIC en gates | Campo existe, protocolo no | Medio |
| **G-5** | Trust Calibration operacional para artefactos WP | Conceptual completo, operacional ausente | Medio |
| **G-6** | Contramedicina sistémica para Artifact Paradox | Nombrado en glossary, solución ausente | Alto |
| **G-7** | Eval-Driven Development mapeado a transitions entre stages | Patrón existe, mapeo a THYROX ausente | Medio-alto |

---

## Referencias que YA cubren aspectos del problema

| Archivo | Cobertura | Nivel |
|---------|-----------|-------|
| `glossary.md` | Artifact Paradox, Trust Calibration, Verification paradox, Hallucination | Conceptual completo |
| `benchmark-skill-vs-claude.md` | P(outcome) explícito, comparación evidencial | Empírico — único con P() |
| `context-engineering.md` | Tabla adherencia % por tamaño contexto (HumanLayer) | Cuantitativo externo |
| `production-safety.md` | Tabla efectividad enforcement (100%/70%/30%), umbrales CI/CD | Cuantitativo, para código |
| `development-methodologies.md` | Eval-Driven, JiTTesting (4x/70%), ATDD | Patrón verificable |
| `sdd.md` | F.I.R.S.T. Self-validating, contratos DbC, Verification Loops | Verificabilidad de tests |
| `coordinator-integration.md` | baseline σ en DMAIC measure | Campo existe, protocolo no |

---

## Recomendaciones para Stage 3 DIAGNOSE

**Acción 1 — Crear `calibration-framework.md`** (reference nuevo)
Contenido mínimo: (a) qué constituye evidencia vs afirmación en artefacto WP, (b) umbrales de confianza por tipo de artefacto, (c) protocolo de self-validation antes de gate.

**Acción 2 — Extender `sdd.md` con "Evidence Gates para stages THYROX"**
Mapear tipos de eval (Code-based, LLM-based, Human grading) a los 12 stages. Un eval booleano autovalidante por stage, anclado en evidencia observable.

**Conclusión:** El corpus ya tiene vocabulario (Artifact Paradox, Trust Calibration, Verification paradox, Eval-Driven, F.I.R.S.T.) y patrones empíricos (benchmark probabilístico, tabla de adherencia). Lo que falta es el protocolo que conecte esas piezas al flujo de stages.
