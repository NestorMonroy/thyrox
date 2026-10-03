# Container image distribution — batch report (2026-10-03)

Root: `/home/user/thyrox`. **No image was deleted or published.** The only
product reference added is none: no product code changed.

## 1. Search Existing matrix

| Requirement | Canonical authority (file · symbol) | Consumers · tests | Rejected / sibling | Decision |
|---|---|---|---|---|
| Podman observation | `podman-execution/podmanObservation.ts` · `snapshot`, `listAllImages`, `inspectImage`, `imageHistory`, `imageUsage`; CLI `observe images|containers|storage|snapshot` (`executionCommand.ts:333-340`) | observer CLI, T005 | raw `podman image inspect` (this bench's `phase3/inspect.json`): non-canonical | **REUSE**. `Parent`/`History` lack a CLI verb → **EXTEND observer surface** under the open task «Route the remaining Podman observers through podman-execution observe» |
| Image inventory and classification | T005: `postgres-corpus-disk-reclaim-20261002T023317/probes/{inventory_observe.sh,t005_classify.py,t005_decisions.json}` | rerun verbatim in `t005-image-observation-rerun-20261003T000046` (sha256 identical) | `probes/image_census.sh`: **SUPERSEDED EXPERIMENTAL EVIDENCE** | **REUSE** |
| Image registry port, publication | `image-registry` (TASK-THYROX-0725/0691): `imageRegistry.ts`, `registryFactory.ts` (provider by configuration), `promotion.ts` · `promoteCandidate` → `publishPromotedImage` (only path; `permanent` only; leak guard) | no production consumer; precedent `publish-task-runner-image-20261002T021834/probes/publish_image.ts` | — | **REUSE** |
| Model artifacts | `artifact-registry` (TASK-THYROX-0728): `artifactRegistry.ts`, `ociDistribution.ts`, `publishArtifact.ts` | `bin/artifact-registry-publish-artifact` | — | **REUSE**, separate from images |
| Lifecycle and GC | `imageLifecycle.ts` (`ephemeral|cache|permanent|infrastructure`, label `io.thyrox.image.lifecycle`); `imageCollector.ts` (`sweepOrphanImages` only `ephemeral`; `evictCacheImages` only `cache`) | no production consumer | — | **REUSE**; none of the 31 carries a lifecycle label |
| Cache-first ensure | `imageResolver.ts` · `createImageResolver` (no consumer; wiring = TASK-THYROX-0726); infrastructure: `infrastructure_ensure` + `podman create` reuses a present tag | — | — | **REUSE**; keyed by mutable tag (H-THYROX-312 → TASK-THYROX-0756) |
| Upstream byte-identical mirror | none: promotion admits only `permanent`, and adding the label changes the digest | — | `RegistryWriter.push` directly would bypass «el único camino» | **MISSING** (design + code) |
| Semantic ingestion of image provenance | `semantic-search-ingest finding|error` (`ingestCommand.ts:28`) | — | forcing images into `finding` | **EXTEND** (new domain) → BLOCKED_BY_BOOTSTRAP |
| Install / preload closure | TASK-THYROX-0676 (P12), TASK-THYROX-0681 (packaging matrix), TASK-THYROX-0726, TASK-THYROX-0756 | — | — | **REUSE tasks**; no new task |

## 2. Image census (canonical: T005 rerun)

38 images; all `safe_to_delete=false`; `expected_reclaim_bytes=0`.

| T005 class | Images | uniqueBytes |
|---|---|---|
| B | redis:7.4, pgvector:0.8.0-pg16, ollama:0.35.0 (in use), both task-runners | 6 077 001 669 total (task-runners: 1 390 and 279) |
| D | thyrox-model-quantizer:dev | 278 |
| E | 31 untagged + ubuntu:24.04 (fallback rule) | 0 |

Ownership and distribution:

| Image | Ownership | Declared at | Distribution today |
|---|---|---|---|
| ollama/ollama:0.35.0 | upstream | `src/lib/infrastructure.sh:125`, `hostCoordinatorComposition.ts:47` | upstream direct; local digest = Hub |
| library/redis:7.4 | upstream | `infrastructure.sh:124` | upstream direct; local = per-platform digest of the Hub tag |
| pgvector/pgvector:0.8.0-pg16 | upstream | `infrastructure.sh:123` | upstream direct; local digest = Hub |
| library/ubuntu:24.04 | upstream | base of 3 Containerfiles; default job image (`publishArtifact.ts:37`, `local-models/bin/ensure.ts:38`) | upstream; **local copy older than the moved tag** |
| th3rox/thyrox-task-runner:ubuntu24.04-bun1.3.11-uv0.8.17 | Thyrox native | not referenced by production code | **VERIFIED_PRESENT** `sha256:1cced65c…` |
| localhost/thyrox-task-runner:dev | Thyrox native | `DEFAULT_EXECUTION_IMAGE` | local only; **blocked for publication** (3 proxy assignments; H-THYROX-424) |
| localhost/thyrox-model-quantizer:dev | Thyrox native | `DEFAULT_LAB_IMAGE` | local only; `lifecycle=cache` |
| localhost/thyrox-transformers-runtime:dev | Thyrox native | `hostCoordinatorComposition.ts:49` | **absent** locally |

## 3. Publication plan

| Image | Action | Status |
|---|---|---|
| thyrox-task-runner (permanent) | none | **VERIFIED_PRESENT** (Milestone A) |
| thyrox-model-quantizer | rebuild through `build-image --lifecycle permanent`, validation evidence, `promoteCandidate` → `publishPromotedImage` | **owner decision**: permanent tool (proposed: yes — it is `DEFAULT_LAB_IMAGE`) and use of the publisher credential marked exposed |
| thyrox-task-runner:dev | do not publish; point `DEFAULT_EXECUTION_IMAGE` at the permanent digest | code → BLOCKED_BY_BOOTSTRAP |
| ollama / redis / pgvector / ubuntu mirrors | none until a mirror path exists | MISSING in authority |
| 31 intermediates | none | not justified (0 unique bytes) |

## 4. Preservation plan (31 untagged)

`outputs/preservation/plan.json`, from `probes/preservation_plan.py` (pure;
canonical class and uniqueBytes from T005; final image from the Parent chain,
non-canonical, declared). GC eligible: **0**.

| Requirement | Count | Images |
|---|---|---|
| PROVENANCE_ONLY_CANDIDATE | 8 | chain of the published task-runner |
| BUILD_CACHE_CANDIDATE | 2 | `b78504eefd22`, `efc2db794f6d` (created by `quantizer-image-build-20261001T020736`, reused by `runner-image-20261001T154236`) |
| KEEP_LOCAL_UNTIL_FINAL_DURABLE | 21 | chains of quantizer and task-runner:dev |

## 5. Install / preload closure (no profile names invented)

| Component | Images | Pinned? | Cold bytes (compressed, Hub) | Warm behavior |
|---|---|---|---|---|
| managed infrastructure | pgvector, redis, ollama | no (mutable tags) | not measured here | `podman create` reuses a present tag (indirect evidence: ollama recreated with unchanged image id `c178b43788bb`) |
| managed execution | task-runner | no (`:dev`) | 143 374 705 (published) | `:dev` not obtainable from distribution |
| model build | quantizer | no | not published | rebuild |
| local AI runtime | ollama; transformers-runtime | no | — | transformers-runtime absent |

Model artifacts remain in ArtifactRegistry, not in images.

## 6. Semantic ingestion plan

One provenance document per final image, plus its intermediate chain:
Intent (role), Mechanism (Containerfile path), image identity, parent chain,
TASK, build bench/job, commit, T005 class, uniqueBytes, outcome, immutable OCI
reference when one exists. Source data: `preservation/provenance.json`,
`preservation/plan.json`. No layers are embedded. Ingestion requires a new
domain in `semantic-search-ingest` → BLOCKED_BY_BOOTSTRAP.

## 7. Open blockers

| Blocker | Code? | Authority / task | State | Next runnable action |
|---|---|---|---|---|
| Parent/History not in the observer CLI | yes | podman-execution · route remaining observers | BLOCKED_BY_BOOTSTRAP | — |
| Pin images by digest | yes | TASK-THYROX-0756 (H-THYROX-312) | BLOCKED_BY_BOOTSTRAP | — |
| Default execution image unpublishable | yes | TASK-THYROX-0726 / H-THYROX-424 | BLOCKED_BY_BOOTSTRAP | — |
| Quantizer publication | no (existing path) | promotion + credential | **owner decision** | rebuild `permanent` once authorized |
| Upstream mirror | yes | image-registry (MISSING) | design decision | — |
| Image provenance ingestion | yes | semantic-search (EXTEND) | BLOCKED_BY_BOOTSTRAP | — |
| Cold fetch + warm cache proof | no, but needs an isolated store or a removable known image | infrastructure_ensure / imageResolver | DEFERRED (disk-constrained; no image may be removed) | — |

## Corrections (2026-10-03, second review) — these override the rows above

### Evidence status

- **PROVEN:**
  - T005 is the canonical inventory and classification baseline.
  - 38 images observed; all `safe_to_delete=false`.
  - The 31 untagged images have `uniqueBytes=0`.
  - Task-runner `sha256:1cced65c…` is present locally and remotely.
  - The quantizer is local only, `lifecycle=cache`.
  - The default task-runner is the local `:dev`, not the published image.
- **PROVISIONAL:**
  - The 8 / 2 / 21 split and the exact Parent → final lineage
    (`classificationStatus: PROVISIONAL_PROVENANCE_CLASSIFICATION` in
    `preservation/plan.json`).
  - That two specific intermediates were reused across builds.
  - These hold until `Parent`/`History` come from the podman-execution
    observer, or until independent durable evidence proves the relation.
- **Unchanged:** `gcEligible = 0`.

### Separate dimensions

T005 class (A–G) is the deletion and reclaim policy and keeps that
responsibility. Ownership, provenance, distribution, lifecycle and semantic
value are separate dimensions, and none of them is encoded in A–G.
`ubuntu:24.04` shows why: it is T005 class E through the fallback rule, yet its
provenance role is upstream base, not build intermediate.

### Corrected matrix rows

| Requirement | Was | Now |
|---|---|---|
| Upstream byte-identical mirror | MISSING | **EXTEND `ImageRegistry`** with an immutable copy operation, then BLOCKED_BY_BOOTSTRAP (detail below) |
| Image provenance ingestion | EXTEND `semantic-search-ingest` with a new domain | **REUSE** the declared `evidence` domain and `corpus.ts`; **EXTEND** with a bench-evidence adapter; SEARCH_INCOMPLETE on the ADR-008 surface (detail below) |
| Quantizer publication | owner decision | **REUSE** the mechanism; lifecycle is a **PERMANENT candidate**; publication **BLOCKED_BY_CREDENTIAL** (detail below) |
| Default execution image (H-THYROX-424) | — | **BLOCKED_BY_BOOTSTRAP** (detail below) |

**Upstream mirror.** `ImageRegistry` already owns publication, so a mirror is
an extension of that port, not a new authority. The copy must preserve source
manifest and blobs, verify the destination digest equals the source, and keep
source provenance. It must not go through `promoteCandidate`, because adding
lifecycle metadata changes the image. No `MirrorRegistry`, `DockerHubMirror`
or parallel authority.

**Image provenance ingestion.**
- Reused as is:
  - `corpusPolicy.ts:33-39` already declares the domain `evidence` (`shared`);
  - `corpus.ts` owns ingestion by `domain · scope · domainId` with versions.
- Missing: an adapter reading bench evidence. The nearest owner is
  TASK-THYROX-0684 («Ingest pool and agent-worktree evidence into the durable
  corpus»), whose scope today is runtime, pool and worktree evidence. That
  adapter is code, so BLOCKED_BY_BOOTSTRAP.
- Rejected:
  - `analysisRuns.ts`: persisted analysis outputs;
  - `archive_build_corpus.py`: archives `_references` builds;
  - `src/learning/experience.py`: RL records, excluded by the A7 contract.
- Not searched: an Intent/Mechanism/Evidence/Outcome specification was not
  found in this repo (0 hits). If it lives in ADR-008 in `kaupamex-docs` (absent
  here), that surface is SEARCH_INCOMPLETE.

**Quantizer publication.**
- Mechanism: REUSE `build-image --lifecycle permanent` → validation →
  `promoteCandidate` → `publishPromotedImage`.
- Lifecycle: PERMANENT candidate, because it is `DEFAULT_LAB_IMAGE` and should
  survive a host recycle.
- Publication: BLOCKED_BY_CREDENTIAL. `THYROX_REGISTRY_PUBLISHER_TOKEN` is
  recorded `exposed` since 2026-10-01
  (`managed-podman-execution-boundary-20261001T164746/credential-rotation.tsv:3`).
  It is not used; a rotated credential is required first.

**Default execution image (H-THYROX-424).** No hardcoded registry reference in
`executionCommand.ts`. The fix converges on:
logical role → `imageResolver` → configured distribution → immutable digest
(TASK-THYROX-0726, TASK-THYROX-0756).

### Batch state

| Sub-batch | State |
|---|---|
| Discovery / census | **CLOSED** |
| Distribution / preload | **OPEN** |

Distribution / preload stays open because no image was newly published, no
mirror exists, cold fetch is not proven, warm cache is not measured, and the
install closure is not executable.

**Next runnable node without product code:** a rotated publishing credential,
which is an external action. Then publish the quantizer through promotion.
