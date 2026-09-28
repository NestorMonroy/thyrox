# Sonda — qué de node:https/tls usa el servidor MITM funciona bajo Bun

Bun 1.3.11. Tres guiones, salida verbatim en `results.txt`:

- `probe.ts`: `https.createServer` con `SNICallback` y el evento `connect`.
- `probe-alternatives.ts`: `tls.createServer` con `SNICallback`,
  `https`+`addContext` y `Bun.serve` con un arreglo `tls`.
- `probe-multisan.ts`: una hoja con varios SAN firmada por la CA, servida por
  `https` sin SNI.

Resultado:

| Mecanismo | Bajo Bun |
|---|---|
| `SNICallback` en `https.createServer` | nunca se invoca; sirve el certificado por defecto |
| `SNICallback` en `tls.createServer` | nunca se invoca |
| `addContext` | no existe en el servidor |
| `Bun.serve({ tls: [...] })` por `serverName` | elige bien el certificado |
| evento `connect` de `https.createServer` | se dispara |
| hoja multi-SAN firmada por la CA | valida en cada host listado y rechaza el resto |

Consecuencia: el servidor MITM de thyrox no puede emitir la hoja por host con
`SNICallback`, como hace la referencia. Como el conjunto de hosts de destino
se conoce al arrancar, emite una sola hoja con todos ellos como SAN.

Métrica: el CN del certificado que presenta el servidor por `servername`, y si
`tls.connect` con la CA valida.
Ciega a: versiones de Bun distintas de 1.3.11, y a clientes que no envían SNI.

## El traspaso de un túnel CONNECT

`probe-handoff.ts`, `probe-handoff-steps.ts` y `probe-handoff-loopback.ts`:

| Mecanismo | Bajo Bun 1.3.11 |
|---|---|
| `server.emit('connection', socket)` tras el 200 | el servidor registra la conexión y devuelve `true`, pero nunca inicia TLS sobre ese socket: el TLS interior no completa y el cliente queda esperando |
| encauzar el túnel a una conexión TCP nueva al propio puerto del servidor | el TLS interior valida con la CA y la petición llega descifrada |
| `https.request` a una IP con `servername` y `Host` propio | funciona, y rechaza una cadena no confiable si se verifica |
| `fetch` con `Host` propio y `tls.rejectUnauthorized: false` | respeta el `Host` |

Consecuencia: el servidor de thyrox entrega un CONNECT a un host de destino
encauzándolo a su propio puerto, en vez de reemitir el socket como hace la
referencia.
