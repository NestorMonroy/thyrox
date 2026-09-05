```yml
created_at: 2026-06-03T03:49:39Z
project: THYROX
work_package: 2026-06-03-02-13-59-cosmic-sizing
phase: Phase 9 — PILOT/VALIDATE
author: NestorMonroy
status: Borrador
```

# Piloto T-006 — validación del skill cosmic contra e-comerce

**Objetivo:** aplicar el skill `cosmic` a un UC real y contrastar contra la medición
**publicada** de e-comerce. Fuente read-only: `e-comerce-docs` (UC + calibración). El
artefacto vive en **thyrox** (valida NUESTRO skill).

- **UC:** UC-AUTH-02 Iniciar Sesión — `source/requisitos/casos-uso/auth/uc-auth-02-login.rst`
- **Capa/FSM:** api (Principio 6) · **FU:** Usuario Registrado y Verificado
- **Evento desencadenante:** Paso 7 (POST credenciales); pasos 1-6 = UI (0 CFP)
- **Referencia e-comerce:** 8 CFP (`calibracion-inicial-cfp.rst`, T-201)

## Medición independiente con el skill (COSMIC Format)

| Paso | Sub-proceso (FUR) | FU | OOI | Tipo | CFP |
|------|-------------------|----|-----|------|-----|
| 1-6 | Navegación + ingreso de formulario (UI) | Usuario | — | — | 0 |
| 7 | Envía credenciales (email, contraseña, recordarme) | Usuario | UserCredentials | **E** | 1 |
| 8 | Valida formato (procesamiento) | Sistema | — | — | 0 |
| 9 | Verifica origen no bloqueado (rate-limit) | Sistema | LoginAttemptData | **R** | 1 |
| 10 | Normaliza identificador (procesamiento) | Sistema | — | — | 0 |
| 11 | Busca usuario en repositorio | Sistema | User | **R** | 1 |
| 12-14 | Verifica email/activo/contraseña (datos ya leídos en 11) | Sistema | — | — | 0 |
| 15-16 | Emite credenciales (sin DM; el Exit es el paso 20) | Sistema | — | — | 0 |
| 17 | Registra fecha/hora de acceso en perfil | Sistema | User | **W** | 1 |
| 18 | Registra auditoría LOGIN_SUCCESS | Sistema | AuditRecord | **W** | 1 |
| 19 | Restablece contador de intentos | Sistema | LoginAttemptData | **W** | 1 |
| 20 | Retorna credenciales + datos del usuario | Usuario | User/Session | **X** | 1 |
| Alt A-D | Exit de error (genérico/email/cuenta/límite) — contada UNA vez | Usuario | Message | **X** | 1 |

**Total medido: 8 CFP = 1E + 2R + 3W + 2X**

## Contraste

| | E | R | W | X | Total |
|---|---|---|---|---|-------|
| **Skill cosmic (este piloto)** | 1 | 2 | 3 | 2 | **8** |
| **e-comerce (publicado, desglose)** | 1 | 2 | 3 | 2 | **8** |

**Resultado: COINCIDENCIA EXACTA**, movimiento a movimiento. Claim **OBSERVABLE** (I-012):
medición reproducible desde el flujo del UC + verificada contra fuente independiente.

## Qué validó el skill (reglas aplicadas correctamente)

- UI (pasos 1-6) = 0 CFP; el trigger api es el POST (Entrada, paso 7).
- "Sin DM si el dato ya fue leído" (pasos 12-14 reusan la Lectura del paso 11).
- Credenciales emitidas (15-16) no son DM aparte; el Exit es el retorno real (paso 20).
- Rutas de error (PARTE 4) → un Exit de error consolidado, contado **una vez**.
- Mínimo 2 CFP cumplido; 1 Entrada por proceso.

## Hallazgo menor (en la fuente e-comerce, no en el skill)

La fila-resumen de su tabla maestra lista `E1/X2/R3/W2` mientras el desglose detallado y
su "Resumen" dicen `1E+2R+3W+2X`. Ambos suman 8, pero el **orden R/W está cruzado en la
fila-resumen**. El skill coincide con el **desglose detallado** (autoritativo): R=2, W=3.

## Veredicto

**Skill cosmic VALIDADO** en la capa api con un UC real. T-006 cumplido.
Recomendado: medir 1-2 UCs más (p.ej. UC-INV-02 = 7 CFP) para robustez antes de declarar
el skill listo para producción.

---
**Última actualización:** 2026-06-03T03:49:39Z
