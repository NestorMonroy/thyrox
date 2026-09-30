# ¿Pasa por el proxy un `http.request` de Bun con `path` absoluto?

`probe.ts` levanta un upstream y un proxy y pide al proxy una URL absoluta
con `http.request({ host, port: <proxy>, path: 'http://upstream/…' })`.

- Bun 1.3.11 (`bun.out`): responde el upstream y el proxy no ve nada.
- Node 22 (`node.out`): la petición llega al proxy.

`rawProbe.ts` pide lo mismo al proxy del inspector por socket crudo
(`rawProbe.out`): el proxy responde, guarda la entrada en el búfer y no
cierra la conexión pese a `Connection: close`.

Registrado como H-THYROX-226.
