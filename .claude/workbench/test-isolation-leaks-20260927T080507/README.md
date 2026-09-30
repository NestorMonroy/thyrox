# Fugas de aislamiento entre archivos de prueba (Fase 3)

Dos paquetes pasaban archivo por archivo y fallaban en su `bun test` entero
desde la raíz: tool-registry (1) y provider (3). La causa es una, medida:

- `probe/a.test.ts` + `b.test.ts` (`probe-restore.txt`): `mock.restore()` NO
  deshace un `mock.module` (Bun 1.3.11); el siguiente archivo sigue viendo el
  mock.
- `probe/c.test.ts` (`probe-reinstate.txt`): re-registrar el namespace real
  tampoco basta: el namespace importado antes de mockear se parchea en su
  sitio.
- `probe/d.test.ts` (`probe-reinstate-copy.txt`): una COPIA de los exports,
  tomada antes de mockear y re-registrada al salir, sí devuelve el real.

Localización:
- tool-registry: `adapterFactory.test.ts` dejaba vivo su mock de
  `supportsAnthropicServerWebSearch`; la pareja con la integración reproduce.
- provider: `pair.sh` sobre `pairs.tsv` (cada víctima con cada uno de los 144
  archivos del paquete, GNU Parallel) → `pairs-result.tsv`: el único culpable
  es `gatewayModelDiscovery.test.ts`, que fija `getAPIProvider` en
  'firstParty'. Contaminación declarada: ese archivo se editó mientras la
  bisección corría; la pareja con `withRetryFoundryCapabilities` se volvió a
  medir contra la versión de HEAD (2 fallos) y la arreglada (0).

Resultado (`results/`): tool-registry 1414 pruebas, 0 fallos; provider 1816,
0 fallos, cada uno con `run-one.sh` desde la raíz.

`mock-module-files.txt`: los 60 archivos de prueba que registran
`mock.module`. No todos fugan con efecto visible; los que lo hacían en su
paquete son los dos arreglados.

*Métrica:* fallos por pareja de archivos y del paquete entero.
*Ciega a:* una fuga hacia un archivo de OTRO paquete, que el `bun test` por
paquete no junta en el mismo proceso.
