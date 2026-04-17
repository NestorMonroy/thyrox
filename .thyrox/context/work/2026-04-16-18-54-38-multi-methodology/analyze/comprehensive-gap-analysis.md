```yml
created_at: 2026-04-17 04:06:10
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Comprehensive Gap Analysis — THYROX Framework

**Scope:** All layers reviewed — Registry, Agents, Skills (methodology + workflow), Core, Plugin, Routing, State Machine, Cross-reference integrity.

**Review date:** 2026-04-17

---

## 1. Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 11 |
| MEDIUM | 12 |
| LOW | 4 |
| **Total** | **32** |

| Layer | Gaps |
|-------|------|
| Registry | 5 |
| Agent | 6 |
| Skill — Methodology | 9 |
| Skill — Workflow | 2 |
| Core / State Machine | 6 |
| Routing | 2 |
| Plugin / Commands | 1 |
| Cross-reference integrity | 1 |

**Key finding:** The 5 newest methodology namespaces (lean, ps8, sp, cp, bpa) have complete skill anatomy (SKILL.md + assets/ + references/) but are entirely missing their coordinator agents AND registry YAMLs. The system THYROX describes them as `*(pendiente)*` in SKILL.md — the skills exist but the routing and orchestration layer does not. Additionally, ps8 has a critical schema mismatch between its registry YAML (8D methodology, D0–D8) and its skill implementations (Toyota TBP, 6 steps with different names). The meta-framework orchestration gaps (GAP-META-001 through GAP-META-013) were identified in an earlier deep-review and are summarized here for completeness.

---

## 2. Layer-by-Layer Analysis

### A. Registry Completeness

**Files checked:** `.thyrox/registry/methodologies/` — 7 YAMLs present: `babok.yml`, `dmaic.yml`, `pdca.yml`, `pmbok.yml`, `ps8.yml`, `rm.yml`, `rup.yml`

**Missing YAMLs (4):** `lean.yml`, `sp.yml`, `cp.yml`, `bpa.yml`

The 5 namespaces with skills on disk but no registry YAML: lean, sp, cp, bpa (ps8 has a YAML but with schema mismatch).

**Existing YAML quality:** All 7 present YAMLs have the required fields (`id`, `type`, `display`, `note`, `steps`/`areas`). None have `native_phase_count`, `produces:`, `consumes:`, or `activation_trigger:` — these are missing per the meta-framework architecture requirements documented in `analyze/meta-framework-gap-analysis.md`.

**ps8 schema mismatch:** `ps8.yml` implements 8D (D0–D8, Ford Automotive) but the ps8 skills implement Toyota TBP (6 steps: clarify, target, analyze, countermeasures, implement, evaluate). The `thyrox-coordinator` would read ps8.yml and present D0–D8 steps, but the actual skills map to a completely different numbering and naming scheme. There is no ps8-specific coordinator to bridge this gap.

**Registry agents:** `.thyrox/registry/agents/` contains only tech-stack agent YAMLs (task-planner, task-executor, tech-detector, skill-generator, nodejs-expert, react-expert, postgresql-expert, mysql-expert, webpack-expert). No coordinator agent YAMLs exist for any methodology coordinator.

---

### B. Coordinator Agents Completeness

**Files checked:** `.claude/agents/` — 18 agents total

**Coordinator agents present (6):** `dmaic-coordinator.md`, `pdca-coordinator.md`, `pmbok-coordinator.md`, `babok-coordinator.md`, `rup-coordinator.md`, `rm-coordinator.md`

**Coordinator agents missing (5):** `lean-coordinator.md`, `ps8-coordinator.md`, `sp-coordinator.md`, `cp-coordinator.md`, `bpa-coordinator.md`

**`thyrox-coordinator` routing gap:** `thyrox-coordinator.md` reads `now.md::flow` and dynamically reads the registry YAML for whatever flow is set. It does NOT have logic to route to a specific coordinator based on problem type. The routing decision ("use dmaic for process improvement") must be made by the user or by some external mechanism — no automatic problem-type detection exists.

**Coordinator `skills:` arrays:**
- `dmaic-coordinator`: has `skills:` array (5 entries) — correct
- `pdca-coordinator`: has `skills:` array (4 entries) — correct
- `pmbok-coordinator`: NO `skills:` array — missing
- `babok-coordinator`: NO `skills:` array — missing
- `rup-coordinator`: NO `skills:` array — missing
- `rm-coordinator`: NO `skills:` array — missing

Four of the six coordinators lack the `skills:` array that declares which skills they orchestrate.

---

### C. Methodology Skills Completeness

**Total skills on disk:** 29 methodology skills across 6 original namespaces + 27 skills across 5 new namespaces = 56 methodology skills total.

**Anatomy per namespace (SKILL.md + assets/ + references/):**

| Namespace | Skills | SKILL.md | assets/ | references/ | THYROX Stage | metadata.triggers |
|-----------|--------|----------|---------|-------------|--------------|-------------------|
| `dmaic` | 5 | all | all (1 each) | all (1–3 each) | all present | all 5 (added ÉPICA 40) |
| `pdca` | 4 | all | all (1 each) | 3/4 (pdca-do: 0 — intentional) | all present | all 4 |
| `ba` | 6 | all | all (1–2 each) | all (1 each) | all present | all 6 |
| `pm` | 5 | all | all (1 each) | all (1 each) | all present | all 5 |
| `rup` | 4 | all | all (1 each) | all (1–2 each) | all present | all 4 |
| `rm` | 5 | all | all (1 each) | all (1 each) | all present | all 5 |
| `lean` | 5 | all | all (1–2 each) | all (1 each) | all present | **NONE** |
| `ps8` | 6 | all | all (1–3 each) | all (1–3 each) | all present | **NONE** |
| `sp` | 8 | all | all (1–2 each) | all (1 each) | all present | **NONE** |
| `cp` | 7 | all | all (1 each) | all (1 each) | all present | **NONE** |
| `bpa` | 6 | all | all (1–2 each) | all (1 each) | all present | **NONE** |

**Key finding:** The 5 new namespaces (lean, ps8, sp, cp, bpa — 32 skills total) are missing `metadata.triggers` in their frontmatter. The original 6 namespaces (24 skills) all have `metadata.triggers` added in ÉPICA 40 Cambio A. This is a CSO (Context Selection Optimization) gap that degrades auto-invocation reliability for these namespaces.

**ps8 skills vs registry mismatch:** The ps8 skills implement Toyota Business Practices (TBP) with 6 steps (clarify=Steps1+2, target=Step3, analyze=Step4, countermeasures=Step5, implement=Step6, evaluate=Steps7+8). The registry YAML `ps8.yml` implements 8D with 9 steps (D0–D8). These are different methodologies. A ps8-coordinator would need to bridge this or the registry/skills need alignment.

**`disable-model-invocation: true`:** Present in all 56 methodology skills — correct.

**`allowed-tools`:** `Read Glob Grep Bash Write Edit` present in all 56 methodology skills — correct.

---

### D. Workflow Skills Completeness (12 THYROX Stages)

**Skills present (12):** workflow-discover, workflow-baseline, workflow-diagnose, workflow-constraints, workflow-strategy, workflow-scope, workflow-structure, workflow-decompose, workflow-pilot, workflow-implement, workflow-track, workflow-standardize

All 12 exist. However:

**workflow-diagnose missing references/:** This is the only workflow skill with no `references/` directory. All other 11 have at least one reference file. No documentation exists marking this as intentional (unlike `pdca-do` which is documented as intentional in the task plan T-002).

**CLAUDE.md stage naming inconsistency:** CLAUDE.md Locked Decision #5 Addendum FASE 39 lists the 12 workflow skills as: `workflow-discover, workflow-measure, workflow-analyze, workflow-constraints, workflow-strategy, workflow-plan, workflow-structure, workflow-decompose, workflow-pilot, workflow-execute, workflow-track, workflow-standardize`. However, the actual names on disk are: `workflow-baseline` (not `workflow-measure`), `workflow-diagnose` (not `workflow-analyze`), `workflow-scope` (not `workflow-plan`), `workflow-implement` (not `workflow-execute`). CLAUDE.md has not been updated to reflect the renamed skills.

---

### E. Routing Mechanism

**Current state:** No `routing-rules.yml` exists. The `thyrox-coordinator` dynamically reads any registry YAML but has no problem-type detection. Routing is entirely user-driven: the user must know which coordinator to invoke and either set `flow:` in `now.md` or invoke the coordinator directly.

**Missing:** A routing layer that maps problem characteristics to the appropriate coordinator. This was identified as GAP-011 in `meta-framework-gap-analysis.md`.

---

### F. Plugin / Commands Layer

**Plugin (`plugin.json`):** Points to `../.claude/skills` and `../.claude/agents` — all skills and agents are exposed. The description mentions "DMAIC, Problem Solving 8-step, Lean Six Sigma, PDCA" but does not mention SP, CP, BPA, RM, RUP, BABOK by name. Minor cosmetic gap only.

**Commands (`.claude/commands/`):** 20 command files exist. No gaps identified in terms of coverage — commands map to the 12 THYROX stages and common operations.

---

### G. State Machine Completeness

**`now.md` schema:** Tracks `stage`, `flow`, `methodology_step` as scalar fields. Single-methodology state only. Cannot represent two concurrent coordinators. This is GAP-003 from `meta-framework-gap-analysis.md`.

**Multi-coordinator artifact handoff:** No mechanism exists. This is GAP-004 (artifact dependency graph) and GAP-013 (artifact bus) from the earlier analysis.

---

### H. Cross-Reference Integrity

**CLAUDE.md workflow skill names vs disk:** 4 workflow skills listed with outdated names in Locked Decision #5 Addendum FASE 39 (see Section D above).

**THYROX SKILL.md `*(pendiente)*` markers:** lean, ps8, sp, cp, bpa are marked `*(pendiente)*` in the methodology table. This accurately reflects the missing coordinators and registries. However, the skills themselves are fully implemented — the `*(pendiente)*` label may mislead users into thinking the skills themselves don't work (they do, through `thyrox-coordinator`).

**T-011 and T-016 unchecked boxes:** `skill-anatomy-task-plan.md` shows T-011 and T-016 as unchecked, but git history confirms these commits were done (`70b7e9a feat(dmaic)`, `c4c9c6a feat(rup)`). Stale checkbox state — not a real gap.

---

## 3. Full Gap Catalog

### GAP-001: lean.yml missing from registry/methodologies
**Severity:** CRITICAL
**Layer:** Registry
**Current:** `.thyrox/registry/methodologies/lean.yml` does not exist
**Needed:** YAML with `id: lean`, `type: sequential` (or dmaic-like), `display: "Lean — DMAIC-style Waste Reduction"`, `steps:` matching lean-define/measure/analyze/improve/control
**Files to create:** `.thyrox/registry/methodologies/lean.yml`
**Effort:** S
**Depends on:** none

---

### GAP-002: sp.yml missing from registry/methodologies
**Severity:** CRITICAL
**Layer:** Registry
**Current:** `.thyrox/registry/methodologies/sp.yml` does not exist
**Needed:** YAML with `id: sp`, `type: sequential`, steps matching sp-context/analysis/gaps/formulate/plan/execute/monitor/adjust
**Files to create:** `.thyrox/registry/methodologies/sp.yml`
**Effort:** S
**Depends on:** none

---

### GAP-003: cp.yml missing from registry/methodologies
**Severity:** CRITICAL
**Layer:** Registry
**Current:** `.thyrox/registry/methodologies/cp.yml` does not exist
**Needed:** YAML with `id: cp`, `type: sequential`, steps matching cp-initiation/diagnosis/structure/recommend/plan/implement/evaluate
**Files to create:** `.thyrox/registry/methodologies/cp.yml`
**Effort:** S
**Depends on:** none

---

### GAP-004: bpa.yml missing from registry/methodologies
**Severity:** CRITICAL
**Layer:** Registry
**Current:** `.thyrox/registry/methodologies/bpa.yml` does not exist
**Needed:** YAML with `id: bpa`, `type: sequential`, steps matching bpa-identify/map/analyze/design/implement/monitor
**Files to create:** `.thyrox/registry/methodologies/bpa.yml`
**Effort:** S
**Depends on:** none

---

### GAP-005: ps8 registry YAML implements 8D; ps8 skills implement Toyota TBP — critical schema mismatch
**Severity:** CRITICAL
**Layer:** Registry + Skill
**Current:** `ps8.yml` uses 8D steps (ps8:d0 through ps8:d8, Ford/Automotive methodology). The 6 ps8 skills use Toyota TBP steps (ps8:clarify, ps8:target, ps8:analyze, ps8:countermeasures, ps8:implement, ps8:evaluate). These are two different problem-solving frameworks with different step counts, names, and philosophy.
**Needed:** Either (a) create `ps8.yml` aligned to Toyota TBP with 6 steps matching the skill IDs, replacing the current 8D YAML, OR (b) rename skills to `tbp-*` and create a separate `tbp.yml`, keeping ps8.yml for 8D. The two-methodology confusion must be resolved.
**Files to create/modify:** `.thyrox/registry/methodologies/ps8.yml` (rewrite) OR new `tbp.yml` + rename all ps8 skills
**Effort:** M
**Depends on:** Decision on ps8 vs tbp naming

---

### GAP-006: lean-coordinator.md missing
**Severity:** HIGH
**Layer:** Agent
**Current:** No `lean-coordinator.md` exists in `.claude/agents/`
**Needed:** Coordinator agent with `skills: [lean-define, lean-measure, lean-analyze, lean-improve, lean-control]`, `isolation: worktree`, tollgate verification for each lean phase, now.md update protocol
**Files to create:** `.claude/agents/lean-coordinator.md`
**Effort:** S
**Depends on:** GAP-001 (lean.yml)

---

### GAP-007: ps8-coordinator.md missing
**Severity:** HIGH
**Layer:** Agent
**Current:** No `ps8-coordinator.md` exists in `.claude/agents/`
**Needed:** Coordinator agent for the 6 TBP/ps8 steps, with conditional flow support (ps8:analyze can loop back), now.md update protocol, A3 Report artifact tracking
**Files to create:** `.claude/agents/ps8-coordinator.md`
**Effort:** S
**Depends on:** GAP-005 (ps8 schema resolution)

---

### GAP-008: sp-coordinator.md missing
**Severity:** HIGH
**Layer:** Agent
**Current:** No `sp-coordinator.md` exists in `.claude/agents/`
**Needed:** Coordinator agent for 8 Strategic Planning steps (sp-context through sp-adjust), sequential-with-cycle flow (sp:adjust loops back to sp:analysis for next strategic cycle), BSC/OKR artifact tracking
**Files to create:** `.claude/agents/sp-coordinator.md`
**Effort:** S
**Depends on:** GAP-002 (sp.yml)

---

### GAP-009: cp-coordinator.md missing
**Severity:** HIGH
**Layer:** Agent
**Current:** No `cp-coordinator.md` exists in `.claude/agents/`
**Needed:** Coordinator agent for 7 Consulting Process steps (cp-initiation through cp-evaluate), sequential flow, Pyramid Principle / MECE deck artifact tracking
**Files to create:** `.claude/agents/cp-coordinator.md`
**Effort:** S
**Depends on:** GAP-003 (cp.yml)

---

### GAP-010: bpa-coordinator.md missing
**Severity:** HIGH
**Layer:** Agent
**Current:** No `bpa-coordinator.md` exists in `.claude/agents/`
**Needed:** Coordinator agent for 6 BPA steps (bpa-identify through bpa-monitor), sequential flow, As-Is/To-Be process map artifact tracking
**Files to create:** `.claude/agents/bpa-coordinator.md`
**Effort:** S
**Depends on:** GAP-004 (bpa.yml)

---

### GAP-011: pmbok-coordinator missing `skills:` array
**Severity:** HIGH
**Layer:** Agent
**Current:** `pmbok-coordinator.md` frontmatter has no `skills:` field. It knows which skills to use (pm-initiating through pm-closing) only from its inline documentation.
**Needed:** `skills: [pm-initiating, pm-planning, pm-executing, pm-monitoring, pm-closing]` in frontmatter
**Files to modify:** `.claude/agents/pmbok-coordinator.md`
**Effort:** XS
**Depends on:** none

---

### GAP-012: babok-coordinator missing `skills:` array
**Severity:** HIGH
**Layer:** Agent
**Current:** `babok-coordinator.md` frontmatter has no `skills:` field
**Needed:** `skills: [ba-planning, ba-elicitation, ba-requirements-analysis, ba-requirements-lifecycle, ba-strategy, ba-solution-evaluation]` in frontmatter
**Files to modify:** `.claude/agents/babok-coordinator.md`
**Effort:** XS
**Depends on:** none

---

### GAP-013: rup-coordinator missing `skills:` array
**Severity:** HIGH
**Layer:** Agent
**Current:** `rup-coordinator.md` frontmatter has no `skills:` field
**Needed:** `skills: [rup-inception, rup-elaboration, rup-construction, rup-transition]` in frontmatter
**Files to modify:** `.claude/agents/rup-coordinator.md`
**Effort:** XS
**Depends on:** none

---

### GAP-014: rm-coordinator missing `skills:` array
**Severity:** HIGH
**Layer:** Agent
**Current:** `rm-coordinator.md` frontmatter has no `skills:` field
**Needed:** `skills: [rm-elicitation, rm-analysis, rm-specification, rm-validation, rm-management]` in frontmatter
**Files to modify:** `.claude/agents/rm-coordinator.md`
**Effort:** XS
**Depends on:** none

---

### GAP-015: 32 methodology skills missing `metadata.triggers` (lean, ps8, sp, cp, bpa namespaces)
**Severity:** HIGH
**Layer:** Skill — Methodology
**Current:** All 32 skills in lean (5), ps8 (6), sp (8), cp (7), bpa (6) namespaces have no `metadata.triggers` in their SKILL.md frontmatter. Auto-invocation reliability for these skills is degraded in sessions with 40+ skills competing for the context slot.
**Needed:** 3–5 `metadata.triggers` keywords per skill matching natural user language: methodology name, artefact names, domain terms
**Files to modify:** All 32 SKILL.md files in `.claude/skills/lean-*`, `.claude/skills/ps8-*`, `.claude/skills/sp-*`, `.claude/skills/cp-*`, `.claude/skills/bpa-*`
**Effort:** M
**Depends on:** none

---

### GAP-016: THYROX SKILL.md marks lean/ps8/sp/cp/bpa as `*(pendiente)*` despite skills being fully implemented
**Severity:** MEDIUM
**Layer:** Skill — Core
**Current:** The methodology table in `.claude/skills/thyrox/SKILL.md` marks all 5 new namespaces as `*(pendiente)*`. The note says "Los 5 marcados *(pendiente)* están diseñados con stages de anclaje definidos y son candidatos a la siguiente implementación." This is misleading: the skills ARE implemented. What is pending is only the coordinators and registry YAMLs.
**Needed:** Update the `*(pendiente)*` label to accurately describe what is missing. E.g., "skills completos — coordinator y registry YAML pendientes" or split the table to show complete vs pending status by component.
**Files to modify:** `.claude/skills/thyrox/SKILL.md` (methodology table, note)
**Effort:** XS
**Depends on:** none

---

### GAP-017: THYROX SKILL.md "Selección por necesidad" section omits lean/sp/cp/bpa/ps8
**Severity:** MEDIUM
**Layer:** Skill — Core
**Current:** `.claude/skills/thyrox/SKILL.md` lines 108–115 have a "Selección por necesidad" section that guides which namespace to use for which need. It only covers pdca, dmaic, rup, rm, pm, ba.
**Needed:** Extend to include: lean (waste elimination, value stream mapping), ps8/TBP (structured 8-step / Toyota problems), sp (strategic planning, BSC, OKRs), cp (consulting engagement, McKinsey-style analysis), bpa (business process redesign, BPMN)
**Files to modify:** `.claude/skills/thyrox/SKILL.md`
**Effort:** XS
**Depends on:** none

---

### GAP-018: workflow-diagnose missing references/ directory
**Severity:** MEDIUM
**Layer:** Skill — Workflow
**Current:** `.claude/skills/workflow-diagnose/` has only `SKILL.md` and `assets/`. All other 11 workflow skills have a `references/` directory with at least one file. No documentation marks this as intentional.
**Needed:** At minimum, a `references/` directory with `root-cause-analysis-methodology.md` covering domain decomposition patterns, causal tree analysis, and how to select which methodology skill to invoke during DIAGNOSE.
**Files to create:** `.claude/skills/workflow-diagnose/references/root-cause-analysis-methodology.md` (or similar)
**Effort:** S
**Depends on:** none

---

### GAP-019: CLAUDE.md Addendum FASE 39 lists outdated workflow skill names
**Severity:** MEDIUM
**Layer:** Core
**Current:** `CLAUDE.md` Locked Decision #5 Addendum FASE 39 lists: `workflow-discover, workflow-measure, workflow-analyze, workflow-constraints, workflow-strategy, workflow-plan, workflow-structure, workflow-decompose, workflow-pilot, workflow-execute, workflow-track, workflow-standardize`
**Needed:** Update to actual on-disk names: `workflow-baseline` (not `workflow-measure`), `workflow-diagnose` (not `workflow-analyze`), `workflow-scope` (not `workflow-plan`), `workflow-implement` (not `workflow-execute`)
**Files to modify:** `.claude/CLAUDE.md`
**Effort:** XS
**Depends on:** none

---

### GAP-020: No routing-rules.yml — coordinator selection is fully manual
**Severity:** MEDIUM
**Layer:** Routing
**Current:** No `.thyrox/registry/routing-rules.yml` exists. Coordinator selection requires the user to know which coordinator applies to their problem type.
**Needed:** A routing-rules YAML mapping problem characteristics to coordinators. E.g., `process_improvement_with_data` → `dmaic-coordinator`, `strategic_planning` → `sp-coordinator`. Referenced by `thyrox-coordinator` to provide guided selection.
**Files to create:** `.thyrox/registry/routing-rules.yml`
**Effort:** M
**Depends on:** GAP-021

---

### GAP-021: thyrox-coordinator lacks problem-type detection and coordinator routing logic
**Severity:** MEDIUM
**Layer:** Routing
**Current:** `thyrox-coordinator.md` reads `now.md::flow` and routes within a single methodology. It has no logic to ask "what type of problem is this?" and route to the appropriate coordinator.
**Needed:** Problem-type intake questions (4–6 qualifying questions) and routing logic that recommends and invokes the appropriate coordinator agent based on answers. Currently the coordinator is a generic single-flow runner, not a meta-orchestrator.
**Files to modify:** `.claude/agents/thyrox-coordinator.md`
**Effort:** L
**Depends on:** GAP-020

---

### GAP-022: Registry YAML fields missing for orchestration (native_phase_count, produces, consumes)
**Severity:** MEDIUM
**Layer:** Registry
**Current:** All 7 registry YAMLs (`babok.yml`, `dmaic.yml`, `pdca.yml`, `pmbok.yml`, `ps8.yml`, `rm.yml`, `rup.yml`) lack: `native_phase_count`, `produces:` (artifact IDs this methodology creates), `consumes:` (artifact IDs from other methodologies), `activation_trigger:`
**Needed:** These fields enable the thyrox-coordinator to function as a true orchestrator rather than a single-flow runner. Without them, artifact dependency management (BA produces requirements → PM consumes them) is impossible to automate.
**Files to modify:** All 7 methodology YAMLs in `.thyrox/registry/methodologies/`
**Effort:** M
**Depends on:** Design decision on artifact schema

---

### GAP-023: now.md schema supports only single-flow state; multi-coordinator state is impossible
**Severity:** MEDIUM
**Layer:** Core / State Machine
**Current:** `now.md` has scalar fields `flow: null` and `methodology_step: null`. Two coordinators cannot be simultaneously tracked.
**Needed:** A `coordinators:` section in `now.md` (or a new `orchestration-state.md`) that tracks per-coordinator state: `{namespace}: {step: ..., status: active|paused|complete, artifacts: [...]}`.
**Files to create/modify:** `.thyrox/context/now.md` (schema extension) or new `.thyrox/context/orchestration-state.md`
**Effort:** M
**Depends on:** none

---

### GAP-024: Coordinators lack artifact-ready signaling — no completion broadcast mechanism
**Severity:** MEDIUM
**Layer:** Core / State Machine
**Current:** Each coordinator terminates with "Proponer Stage 11 TRACK/EVALUATE" — a hardcoded handoff to the THYROX stage sequence. There is no mechanism to signal artifact completion to other coordinators or to an orchestration layer.
**Needed:** An artifact-ready signal convention. Minimum: coordinators write a completion record to `{wp}/artifact-registry.md`. The thyrox-coordinator reads this to determine what artifacts are available for dependent coordinators.
**Files to create:** Convention document + `{wp}/artifact-registry.md` template + updates to all coordinator agents
**Effort:** M
**Depends on:** GAP-023

---

### GAP-025: No artifact-registry.md template exists for inter-coordinator coordination
**Severity:** MEDIUM
**Layer:** Core / State Machine
**Current:** No template for `{wp}/artifact-registry.md`. Referenced in meta-framework gap analysis but never created as a template.
**Needed:** Template in `workflow-discover/assets/artifact-registry.md.template` (or equivalent) documenting the per-artifact row structure: coordinator, file path, status (draft/review/approved/complete), timestamp, consumers.
**Files to create:** `.claude/skills/workflow-discover/assets/artifact-registry.md.template`
**Effort:** S
**Depends on:** GAP-024

---

### GAP-026: scalability.md "Stages obligatorios por flow activo" encodes incorrect anchoring model
**Severity:** MEDIUM
**Layer:** Core
**Current:** `.claude/skills/workflow-discover/references/scalability.md` has a "Stages obligatorios por flow activo" table that lists which THYROX stages become mandatory when a methodology flow is active (e.g., dmaic active → stages 2, 3, 10, 11, 12 are non-skippable). This enforces the anchoring model as a hard constraint.
**Needed:** Per the meta-framework architecture, coordinators should activate based on artifact readiness, not THYROX stage enforcement. The table should be updated to reflect that stage anchoring is a guideline for sequencing, not a hard constraint enforced by the workflow engine.
**Files to modify:** `.claude/skills/workflow-discover/references/scalability.md`
**Effort:** S
**Depends on:** Architectural decision on anchoring model

---

### GAP-027: No orchestration-log.md template for coordinator activation history
**Severity:** MEDIUM
**Layer:** Core / State Machine
**Current:** No mechanism exists to log coordinator activation decisions and artifact readiness events. `now.md` only shows current state, not history.
**Needed:** `{wp}/orchestration-log.md` template capturing: timestamp, event type (coordinator_activated / artifact_ready / coordinator_completed), coordinator name, artifact name, decision rationale.
**Files to create:** `.claude/skills/workflow-discover/assets/orchestration-log.md.template` (or `workflow-implement`)
**Effort:** S
**Depends on:** none

---

### GAP-028: plugin.json description omits 6 of 11 methodology namespaces
**Severity:** LOW
**Layer:** Plugin
**Current:** `plugin.json` description: "Soporta múltiples metodologías: SDLC, DMAIC, Problem Solving 8-step, Lean Six Sigma, PDCA y más." Omits: RM, RUP, BABOK, PMBOK, Strategic Planning, Consulting Process, BPA.
**Needed:** Update description to be accurate or use "and more" language that doesn't enumerate specific ones. The skills pointer `"skills": "../.claude/skills"` exposes all skills correctly — this is cosmetic only.
**Files to modify:** `.claude-plugin/plugin.json`
**Effort:** XS
**Depends on:** none

---

### GAP-029: THYROX SKILL.md "Selección por necesidad" is incomplete and would benefit from a routing guide reference
**Severity:** LOW
**Layer:** Skill — Core
**Current:** The 6-line selection guide covers only the original 6 namespaces. No reference file exists for methodology selection.
**Needed:** A `thyrox/references/methodology-selection-guide.md` with decision trees for selecting between similar methodologies (e.g., lean vs dmaic for process improvement; sp vs pm for project governance; rm vs ba for requirements work).
**Files to create:** `.claude/skills/thyrox/references/methodology-selection-guide.md`
**Effort:** M
**Depends on:** GAP-017

---

### GAP-030: registry/agents/ has no coordinator YAMLs — bootstrap.py cannot generate coordinator agents
**Severity:** LOW
**Layer:** Registry
**Current:** `.thyrox/registry/agents/` has 9 YAML files, all for tech-stack agents. No coordinator agent YAMLs exist. The existing coordinator agents in `.claude/agents/` were created manually, not via `bootstrap.py`.
**Needed:** Either (a) add coordinator YAMLs to `registry/agents/` so coordinators can be generated/regenerated via `bootstrap.py`, OR (b) document that coordinator agents are hand-maintained and not generated. The README does not clarify this.
**Files to create/modify:** `registry/agents/dmaic-coordinator.yml` (and all others) OR update `registry/README.md` to document the manual maintenance policy
**Effort:** M
**Depends on:** Decision on generation policy

---

### GAP-031: T-011 and T-016 checkboxes unchecked in skill-anatomy-task-plan.md despite commits being done
**Severity:** LOW
**Layer:** Core
**Current:** `plan-execution/skill-anatomy-task-plan.md` shows `- [ ] T-011` and `- [ ] T-016` as unchecked. Git history confirms commits `70b7e9a` (DMAIC) and `c4c9c6a` (RUP) were completed.
**Needed:** Check the two boxes to reflect actual completion status.
**Files to modify:** `.thyrox/context/work/2026-04-16-18-54-38-multi-methodology/plan-execution/skill-anatomy-task-plan.md`
**Effort:** XS
**Depends on:** none

---

### GAP-032: No methodology-specific coordinator YAMLs in registry/agents/ for new namespaces (lean, ps8, sp, cp, bpa)
**Severity:** LOW
**Layer:** Registry
**Current:** Even if hand-maintained coordinators are created for the 5 missing coordinators, there will be no corresponding registry YAML in `registry/agents/` to enable bootstrap.py generation.
**Needed:** See GAP-030 — the policy decision applies here too. If coordinators will be bootstrapped, YAML definitions are needed.
**Files to create:** `registry/agents/lean-coordinator.yml`, `registry/agents/ps8-coordinator.yml`, `registry/agents/sp-coordinator.yml`, `registry/agents/cp-coordinator.yml`, `registry/agents/bpa-coordinator.yml`
**Effort:** M
**Depends on:** GAP-030

---

## 4. Priority Implementation Order

### Tier 1 — Unblock the 5 pending methodology namespaces (immediate value)

These 5 gaps enable lean/ps8/sp/cp/bpa to work via their own coordinators rather than the generic thyrox-coordinator:

1. **GAP-005** — Resolve ps8 8D vs Toyota TBP schema mismatch (prerequisite for ps8 coordinator)
2. **GAP-001** — Create lean.yml
3. **GAP-002** — Create sp.yml
4. **GAP-003** — Create cp.yml
5. **GAP-004** — Create bpa.yml
6. **GAP-006** — Create lean-coordinator.md
7. **GAP-007** — Create ps8-coordinator.md
8. **GAP-008** — Create sp-coordinator.md
9. **GAP-009** — Create cp-coordinator.md
10. **GAP-010** — Create bpa-coordinator.md

### Tier 2 — Fix existing coordinator gaps (correctness)

11. **GAP-011** — Add `skills:` to pmbok-coordinator
12. **GAP-012** — Add `skills:` to babok-coordinator
13. **GAP-013** — Add `skills:` to rup-coordinator
14. **GAP-014** — Add `skills:` to rm-coordinator
15. **GAP-015** — Add `metadata.triggers` to 32 skills (lean/ps8/sp/cp/bpa)

### Tier 3 — Documentation accuracy (low friction)

16. **GAP-031** — Check T-011 and T-016 boxes
17. **GAP-016** — Fix `*(pendiente)*` label in SKILL.md
18. **GAP-017** — Extend "Selección por necesidad" in SKILL.md
19. **GAP-019** — Fix CLAUDE.md workflow skill names
20. **GAP-018** — Create workflow-diagnose references/
21. **GAP-028** — Update plugin.json description

### Tier 4 — Meta-framework orchestration architecture (major rework)

These gaps require architectural decisions and significant implementation work. They are tracked in `analyze/meta-framework-gap-analysis.md` (GAP-001 through GAP-013 of that document):

22. **GAP-022** — Add native_phase_count/produces/consumes to registry YAMLs
23. **GAP-023** — Extend now.md for multi-coordinator state
24. **GAP-024** — Implement artifact-ready signaling
25. **GAP-025** — Create artifact-registry.md template
26. **GAP-027** — Create orchestration-log.md template
27. **GAP-026** — Update scalability.md anchoring model
28. **GAP-020** — Create routing-rules.yml
29. **GAP-021** — Rework thyrox-coordinator with routing logic
30. **GAP-029** — Create methodology-selection-guide.md reference
31. **GAP-030** — Decide and implement coordinator registry/generation policy
32. **GAP-032** — Add coordinator YAMLs to registry/agents/ (depends on GAP-030)

---

## 5. What Is Complete and Correct (Do Not Touch)

The following components are correctly implemented and should not be modified except for declared gaps above:

**Registry YAMLs (6 of 7 correct):**
- `dmaic.yml` — correct, all fields present
- `pdca.yml` — correct
- `pmbok.yml` — correct (note: `id: pm`, not `pmbok`)
- `babok.yml` — correct (note: `id: ba`, not `babok`)
- `rup.yml` — correct
- `rm.yml` — correct

**Coordinator agents (working correctly):**
- `dmaic-coordinator.md` — correct, has skills array
- `pdca-coordinator.md` — correct, has skills array
- `pmbok-coordinator.md` — functional (missing skills array only — GAP-011)
- `babok-coordinator.md` — functional
- `rup-coordinator.md` — functional
- `rm-coordinator.md` — functional
- `thyrox-coordinator.md` — functional as single-flow generic runner

**Methodology skills — original 6 namespaces (29 skills total):**
All 29 skills (dmaic×5, pdca×4, ba×6, pm×5, rup×4, rm×5) have:
- SKILL.md with correct frontmatter
- `description` with "Use when..." pattern (I-008 compliant)
- `allowed-tools: Read Glob Grep Bash Write Edit` (I-007 compliant)
- `disable-model-invocation: true`
- `**THYROX Stage:**` annotation
- `metadata.triggers` field
- `assets/` directory with at least 1 template
- `references/` directory (except pdca-do — intentional, documented)
- `## Reference Files` section in SKILL.md body

