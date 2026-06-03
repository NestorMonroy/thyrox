```yml
type: Estado de Sesión
version: 2.2
updated_at: 2026-06-03 05:46:00
cold_boot: false
last_session: 2026-06-03
current_work: .thyrox/context/work/2026-06-03-05-42-51-open-wp-automation
stage: Phase 12 — STANDARDIZE (open-wp-automation — cierre pendiente)
flow: null
methodology_step: null
blockers: []
coordinators: {}
```

# Contexto

ÉPICA 48 **open-wp-automation**: creado `.claude/scripts/open-wp.sh` (inverso de close-wp.sh)
+ marcador `WP-STATUS` en focus.md gestionado por ambos scripts + propagación en
workflow-discover. Mata PAT-001 (focus.md stale al abrir, recurrente ×3). Piloto open→close OK.
Audit minucioso halló E-2 (sed metachar en stage) → corregido. Pendiente: orden de cierre (I-011).
