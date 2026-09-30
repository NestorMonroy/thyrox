```yml
created_at: 2026-06-03T02:13:59
project: THYROX
work_package: 2026-06-03-02-13-59-cosmic-sizing
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# Piloto COSMIC — e-comerce buy-flow (recolección de scope)

> Validará el skill COSMIC de THYROX. Insumo: la auditoría buy-flow L4↔L5 ya hecha
> (`work/.../analysis/ecomerce-audits.md`). Aquí mapeamos esos endpoints al modelo COSMIC.

## Measurement Strategy (borrador)

- **Propósito:** dimensionar funcionalmente el buy-flow de e-comerce (PracticaYoruba) para
  validar el método/skill COSMIC de THYROX.
- **Scope:** capa funcional del buy-flow: **cart, orders, payments, returns** (API + UI que
  la consume). Excluye catálogo/auth/admin (otra medición).
- **Functional users (candidatos):**
  - **Shopper** (UI React) ↔ API (boundary principal).
  - **Gateway de pago** (Mercado Pago) ↔ API (boundary secundaria: webhooks, initiate).
  - **Admin** (si aplica a returns/orders).
- **Granularidad:** un proceso funcional por endpoint/caso de uso elemental.

## Inventario de procesos funcionales candidatos (de la auditoría)

| App | Proceso funcional (trigger) | Functional user | Estado dato |
|-----|------------------------------|-----------------|-------------|
| cart | ver carrito, add item, update item, remove item, vaciar, … (6) | Shopper | endpoints ✓; falta E/X/R/W |
| orders | checkout, cancel, set address, set shipping, … (6) | Shopper | endpoints ✓; falta E/X/R/W |
| payments | initiate, installments, status, history, refund | Shopper | endpoints ✓; falta E/X/R/W |
| payments | **retry-eligibility** (sin consumidor UI — F-PROD-03) | Shopper | ⚠ decisión producto pendiente |
| payments | webhook (payment notification) | **Gateway** | server-only; functional user = gateway |
| returns | crear/list returns, detalle return | Shopper/Admin | endpoints ✓; falta E/X/R/W |

## Data groups (objects of interest) preliminares

cart, cart-item, order, order-line, address, shipping-option, payment, installment-plan,
payment-status, refund, return, return-item, product (read), user/customer (read).

## Qué FALTA recolectar para contar CFP (gap)

Para cada proceso funcional necesitamos sus **movimientos de datos**, que requieren leer el
código de la API (request/response + lecturas/escrituras a DB):

- [ ] **Entry/Exit:** estructura de request y response de cada endpoint (qué data groups cruzan).
- [ ] **Read/Write:** qué entidades lee/escribe cada handler en MariaDB.
- [ ] Confirmar **functional users** reales (¿webhooks = gateway como functional user?).

> **Bloqueo de acceso:** los submódulos de e-comerce (api/ui/server/docs) **no son
> clonables** (`127.0.0.1` caído). El conteo CFP fino requiere ese acceso, o que la sesión
> de e-comerce provea los data movements por endpoint. Ver risk-register.

## Estimación de orden de magnitud (NO es la medición — solo encuadre)

~24 procesos funcionales candidatos en el buy-flow. A un promedio típico de 4–6 CFP por
proceso CRUD-API (1–2 E, 1–2 X, 1–2 R/W), el orden sería **~100–140 CFP** para el buy-flow.
**Marcado SPECULATIVE** — sin los data movements reales no es una medición válida (I-012).

---

**Última actualización:** 2026-06-03T02:13:59
