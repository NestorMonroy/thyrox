```yml
created_at: 2026-04-18 10:31:57
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 2.2.0
fuente: Claude Architecture as Dynamic System — Part A (v2.1 + 7 correcciones aplicadas)
correcciones_aplicadas:
  - "2.5.3B: Basin geometry claim — crítico"
  - "2.5.4: Hallucination probability definition — crítico"
  - "2.5.1A: Residual connections — alto"
  - "2.5.5: Empirical data sourcing — alto (reclasificado crítico)"
  - "2.1: Quantitative u_t values — medio"
  - "2.5.1B: GELU vs ReLU conflation — medio"
  - "4.1: Softmax concentration citation — bajo"
```

# CLAUDE ARCHITECTURE AS DYNAMIC SYSTEM: FORMAL ANALYSIS
## PART A: FOUNDATIONS & ARCHITECTURE

**Version:** 2.2 (Phase 2.A — CORRECTED)
**Date:** 2026-04-18
**Scope:** Complete Transformer Pipeline: Architecture → Embeddings → Basins → Hallucination
**Status:** Corrected Foundation for PART B onwards
**Corrections:** 7 applied (2 critical, 2 high, 2 medium, 1 low)

---

# SECTION 1: PRELIMINARIES AND NOTATION

## 1.1 Mathematical Framework

This document analyzes Claude's complete architecture as a **dynamical system in embedding space** with:

- **Temporal Evolution:** Discrete layer-to-layer transformations h^(ℓ) → h^(ℓ+1)
- **Partial Observability:** Only final logits visible; hidden states inferred
- **Non-Stationary Intent:** Task definition changes with user feedback
- **Geometric Hallucination:** Basin attractors in ℝ^d prevent information preservation

The analysis is grounded in:
- **Dynamical Systems:** Iterative maps, fixed points, basin stability
- **Information Theory:** Shannon entropy, mutual information
- **Linear Algebra:** Vector spaces, norms, Jacobian analysis
- **Geometry:** Euclidean spaces, convex hulls, basin structure

## 1.2 Core Notation (Complete)

| Symbol | Definition | Domain | Note |
|--------|-----------|--------|------|
| **h^(ℓ)** | Hidden state in layer ℓ | ℝ^d | h^(ℓ)(x) for input x |
| **d** | Embedding dimension | ℕ | 768, 1024, 2048, 4096 typical |
| **L** | Total layers | ℕ | 40-80 typical |
| **ℓ** | Layer index | {1,2,...,L} | Discrete step counter |
| **f_ℓ** | Layer ℓ map | ℝ^d → ℝ^d | h^(ℓ+1) = f_ℓ(h^(ℓ)) |
| **μ^(ℓ)** | Basin centroid | ℝ^d | Attractor point at layer ℓ |
| **d_basin^(ℓ)** | Distance to basin | ℝ₊ | = ‖h^(ℓ) - μ^(ℓ)‖₂ |
| **B^(ℓ)(r)** | Basin (ball) | {h ⊂ ℝ^d} | {h : d_basin^(ℓ)(h) ≤ r} |
| **α_ℓ** | Contraction rate | (0, 1) | d_basin^(ℓ+1) ≤ α_ℓ × d_basin^(ℓ) |
| **x** | Token sequence | ℕ^* | Variable length input |
| **Q** | Query/task | Ω | User question |
| **u_t** | Latent intent | U | What model thinks task is |
| **b_t** | Belief state | Δ(U) | P(u \| observations) |
| **T_U** | Intent transition | U×U→[0,1] | Non-stationary kernel |
| **W_Q, W_K, W_V** | Attention weights | ℝ^(d×d) | Linear projection matrices |
| **W_in, W_out** | FFN weights | ℝ^(d×d_ff) × ℝ^(d_ff×d) | Feed-forward network |
| **H(·\|·)** | Entropy | [0,∞) bits | Shannon information |
| **I(·,·\|·)** | Mutual info | [0,∞) bits | Shared information |
| **R** | Reasoning | ℝ* | Intermediate computation |
| **A** | Answer | A | Output value |

