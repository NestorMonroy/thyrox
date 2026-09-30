```yml
created_at: 2026-04-20 21:15:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
analysis_type: Directed Analysis (post quick-search)
source_files: 3 (references-calibration-coverage, parallelization-deep-dive, planning-pattern-deep-dive)
total_findings: 12
relevance_to_ci_cd: ALTA
```

# Análisis Dirigido — Hallazgos Aplicables a CI/CD

## Introducción

Basado en búsqueda rápida (69/93 archivos match), analizamos 3 archivos Tier 1 de methodology-calibration/discover/.

**Descubrimiento clave:** THYROX ya tiene documentados los MECANISMOS para resolver CI/CD gaps. No son teóricos — son patrones implementables.

---

## Hallazgo 1: Stop Hooks Como Quality Gates (CRITICIDAD ALTA)

**Fuente:** references-calibration-coverage.md (P-2.2)

**Qué es:**
- Stop hooks con `continue: false` + `stopReason`
- Mecanismo más cercano a un gate con criterio verificable
- Cargado automáticamente en cada sesión

**Efectividad documentada:**
| Mecanismo | Enforcement |
|-----------|------------|
| permissions.deny | 100% |
| PreToolUse hook | 100% |
| Git hooks | 100% |
| CLAUDE.md rules | ~70% |
| PostToolUse warnings | ~30% |

**Aplicación a CI/CD:**
En lugar de GitHub Actions remoto (~70% effectiveness), usar:
1. **Stop hook** que valida artefactos WP (100% enforcement)
2. **Git hook** que valida antes de commit (100% enforcement)
3. Resulta: 100% garantía vs GitHub Actions ~70%

**Implementación concreta:**
```bash
# .claude/scripts/validate-wp-artifacts.sh (stop hook)
# Valida: metadata YAML, nombres de archivo, estructura de fase
# Si falla: continue: false, stopReason con qué corregir
```

---

## Hallazgo 2: F.I.R.S.T. / Self-Validating Criteria

**Fuente:** references-calibration-coverage.md (P-2.3) + sdd.md

**Qué es:**
- S = Self-validating: "Resultado booleano claro: pasa o falla, sin interpretación manual"
- Exit criteria como predicados verificables (no afirmaciones vagas)

**Ejemplo correcto:**
```
INCORRECTO: "Análisis es completo y correcto"
CORRECTO: "analysis.md EXISTE AND metadata YAML válido AND 5 gaps documentados AND confianza ≥MEDIA"
```

**Aplicación a CI/CD:**
Cada validación debe tener criterion booleano:
- ANTES: "Validar que archivo sea correcto" (vago)
- DESPUÉS: "Validar que archivo tenga metadata YAML Y version field AND created_at field" (verificable)

**Implementación:**
```bash
# Checklist verificable para cada artefacto:
[ -f file.md ] && \
  grep -q "^created_at:" file.md && \
  grep -q "^version:" file.md && \
  wc -l < file.md | awk '{if ($1 > 50 && $1 < 5000) exit 0; else exit 1}'
```

---

## Hallazgo 3: Eval-Driven Development (JiTTesting)

**Fuente:** references-calibration-coverage.md (P-2.4) + development-methodologies.md

**Qué es:**
- JiTTesting: just-in-time testing — evalúa cambios contra criterios ANTES de merge
- Resultados: 4x mejora en detección de regresiones, 70% reducción en carga de revisión

**Concepto clave:** No validar TODO. Validar DELTA.

**Aplicación a CI/CD:**
En lugar de "lintear todos los 93 archivos", evaluar:
- Solo archivos modificados en el PR
- Contra criterios específicos del tipo de archivo (agent, guidelines, decision, etc.)

**Implementación:**
```bash
# En hook: detectar qué cambió
git diff --name-only origin/main...HEAD | while read file; do
  if [[ $file == .claude/agents/* ]]; then
    validate_agent_syntax $file
  elif [[ $file == .thyrox/context/decisions/* ]]; then
    validate_adr_structure $file
  fi
done
```

---

## Hallazgo 4: Paralelización Explícita de Evaluadores

**Fuente:** parallelization-deep-dive.md (RunnableParallel + dict estructura)

**Qué es:**
- Ejecutar múltiples evaluadores en paralelo
- Cada evaluador independiente (responsabilidad única)
- Merger que sintetiza resultados

**Patrón LangChain documentado:**
```python
gate_parallel = RunnableParallel({
    "structural_result":  evaluador_completitud,
    "evidence_result":    evaluador_evidencia,
    "consistency_result": evaluador_consistencia,
    "artifact_content":   RunnablePassthrough(),
})
```

