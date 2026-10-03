# H-THYROX-454

```json
{
 "finding_id": "H-THYROX-454",
 "created_at": "2026-10-03T20:54:49",
 "updated_at": "2026-10-03T20:54:49",
 "severity": "ALTA",
 "initiative": "actualizar-agentic-ai-thyrox",
 "status": "open",
 "source_ref": ".claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md",
 "observations": [
  {
   "fact": "Observado 2026-10-03T20:46Z: observe containers devolvió thyrox-ollama, -postgres, -redis y una worker-unit como running con pids ausentes de /proc (pid 1 = process_api). local_control_plane_ready --help ejecutó la recuperación de locks (0/13 KNOWN_POST_REBOOT_RECOVERABLE → 13/13 HEALTHY) y dejó los cuatro en created; podman_capabilities --help corrió sus sondas con contenedores efímeros. contenedor existe != servicio sano.",
   "evidence": ".claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md"
  }
 ],
 "assessment_history": [
  {
   "timestamp": "2026-10-03T20:54:49",
   "previous": null,
   "new": "registrado",
   "reason": "versión única en el store",
   "evidence": [
    ".claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md"
   ]
  }
 ],
 "current_assessment": "Tras reciclar la VM, Podman declara running cuatro contenedores cuyos pids no existen; dos guiones ignoran --help y ejecutan"
}
```

## OBSERVATION

- Observado 2026-10-03T20:46Z: observe containers devolvió thyrox-ollama, -postgres, -redis y una worker-unit como running con pids ausentes de /proc (pid 1 = process_api). local_control_plane_ready --help ejecutó la recuperación de locks (0/13 KNOWN_POST_REBOOT_RECOVERABLE → 13/13 HEALTHY) y dejó los cuatro en created; podman_capabilities --help corrió sus sondas con contenedores efímeros. contenedor existe != servicio sano. — `.claude/workbench/thyrox-state-audit-20261003T204631/outputs/REPORT.md`

## ASSESSMENT HISTORY

- 2026-10-03T20:54:49: None → **registrado** — versión única en el store

## CURRENT ASSESSMENT

Tras reciclar la VM, Podman declara running cuatro contenedores cuyos pids no existen; dos guiones ignoran --help y ejecutan
