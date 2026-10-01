# ¿Cambia setGlobalDispatcher de undici en quién confía el fetch de Bun?

`probe.ts` levanta un HTTPS local con una hoja firmada por una CA propia y
lo pide con `fetch` tres veces (`bun.out`):

- sin CA: falla, «self signed certificate in certificate chain»;
- tras `setGlobalDispatcher(new Agent({ connect: { ca } }))`: falla igual;
- con la opción `tls: { ca }` del propio `fetch`: 200.

El `fetch` de Bun no pasa por undici. Registrado como H-THYROX-227.
