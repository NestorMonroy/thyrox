```yml
Tipo: Borrador de ADR/finding (deliverable para e-comerce)
Preparado: 2026-06-03T00:29:18Z
Destino: jcg-admin/e-comerce → docs/source/frontend/adr/ (o backend/adr/ según resuelva el hecho)
Estado: PROPUESTO — bloqueado por 1 hecho verificable
Nota: e-comerce usa RST/Sphinx; abajo va el contenido y su versión RST lista para pegar.
```

# F-PROD-03 / ADR — Retry de pagos: gate de elegibilidad vs re-initiate (UC-PAY-08)

## El hecho que desbloquea la decisión (rellenar esto primero)

> **¿El backend valida la elegibilidad de retry en el endpoint de `initiate`/re-initiate?**
> Verificar en el handler de `POST payments .../initiate`: ¿rechaza un re-intento si el
> pago no es elegible (estado, ventana temporal, nº de intentos), o lo acepta sin chequear?

`[ ] Backend SÍ valida (server-side)`   `[ ] Backend NO valida`

## Contexto

- `retry-eligibility` (UC-PAY-08) existe en el backend pero **no tiene consumidor en UI**.
- `paymentsSlice.js:77`: "Retry = re-initiate: no hay endpoint separado" → la UI reintenta
  re-iniciando y **nunca consulta elegibilidad**.
- Detectado en el sweep buy-flow L4↔L5 (cart/orders/returns 100%; payments este único hueco).

## Decisión (se elige UNA rama según el hecho)

### Rama A — el backend SÍ valida (decisión de producto, prioridad baja)
`retry-by-reinitiate` es **correcto**: el servidor ya rechaza re-intentos inelegibles. El
endpoint `retry-eligibility` es **UX redundante** (solo evitaría un round-trip fallido).
- **Decisión:** mantener retry-by-reinitiate. Marcar `retry-eligibility` como
  *intencionalmente sin consumidor UI* o **deprecarlo** si no aporta otra UX.
- **Consecuencia:** cero cambio funcional; opcional limpiar el endpoint muerto.

### Rama B — el backend NO valida (es un BUG, prioridad alta)
Re-iniciar sin gatear deja pasar **reintentos inelegibles** → riesgo funcional/financiero.
- **Decisión:** gatear antes de re-iniciar. Dos opciones (elegir):
  - **B1 (UI):** la UI consume `retry-eligibility` y solo re-inicia si es elegible.
  - **B2 (backend):** `initiate` valida elegibilidad server-side y devuelve 409 si no.
  - Recomendado **B2** (la regla vive en el backend, fuente de verdad) + B1 como UX.
- **Consecuencia:** cierra un bug real; B1 añade un round-trip; B2 endurece el contrato.

## Acción de cierre

1. Resolver el hecho (arriba) — 5 min mirando el handler de initiate.
2. Marcar la rama, completar `:fecha:` con `date -u +"%Y-%m-%dT%H:%M:%S"`.
3. Si Rama B → crear task de fix (B1/B2). Si Rama A → opcional task de limpieza.
4. Commitear el ADR en el `adr_path` correspondiente; registrar en el SMD.

---

## Versión RST (pegar en e-comerce)

```rst
.. reporte::
   :agente: thyrox-audit (preparado), <ejecutor> (resuelto)
   :tarea: F-PROD-03 — retry de pagos: gate de elegibilidad vs re-initiate (UC-PAY-08)
   :fecha: <date -u +"%Y-%m-%dT%H:%M:%S">
   :herramientas: git, grep, lectura de paymentsSlice.js y handler de initiate
   :basado-en: develop f58536a, sweep buy-flow L4↔L5

ADR — Retry de pagos: elegibilidad vs re-initiate (UC-PAY-08)
=============================================================

Estado
------
PROPUESTO — bloqueado por: ¿el backend valida elegibilidad en initiate? [ ] SÍ  [ ] NO

Contexto
--------
``retry-eligibility`` no tiene consumidor UI; ``paymentsSlice.js:77`` reintenta
re-iniciando sin consultar elegibilidad.

Decisión
--------
Rama A (backend SÍ valida): mantener retry-by-reinitiate; marcar el endpoint como
intencionalmente sin consumidor o deprecarlo.
Rama B (backend NO valida): es bug — gatear (B1 UI consume retry-eligibility / B2
initiate valida server-side, recomendado). 

Consecuencias
-------------
A: sin cambio funcional. B: cierra bug; B2 endurece el contrato del backend.
```