**Aplicación a CI/CD:**
3 validadores independientes en paralelo:
1. **Evaluador Estructural:** metadata YAML, nombres archivo, convenciones
2. **Evaluador Evidencia:** claims clasificados (OBSERVABLE/INFERRED/SPECULATIVE)
3. **Evaluador Consistencia:** referencias cruzadas, links rotos, ADR contradicciones

Cada uno retorna dict con status (pass/fail/unclear).

**Merger:** "Si CUALQUIERA retorna fail o unclear → gate bloqueado"

---

## Hallazgo 5: Barrera de Sincronización (Implicit en LCEL)

**Fuente:** parallelization-deep-dive.md (sección 2.4)

**Qué es:**
- Garantía: merger NO ejecuta hasta que todos los evaluadores completen
- En LCEL: `map_chain | synthesis_prompt | LLM` — la pipe es la barrera
- Sin frameworks: `asyncio.gather()` proporciona la misma garantía

**Aplicación a CI/CD:**
El gate debe garantizar que:
```
1. Evaluador Estructural completa → resultado A
2. Evaluador Evidencia completa → resultado B
3. Evaluador Consistencia completa → resultado C
4. SOLO ENTONCES: Merger evalúa A+B+C
```

Sin barrera: si un evaluador es lento, merger podría usar resultados parciales.

**Implementación:**
```bash
# Barrera explícita:
wait_for_all_evaluators
structural_result=$?
evidence_result=$?
consistency_result=$?
# AHORA merger puede evaluar
merge_results $structural_result $evidence_result $consistency_result
```

---

## Hallazgo 6: Artifact Paradox — Validación Como Contramedicina

**Fuente:** references-calibration-coverage.md (P-3.2)

**Qué es:**
- "Users who produce AI artifacts are LESS likely to question reasoning" (Anthropic AI Fluency Index 2026)
- Realismo performativo: afirmar calidad sin mecanismo de validación

**Aplicación a CI/CD:**
WP-ERR-001 fue detectado DESPUÉS de merge porque:
- Sin validación en CI/CD → usuario confía en estructura
- Estructura resultó violada (`.claude/context/` en lugar de `.thyrox/context/`)
- Validación automática habría prevenido esto

**Contramedicina documentada:**
- Stop hooks que validan estructura
- F.I.R.S.T. criteria que son booleanos (no interpretativos)
- Eval-Driven que evalúa ANTES de merge, no DESPUÉS

---

## Hallazgo 7: Tabla de Efectividad Diferencial

**Fuente:** references-calibration-coverage.md (P-2.1) + production-safety.md

**Contexto:** Diferentes mecanismos de validación tienen efectividad distinta

| Mecanismo | Effectiveness | Costo | Latencia |
|-----------|---|----|----|
| permissions.deny | 100% | Alto (requiere setup GitHub) | Instantáneo |
| PreToolUse hook | 100% | Bajo (bash) | Real-time |
| Git hooks | 100% | Bajo (bash) | Pre-commit |
| CLAUDE.md rules | ~70% | Bajo (pasivo) | Detecta violations |
| PostToolUse warnings | ~30% | Mínimo | Post-execution |
| GitHub Actions | ~70% | Medio | 5-15 min |

**Recomendación para ÉPICA 43:**
Priorizar hooks (100%, bajo costo) antes de GitHub Actions (~70%, costo medio).

---

## Hallazgo 8: Criterios de Confianza Probabilística

**Fuente:** references-calibration-coverage.md (P-1.2, P-1.3, P-1.4)

**Benchmarks documentados:**
- P(completar correctamente CON SKILL) ≈ 70%
- P(sin framework) ≈ 40%
- P(agentes invocan skills on-demand) ≈ 56%
- "80% Problem": AI maneja 80% confiablemente, 20% requiere humano

**Aplicación:**
- No buscar validación perfecta (es probabilística)
- Apuntar a 80% de confianza como operacional
- Documentar qué valida CI/CD (80%) vs qué requiere manual (20%)

**Ejemplo:** 
- 80%: estructura YAML, nombres archivo, referencias básicas
- 20%: semántica de claims, corrección de razonamiento, contexto de negocio

---

## Hallazgo 9: Protocolo de Validación en Stages THYROX

**Fuente:** references-calibration-coverage.md (Recomendaciones)

**Acción propuesta:** Mapear tipos de eval a cada stage

