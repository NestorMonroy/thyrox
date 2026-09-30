# Anulación — F6c: reparación del MITM y estado de captura del inspector

Sujetos: `src/packages/mitm/src/repair.ts` y `src/packages/mitm/src/inspector/captureState.ts`.

Método: cada mitad de juicio se retira con `bin/replace_literal`, se corren
`__tests__/repairSteps.test.ts` y `__tests__/inspector/captureState.test.ts`, y
se restaura. Resultados verbatim en `results.txt`.

Qué cae con cada anulación:

- `ca.crt` en la lista de certificados a retirar: los dos casos de certificados (H-THYROX-229).
- los hosts de GitHub Enterprise y los hosts propios desactivados: el caso de hosts gestionados.
- `clearSystemProxy()` tras revertir: el caso del proxy por defecto.
- marcar el paso de certificado como hecho: los dos casos de certificados.
- el `catch` al leer los hosts propios: su caso (una primera versión con
  `finally` rompía por un `err` sin declarar y tumbaba 8, así que no aislaba nada;
  se rehízo como `throw err`).
- la reversión que dispara la guarda y la lectura de `THYROX_INSPECTOR_TLS_INTERCEPT`: su caso cada una.
- la cancelación de la guarda en `clearSystemProxy`: al principio no discriminaba,
  porque la guarda que se dispara tarde encuentra el estado vacío y no revierte nada.
  Su efecto observable es otro: un temporizador pendiente mantiene vivo el proceso.
  Se añadió el caso que lo mide en un proceso hijo, y ahora cae exactamente ese caso.

Métrica: casos `(fail)` de bun:test por anulación.
Ciega a: la retirada real de la confianza y del DNS (los pasos del sistema se
inyectan) y a GNOME real (`gsettings` se registra, no se ejecuta).