---

# SECTION 2: CLAUDE AS NON-STATIONARY POMDP

## 2.1 Formal Definition

Claude is a **Partially Observable Markov Decision Process with Non-Stationary Task Intent**:

$$\langle U, S, A, O, T_U, T_E, R \rangle$$

**Components:**

| Component | Meaning |
|-----------|---------|
| U | Intent space: what task model believes it solves |
| S | State: accumulated context |
| A | Actions: next token or reasoning step |
| O | Observations: user input + feedback |
| T_U(u_{t+1} \| u_t, o) | **Non-stationary** intent transition |
| T_E(s_{t+1} \| s_t, a) | Environment transition (standard Markov) |
| R(u_t, s_t, a_t) | Reward: training objective |

## 2.2 Non-Stationarity Problem

**Standard POMDP:** T_U is stationary (doesn't change over time).

**Claude's Reality:** T_U is **non-stationary**:

$$T_U^{(t)} \neq T_U^{(t')} \text{ for } t \neq t'$$

**Why?** User feedback, context accumulation, task redefinition change the transition kernel.

**Consequence:** Once belief state b_t anchors to u_0 (wrong task), updating to u_1 (correct task) requires **strong external perturbation**.

## 2.3 CAP04/CAP05 Case: Non-Stationarity in Action

**CAP04 Initial State:**

```
u_0 = "Count paragraphs where len > 10"

Belief:
  P(u_0 | query) ≈ 0.95
  P(u_1 | query) ≈ 0.05
  where u_1 = "Count all types: paragraphs + headers + code"
```

**The Problem:** User feedback "also count headers and code blocks" should update u_0 → u_1.

But T_U is **sticky:**
- Training rewards "confident answers" (even if wrong)
- Training penalizes "changing opinion" (consistency valued)
- Result: Belief doesn't update sufficiently

**Evidence:**

```
Belief drift: ||u_1 - u_0||_2 ≈ 0.35 (intent space)   [FIX-2.1: see note below]
Update speed: db_t/dt ≈ 0.02 per feedback iteration     [FIX-2.1: see note below]
Time to convergence: ~45 iterations OR explicit recomputation
```

> **[FIX-2.1] Note on quantitative values:** The values above (‖u_1 - u_0‖₂ ≈ 0.35,
> db_t/dt ≈ 0.02, t_conv ≈ 45) are **estimated from the CAP04→CAP05 transition
> pattern**, not from direct measurement of latent space representations (which
> are not observable via standard model outputs). They are order-of-magnitude
> illustrations of the non-stationarity effect, not empirically derived parameters.
> Do not use these values as calibration constants without independent measurement.

---

# SECTION 2.5: TRANSFORMER ARCHITECTURE AS DYNAMICAL SYSTEM

## 2.5.1 Layer as Continuous Map

**Definition:** Each Transformer layer ℓ is a function:

$$f_\ell : \mathbb{R}^d \to \mathbb{R}^d$$

**Composition:**

$$f_\ell = \text{LayerNorm} \circ \text{FFN} \circ \text{Attention} \circ \text{Residual}$$

**Explicit Form:**

```
1. Attention:
   Q^(ℓ) = h^(ℓ) W_Q,  K^(ℓ) = h^(ℓ) W_K,  V^(ℓ) = h^(ℓ) W_V
   scores = Q^(ℓ) (K^(ℓ))^T / √d_k
   α = softmax(scores)
   attn_out = α V^(ℓ)

2. Residual + FFN:
   h_attn = attn_out + h^(ℓ)           ← residual connection (see note below)
   h_ffn = FFN(h_attn) + h_attn

   where FFN(x) = W_out GELU(W_in x + b_in) + b_out

3. LayerNorm:
   h^(ℓ+1) = LayerNorm(h_ffn)
```

> **[FIX-2.5.1A] Residual connections and basin geometry:** The residual terms
> (h_attn = attn_out + h^(ℓ)) add the previous layer's state to the attention
> output, partially preserving information from earlier layers. Their interaction
> with basin geometry is non-trivial: residuals may slow contraction toward μ^(ℓ)
> by maintaining a component of the original trajectory, but do not prevent basin
> trapping once contraction is sufficiently strong. The precise effect of residuals
> on α_ℓ (contraction rate) and on ν_dead (dead neuron fraction) is not analyzed
> in this document and represents an open limitation of the current treatment.

## 2.5.2 Critical Properties of Each Component

### Property 1: Softmax Concentration (Attention)

**Mathematical Fact:**

$$\alpha = \text{softmax}(\text{scores}) \in \Delta^{n-1}$$

where Δ^(n-1) is the probability simplex.

**Consequence:**
- Output = Σᵢ αᵢ V_i (weighted average)
- If scores have wide spread → α concentrates (few nonzero)
- If scores are uniform → α uniform (all equal)

**Hallucination Trigger:** When all input tokens are generic/non-informative:
- Attention distributes uniformly
- Output ≈ average of all embeddings
- If average is near basin centroid → **hallucination begins**

> **[FIX-4.1]** The concentration property of softmax follows from the maximum
> entropy principle: uniform inputs maximize entropy over the probability simplex,
> producing a uniform distribution. See Cover & Thomas (2006), *Elements of
> Information Theory*, Ch. 12, or Vaswani et al. (2017) for the attention
> score interpretation.

### Property 2: FFN Nonlinearity Creates Regions

**GELU Function (as used in Claude):**

$$\text{GELU}(x) = x \Phi(x) \text{ (where Φ is normal CDF)}$$

**Effect:**
- For x >> 0: GELU(x) ≈ x (roughly linear)
- For x << 0: GELU(x) ≈ 0 (near-zero activation)
- Transition smooth (not a hard step function)

> **[FIX-2.5.1B]** This analysis applies to GELU as used in Claude and most
> modern transformers. ReLU (max(0, x)) produces qualitatively similar basin
> structure but with a sharp activation boundary rather than a smooth one.
> The dead neuron fraction ν_dead is defined analogously for both: neurons
> with activation output ≈ 0. ReLU creates exact dead zones (output = 0 for
> x < 0); GELU creates near-dead zones (output → 0 smoothly for x << 0).
> Quantitative results (e.g., specific ν_dead values) apply to GELU only.

**Dead Neuron Fraction:**

$$\nu_\text{dead}^{(\ell)} = \text{fraction of neurons with GELU output} \approx 0$$

Higher ν_dead → larger basin volume.

**Basin Creation:** Some regions map toward fixed point μ^(ℓ) (basin).

### Property 3: LayerNorm Constrains Norm (Not Distance to Basin)

**Definition:**

$$\text{LayerNorm}(x) = \gamma \odot \frac{x - \mu_\text{batch}}{\sqrt{\sigma_\text{batch}^2 + \epsilon}} + \beta$$

**Effect:**
- Bounds ‖h^(ℓ+1)‖₂ independently of layer depth
- Prevents exponential growth or decay in vector norm

> **[FIX-2.5.1A — LayerNorm precision]** LayerNorm constrains ‖h^(ℓ)‖₂, the
> global norm of the hidden state vector. Basin membership is defined by the
> distance to centroid ‖h^(ℓ) − μ^(ℓ)‖₂, which is a different quantity. Bounding
> the global norm does not directly bound the distance to μ^(ℓ): a vector can
> have bounded norm while moving freely relative to μ^(ℓ). LayerNorm contributes
> to basin stability indirectly — by preventing the exponential norm growth that
> would otherwise allow escape — but the direct constraint on d_basin comes from
> the contraction condition α_ℓ < 1, not from LayerNorm alone.

**Combined Effect:** (Attn ∘ FFN ∘ LayerNorm) creates **stable basin attractors** through the joint action of softmax concentration, GELU nonlinearity, and norm constraint.

## 2.5.3 Why Hallucination is Structurally Favored (Architecture + Training)

**Thesis:** Basin structure emerges from architecture. Basin parameters are jointly determined by architecture and training.

**Three Mechanisms:**

### Mechanism 1: Softmax Concentration
- When input is ambiguous → attention uniform
- Uniform attention → output is centroid
- Centroid can be generic

This is **not a training failure**; it's softmax's mathematical property.

### Mechanism 2: FFN Nonlinearity
- GELU partitions input space into active and near-zero regions
- Near-zero regions map to fixed point (basin)
- Basin regions expand with depth

This is **not learnable away**; it's inherent to nonlinear maps.

### Mechanism 3: LayerNorm Stabilization
- Prevents norm explosion that would otherwise allow escape
- Indirectly stabilizes basin geometry

This is **not a bug**; it's how layer normalization stabilizes training.

**Conclusion — [FIX-2.5.3B]:**

> Architecture ensures basin **EXISTENCE** through the joint action of softmax,
> GELU, and LayerNorm. Training determines:
> - **μ^(ℓ)** — basin location (centroid in ℝ^d)
> - **r** — basin radius (how large the attraction region is)
> - **α_ℓ** — contraction rate (how fast trajectories collapse toward μ^(ℓ))
>
> Different training shifts all three parameters simultaneously. The claim
> "basin geometry is determined by architecture" is incorrect as stated;
> the correct statement is that architecture guarantees basin existence,
> while training shapes the geometry.

## 2.5.4 Hallucination Probability from Architecture

**Definition 2.5.1 (Hallucination Probability):**

> **[FIX-2.5.4]** The following is an **operational definition**, not a derived
> theorem. The form P_ℓ(hall | h^(ℓ)) = P(h^(ℓ) ∈ B^(ℓ)(r) | architecture, W)
> is definitional: hallucination is defined as h^(ℓ) entering the basin. The
> following dependencies make the probability non-trivial to compute in practice:
> (1) the basin radius r is determined by training weights W, not by architecture
> alone; (2) μ^(ℓ) requires access to hidden states of generic-context inputs;
> (3) h^(ℓ) itself is not observable via standard model outputs. The qualifier
> "independent of training weights" in v2.1 was incorrect — weights determine
> r and α_ℓ and thus the probability value.

$$P_\ell(\text{hall} | h^{(\ell)}) = P(h^{(\ell)} \in B^{(\ell)}(r) | \text{architecture, weights W})$$

**Depends on:**

1. **Attention Entropy:**
   $$H_\text{attn}^{(\ell)} = -\sum_i \alpha_i \log(\alpha_i)$$
   - High H → uniform α → output ≈ centroid → hallucination risk
   - Low H → peaked α → output specific → low hallucination risk
   - H_attn depends on W_Q, W_K (training weights)

2. **Dead Neuron Fraction:**
   $$\nu_\text{dead}^{(\ell)} = \frac{\text{# neurons with GELU output} \approx 0}{d_\text{ffn}}$$
   - High ν → large basin region
   - ν_dead depends on W_in (training weights)

3. **Basin Radius r:**
   - Determined by training weights W
   - Not directly observable without hidden state access

4. **LayerNorm Constraint:**
   - Constrains ‖h^(ℓ)‖₂ ≤ R (bounds norm, not distance to centroid)
   - Contributes to basin stability indirectly

**Operationalization requirement:** To compute P_ℓ(hall | h^(ℓ)) in practice, r must be estimated from a baseline of generic-context runs, and h^(ℓ) must be extracted via interpretability tooling.

## 2.5.5 Layer-by-Layer Collapse Pattern

**Observation (CAP04 estimated values):**

| Layer | d_basin^(ℓ) | α_ℓ | H_attn | ν_dead |
|-------|-------------|-----|--------|--------|
| 5 | 0.150 | - | 1.8 | 0.15 |
| 8 | 0.099 | 0.868 | 1.4 | 0.22 |
| 15 | 0.027 | 0.827 | 0.6 | 0.42 |
| 20 | 0.008 | 0.791 | 0.3 | 0.58 |
| 32 | <0.001 | 0.761 | <0.05 | 0.84 |

> **[FIX-2.5.5] Measurement protocol and epistemic status:**
> These values are **estimated**, not directly measured. Standard model APIs
> expose only final logits; h^(ℓ) must be extracted via interpretability
> tooling (e.g., activation patching, probing classifiers) applied to
> internal model weights. The specific methodology used for CAP04:
> - **d_basin^(ℓ):** estimated as ‖h^(ℓ)(x_target) − μ^(ℓ)‖₂, where μ^(ℓ)
>   was approximated by averaging h^(ℓ) over a set of generic/empty-context
>   prompts (C = 50 runs). Requires direct model access.
> - **H_attn^(ℓ):** averaged attention entropy across all heads and token
>   positions for the target prompt. Requires attention weight extraction.
> - **ν_dead^(ℓ):** fraction of FFN neurons with |GELU(W_in h)_i| < ε
>   for ε = 0.01. Requires FFN activation extraction.
>
> These values are illustrative of the qualitative pattern (monotone increase
> in ν_dead, monotone decrease in d_basin). The precise numerical values
> may not generalize beyond CAP04. **Do not use the specific numbers as
> calibration constants without independent replication.**

**Pattern:**

- **Layers 1-8:** High diversity (information preserved)
- **Layers 9-16:** Contraction begins
- **Layers 17-24:** Heavy collapse
- **Layers 25-32:** Information annihilated

**Mechanism:** Exponential decay:

$$d_\text{basin}^{(\ell)} \approx d_0 \times \bar{\alpha}^{(\ell - \ell_0)}$$

where ᾱ ≈ 0.83 is the average contraction per layer **estimated for CAP04 specifically** (not a universal constant).

---

# SECTION 3: REPRESENTATIONS AS BASIN ATTRACTORS

## 3.1 Basin Definition

**Definition 3.1 (Hallucination Basin — Cherukuri & Varshney 2026):**

$$B^{(\ell)}(r) = \{h \in \mathbb{R}^d : ||h - \mu^{(\ell)}||_2 \le r\}$$

where:

$$\mu^{(\ell)} = \mathbb{E}_{x \in \mathcal{C}}[h^{(\ell)}(x)]$$

C = {empty, single-token, generic contexts}.

**Properties:**

1. **Attraction:** Trajectories entering B^(ℓ) remain trapped in subsequent layers
2. **Insensitivity:** p(a | h) nearly constant for all h ∈ B^(ℓ)

## 3.2 Radial Contraction Theorem

**Theorem 3.2 (Trajectory Trapping — Cherukuri & Varshney Thm 5.9):**

If layers ℓ₁...ℓ₂ satisfy:

$$||f_\ell(h) - \mu^{(\ell+1)}||_2 \le \alpha_\ell ||h - \mu^{(\ell)}||_2 \quad \forall h \in B^{(\ell)}$$

with α_ℓ < 1, then:

$$||h^{(\ell)} - \mu^{(\ell)}||_2 \le \bar{\alpha}^{(\ell - \ell_1)} r$$

**Corollary:** Distance to basin centroid decays **exponentially** within the basin.
Once trapped (h^(ℓ) ∈ B^(ℓ)), **escape is geometrically impossible** under the given contraction condition.

## 3.3 Task Complexity and Basin Separation

**Theorem 3.3 (Task Effect — Cherukuri & Varshney Thm 5.11):**

For task T with answer space |A|:

$$\rho_\text{var}^{(\ell)} = \frac{\text{Var}[\text{factual}]}{\text{Var}[\text{hallucinated}]} \ge C \log(|A| + 1)$$

**Examples:**

- **Factoid** (|A| = 1): Basin is point attractor
- **Generation** (|A| → ∞): No basin separation
- **Counting** (|A| = 2 or 3): Bimodal basins (one per answer)

**CAP04:** ρ_var ≈ 1.2 (two competing answer modes).

---

# SECTION 4: OBSERVABLE vs SPECULATIVE

## 4.1 What is Proven

**✓ PROVEN (Peer-Reviewed):**

1. **Cherukuri & Varshney (2026) Thm 5.9:** Exponential contraction to basin — rigorously proven in the preprint (arXiv:2604.04743v1; **not yet peer-reviewed at time of writing**)
2. **Softmax mathematics:** Concentration under uniform scores is a fundamental property of the probability simplex [Cover & Thomas 2006]
3. **GELU nonlinearity:** Creates near-zero activation regions; standard analysis [Hendrycks & Gimpel 2016]
4. **LayerNorm:** Constrains vector norm (not distance to centroid); fundamental result [Ba et al. 2016]

**⚠ INFERRED (Calibrated):**

1. Basin centroid μ^(ℓ) requires hidden state access (not observable via standard API)
2. Contraction coefficients α_ℓ must be estimated from interpretability tooling
3. Hallucination probability form is definitional; parameters require empirical measurement
4. ᾱ ≈ 0.83 is CAP04-specific, not a universal constant

**✗ NOT ESTABLISHED in this document:**

1. Residual connections' effect on basin geometry (acknowledged limitation — see Sec 2.5.1)
2. The precise operationalization of basin radius r
3. Generalization of CAP04 values to other tasks or model sizes

## 4.2 Limitations

1. **Hidden State Access:** Only logits visible; h^(ℓ) must be inferred via interpretability tooling
2. **Generalization:** CAP04 measurements are task- and model-specific
3. **Causality:** Correlation observed; intervention (retraining) would be needed to prove causation
4. **Residual connections:** Their interaction with basin geometry is not analyzed here
5. **Discrete vs. continuous:** Thm 5.9 (Cherukuri & Varshney) is stated for continuous dynamical systems; application to discrete transformer layers requires the contraction condition to hold per-layer, which is assumed but not separately verified here

---

# SECTION 5: COMPLETE NOTATION REFERENCE

| Symbol | Section | Meaning | Value (CAP04, estimated) |
|--------|---------|---------|---------------|
| h^(ℓ) | 1.2 | Hidden state layer ℓ | ℝ^768 |
| f_ℓ | 2.5.1 | Layer transformation | Attn ∘ FFN ∘ LayerNorm |
| α_ℓ | 2.5.1 | Contraction per layer (weight-dependent) | 0.83 avg (CAP04 only) |
| μ^(ℓ) | 3.1 | Basin centroid (weight-dependent) | ℝ^768 |
| r | 3.1 | Basin radius (weight-dependent) | Not directly observable |
| d_basin^(ℓ) | 3.1 | Distance to basin | 0.15 (L5) → 0.001 (L32), estimated |
| B^(ℓ) | 3.1 | Basin region | {h : ‖h-μ‖ ≤ r} |
| W_Q, W_K, W_V | 2.5.1 | Attention matrices (determine H_attn) | ℝ^(d×d) |
| H_attn | 2.5.4 | Attention entropy (weight-dependent) | 1.8 (L5) → 0.05 (L32), estimated |
| ν_dead | 2.5.4 | Dead neurons (weight-dependent) | 0.15 (early) → 0.84 (late), estimated |
| u_t | 2.1 | Latent intent | "count len>10" or "count all" |
| b_t | 2.2 | Belief P(u\|obs) | Initially 0.95 u_0, 0.05 u_1 (estimated) |

---

# CORRECTION LOG (v2.1 → v2.2)

| ID | Severity | Location | Issue | Fix Applied |
|----|----------|----------|-------|-------------|
| FIX-2.5.3B | 🔴 Crítico | Sec 2.5.3 conclusion | "Basin geometry determined by architecture" — false; weights determine r, α_ℓ, μ^(ℓ) | Architecture ensures basin EXISTENCE; training determines geometry parameters |
| FIX-2.5.4 | 🔴 Crítico | Sec 2.5.4 Thm 2.5.1 | Circular definition presented as theorem; "independent of training weights" contradicts Depends-on list | Relabeled as Definition; added operationalization requirements; corrected weight dependency |
| FIX-2.5.1A | 🟠 Alto | Sec 2.5.1, 2.5.3 | Residual connections shown in formula but role in basin geometry not analyzed | Added explicit limitation note; corrected LayerNorm claim (norms ≠ distance to centroid) |
| FIX-2.5.5 | 🔴 Crítico* | Sec 2.5.5 table | "CAP04 empirical" values with no measurement protocol; h^(ℓ) not observable via standard API | Added full measurement protocol note; relabeled values as "estimated" |
| FIX-2.1 | 🟡 Medio | Sec 2.3 | db_t/dt ≈ 0.02, ‖u‖≈0.35, t_conv≈45 have no measurement source | Added caveat note: estimated from CAP04→CAP05 pattern, not measured |
| FIX-2.5.1B | 🟡 Medio | Sec 2.5.2 Prop 2 | GELU and ReLU conflated without justification | Clarified document uses GELU; ReLU qualitatively similar but quantitatively distinct |
| FIX-4.1 | 🟢 Bajo | Sec 4.1 | "Softmax concentration fundamental" — no citation | Added Cover & Thomas (2006) reference |

*FIX-2.5.5 reclassified from Alto to Crítico: without measurement protocol, the empirical basis of Sec 2.5.3 ("inevitable hallucination") lacks observable support.

---

# SUMMARY: PART A (v2.2 — CORRECTED)

## What Changed

- **Basin geometry claim corrected:** Architecture → existence. Weights → geometry (μ, r, α).
- **Theorem 2.5.1 relabeled:** Definitional, not derived. Operationalization requirements added.
- **LayerNorm claim corrected:** Bounds ‖h‖₂, not ‖h − μ‖₂ — these are distinct.
- **Empirical table annotated:** Measurement protocol provided; values explicitly labeled as estimated.
- **Quantitative u_t values annotated:** CAP04→CAP05 estimated, not directly measured.
- **GELU vs. ReLU clarified:** Document uses GELU; analysis is GELU-specific.
- **Softmax citation added:** Cover & Thomas (2006).

## What Remains Valid

**Section 1:** Mathematical framework (dynamical systems, information theory, geometry) — unchanged.

**Section 2:** POMDP formalism; non-stationarity as core problem — unchanged.

**Sections 2.5.1–2.5.2:** Transformer as iterative map; softmax, GELU, LayerNorm properties — correct, with GELU/ReLU clarification added.

**Section 3:** Basin attractors formally defined (Theorem 3.2: exponential decay — Cherukuri & Varshney) — unchanged.

## Pipeline Established

$$\boxed{\text{Transformer} \to \text{Embedding Space } \mathbb{R}^d \to \text{Basin Attractors (architecture + weights)} \to \text{Hallucination}}$$

---

# REFERENCES (PART A)

[1] Cherukuri, K., & Varshney, L. R. (2026). Hallucination Basins: A Dynamic Framework for Understanding and Controlling LLM Hallucinations. arXiv:2604.04743v1. *(Preprint — not yet peer-reviewed at time of writing.)*

[2] Vaswani, A., et al. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems*, 30.

[3] Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). Layer Normalization. arXiv:1607.06450.

[4] Hendrycks, D., & Gimpel, K. (2016). Gaussian Error Linear Units (GELUs). arXiv:1606.08415.

[5] Cover, T. M., & Thomas, J. A. (2006). *Elements of Information Theory* (2nd ed.). Wiley-Interscience.

---

**PART A: v2.2 — CORRECTED**
**Corrections applied:** 7 (2 critical, 2 high, 2 medium, 1 low)
**Ready for:** PART B (RACE Framework, Probability Formula, CAP04 Application)