| Stage | Tipo de Eval | Tool |
|-------|---|---|
| 1-DISCOVER | Evidence classification (OBSERVABLE/INFERRED/SPECULATIVE) | Script bash |
| 2-BASELINE | Metric collection (números verificados) | Script bash |
| 3-ANALYZE | Causa raíz analysis gaps | Deep-dive agent |
| 4-CONSTRAINTS | Constraint consistency | Script bash |
| 5-STRATEGY | Trade-off analysis | Manual + scoring |
| 6-PLAN | Scope completeness (in-scope/out-of-scope) | Script bash |
| 7-DESIGN | Spec-first validation (Given/When/Then) | Script bash |
| 8-EXECUTE | Task completion % | Checklist |
| 9-PILOT | PoC success criteria | Manual |
| 10-TRACK | Lessons completeness | Script bash |
| 11-EVALUATE | ADR decision validity | Script bash |
| 12-STANDARDIZE | Pattern replicability | Manual review |

---

## Hallazgo 10: Ausencia de Protocolo Operacional

**Fuente:** references-calibration-coverage.md (G-1 through G-7)

**Lo que EXISTE conceptualmente:**
- Artifact Paradox (nombrado)
- Trust Calibration (framework)
- Eval-Driven (pattern)
- F.I.R.S.T. (criteria)
- Probabilistic benchmarks (empíricos)

**Lo que FALTA:**
- Protocolo que conecte esas piezas al flujo de stages THYROX
- Operacionalización en scripts/hooks
- Mapeo explícito a gates

**Implicación para ÉPICA 43:**
El gap NO es "falta de mecanismos" — es "falta de orquestación".

---

## Hallazgo 11: Estructura de Merger (Synthesis de Resultados)

**Fuente:** parallelization-deep-dive.md + planning-pattern-deep-dive.md

**Concepto:** Múltiples evaluadores retornan dict con campos específicos.
Merger sintetiza usando reglas claras.

**Estructura para ÉPICA 43:**
```json
{
  "structural": {
    "status": "pass|fail|unclear",
    "details": "Metadata YAML válido, nombres OK"
  },
  "evidence": {
    "status": "pass|fail|unclear",
    "observable_ratio": 0.85,
    "inferred_ratio": 0.10,
    "speculative_ratio": 0.05
  },
  "consistency": {
    "status": "pass|fail|unclear",
    "broken_links": 0,
    "contradictions": 0
  },
  "verdict": "pass|fail|rework"
}
```

**Regla merger:** Gate pasa SÍ:
- structural = pass AND
- evidence.observable_ratio ≥ 0.75 AND
- consistency = pass

---

## Hallazgo 12: Documentación de Errores (Meta-finding)

**Descubrimiento:** methodology-calibration/discover/ documenta 5+ tipos de errores comunes:
- analysis-not-documented
- decisions-not-adrs
- references-usage-undocumented
- skipping-phases
- templates-usage-undocumented

**Aplicación:** Estos 5 tipos deberían ser validados automáticamente en CI/CD.

Ej: "references-usage-undocumented" → validar que todo `.claude/references/` mencionado en código tenga @import

---

## Síntesis: Cómo Resolver ÉPICA 43

### Estrategia (basada en methodology-calibration findings)

**NO:** Crear 5+ workflows complejos en `.github/workflows/`

**SÍ:** Implementar 3-evaluadores-en-paralelo con hooks:

```
1. PreToolUse hook (stop-hook): valida al inicio de sesión
   → Evaluador Estructural (100% enforcement)

2. Git hook (pre-commit): valida antes de commit
   → Evaluador Evidencia + Consistencia paralelos (100% enforcement)

3. GitHub Actions (remoto): para CI/CD completo (~70% enforcement)
   → Orquesta los 3 evaluadores en paralelo
```

### Métricas de Éxito (basadas en Eval-Driven)

- Zero artefactos mergeados con Structural=fail
- Evidence ratio ≥ 75% observable+inferred para artefactos críticos
- Consistency broken_links = 0
- Gate pasa = determinista (no interpretación manual)

### Próximas Fases

**Phase 2 BASELINE:**
- Medir estado actual (cuántos WP violarían los criterios?)
- Establecer baseline de "calidad sin validación"

**Phase 5 STRATEGY:**
- Decidir qué validar en cada stage (tabla Hallazgo 9)
- Mapear a 3-evaluadores-en-paralelo

**Phase 6 PLAN:**
- Implementar hooks + GitHub Actions
- Crear merged dict structure (Hallazgo 11)

---

## Documentación de Fuentes

Todos los hallazgos rastreables a:
1. `.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover/references-calibration-coverage.md` (P-2.1 through P-4.2)
2. `.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover/parallelization-deep-dive.md` (secciones 2.1-2.5)
3. `.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover/planning-pattern-deep-dive.md` (secciones DELTA, CAPA 1-2)

