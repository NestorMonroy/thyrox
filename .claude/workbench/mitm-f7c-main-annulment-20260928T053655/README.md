# Anulación — F7c: el proceso del servidor MITM

Sujeto: `src/packages/mitm/src/server/main.ts`. La prueba lanza el proceso real
con `Bun.spawn` en un puerto libre. Resultados verbatim en `results.txt`: cada
anulación (SIGTERM, SIGINT, el mensaje de puerto ocupado, el saneado del error
de arranque) tumba exactamente su caso.

Medido al escribirla (Bun 1.3.11, este contenedor):
- el contenedor no tiene IPv6 (`python3`: `Errno 97 Address family not supported`);
- con el puerto ocupado por OTRO proceso, el servidor recibe `EADDRINUSE` por
  su listener `error`, y `main.ts` sale 1 con «Port N already in use»;
- con el puerto ocupado dentro del MISMO proceso, Bun lanza «Failed to listen
  at ::» como excepción sin `code`, fuera del listener; el ejecutor de
  `bun test` la intercepta antes que `process.on('uncaughtException')`, así que
  no se puede probar desde ahí. No se añadió manejo para ese caso: el servidor
  corre solo en su proceso.

Métrica: casos `(fail)` de bun:test por anulación.
Ciega a: puertos privilegiados sin root (aquí se corre como root) y a IPv6.
