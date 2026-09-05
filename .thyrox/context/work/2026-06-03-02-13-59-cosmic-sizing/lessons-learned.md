```yml
created_at: 2026-06-03T03:52:55Z
project: THYROX
work_package: 2026-06-03-02-13-59-cosmic-sizing
phase: Phase 11 — TRACK/EVALUATE
author: NestorMonroy
status: Aprobado
```

# Lessons — cosmic-sizing

## Resultado

Skill **`cosmic`** (dimensionamiento funcional COSMIC v5.0 / ISO 19761) construido y
**validado**: medición independiente de UC-AUTH-02 = **8 CFP**, coincidencia exacta
movimiento-a-movimiento con la medición publicada de e-comerce (claim OBSERVABLE).

## Recorrido (fases)

DISCOVER (método + scope piloto) → STRATEGY (diseño del skill) → EXECUTE (SKILL.md +
references + assets + manual oficial v5.0 vendorizado) → PILOT (UC-AUTH-02 = 8 CFP ✓).

## Lecciones

1. **ANALYZE-first paga doble:** las referencias COSMIC ya existían (e-comerce-docs,
   clonable directo de GitHub pese al .gitmodules con proxy caído). Buscar primero
   evitó re-derivar el método.
2. **El ejecutor aportó la fuente autoritativa** (MM v5.0 PDFs) → se vendorizó como
   fuente del skill, superando la nota inicial de diseño ("no vendorizar").
3. **Validación contra fuente independiente** convierte el skill de SPECULATIVE a
   OBSERVABLE: medir un UC y checar contra un número publicado es el gate de calidad.
4. **Tooling roto se rodea:** `cryptography` (rust) reventaba pypdf → shim ImportError
   permitió extraer los PDFs sin cifrado.
5. Hallazgo en la fuente: e-comerce cruza R/W en su fila-resumen (E1/X2/R3/W2) vs su
   desglose (1E+2R+3W+2X). Ambos suman 8; el skill coincide con el desglose.

## Pendiente (no bloquea cierre)

- Robustez: medir 1-2 UCs más (UC-INV-02 = 7 CFP, otra capa) — futura iniciativa.
- Registro: documentado vía ADR `adr-cosmic-skill.md` (hand-authored, como python-mcp).
