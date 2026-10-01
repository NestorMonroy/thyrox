# #188 — nombre de CA propio de cada generación (H-THYROX-236)

BoringSSL, bajo Bun, elige el emisor por nombre dentro de `SSL_CERT_FILE`.
Con un nombre fijo (`THYROX MITM CA`), una CA vieja que siga en el almacén del
sistema tapa a la recién generada y el apretón de manos falla.

- `red.txt` — `__tests__/cert/caNameGeneration.test.ts` antes del cambio: el
  símbolo `MITM_CA_NAME_PREFIX` no existe.
- `green.txt` — 3/3: dos CA sin nombre declarado difieren, conservan el prefijo,
  y un nombre declarado se respeta.
- Anulación: con el sufijo fijo cae exactamente «dos CA… no comparten sujeto»
  (2 pass, 1 fail).
- `derived.txt` — las 16 suites que nombran `dynamicCert`/`rootCa`: 117 pruebas;
  el único error es `tproxy/fixtures/captureInNamespace.ts`, un guion fijo que
  su prueba lanza con `UPSTREAM_KEY` y que la derivación por nombre recogió.
- `typecheck.txt` — vacío: sin errores propios en build ni en test.

*Métrica:* el sujeto de los certificados que `generateMitmCa()` emite.
*Ciega a:* que el almacén del sistema tenga ya una CA vieja — la prueba no lo
ejercita; el episodio original está en H-THYROX-236.