**Methodology skills — new 5 namespaces (32 skills, anatomy correct):**
All 32 skills in lean/ps8/sp/cp/bpa have complete anatomy: SKILL.md + assets/ + references/. Only missing: metadata.triggers (GAP-015) and registry/coordinator integration.

**Workflow skills (all 12 exist):** All 12 workflow-* skills have SKILL.md, assets/, references/ (except workflow-diagnose — GAP-018). All have correct frontmatter with allowed-tools, disable-model-invocation, effort, hooks.

**Core framework files:**
- `.claude/CLAUDE.md` — correct (except workflow names in Addendum FASE 39 — GAP-019)
- `.claude/rules/` — all 4 rules files correct and complete
- `.thyrox/registry/README.md` — correct
- `plugin.json` — functionally correct (description gap is cosmetic — GAP-028)
- `thyrox/SKILL.md` — correct structure (minor label gaps: GAP-016, GAP-017)

**Deterministic scripts (4 scripts, all correct):**
- `dmaic-measure/scripts/calculate-capability.py`
- `dmaic-control/scripts/check-control-limits.py`
- `rup-inception/scripts/check-lco-criteria.sh`
- `rm-management/scripts/count-requirements.sh`

**Other agents (non-coordinator):**
- `diagrama-ishikawa.md` — correct, specialized RCA agent
- `task-executor.md`, `task-planner.md`, `tech-detector.md`, `skill-generator.md` — correct
- `deep-review.md` — correct
- Tech-stack agents (nodejs, react, postgresql, mysql, webpack) — correct
