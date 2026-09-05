# Architecture Decision Records

Este directorio contiene los ADRs (Architecture Decision Records) del proyecto.

Los ADRs documentan decisiones arquitectónicas importantes: por qué se eligió
una tecnología, patrón, o enfoque sobre las alternativas consideradas.

## Convención

Cada ADR sigue el formato `adr-NNN-titulo.md` y usa el template
`.claude/skills/workflow-analyze/assets/adr.md.template`.

## Nota para THYROX

THYROX declara `adr_path: .claude/context/decisions/` en su CLAUDE.md
por retrocompatibilidad. Los ADRs activos de THYROX viven en
`.claude/context/decisions/`.

Este directorio queda preparado para proyectos nuevos que usen pm-thyrox
con el default `docs/architecture/decisions/`.
