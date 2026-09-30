# Anulación — F6b: DNS, compuerta de sudo y retirada al parar

Sujeto: `src/packages/mitm/src/{dns/dnsConfig,dns/provision,sudoGate,privilegedMitmStep,stopDnsTeardown}.ts`
y el `env: process.env` añadido a los hijos de `systemCommands.ts`.

Método: cada mitad de juicio se retira con `bin/replace_literal`, se corren
`__tests__/dns` y `__tests__/system/sudoGate.test.ts`, y se restaura. Resultados
verbatim en `results.txt`.

Qué cae con cada anulación:

- `env: process.env` en `sudo -n true`: los dos casos de «sudo pide contraseña».
- `env: process.env` en la sonda `command -v sudo`: el caso «sin sudo instalado».
- `THYROX_MITM_SKIP_DNS_WRITE`: su caso propio.
- la dirección en la primera columna: los dos casos de líneas parciales.
- el `catch` del paso por defecto: los dos de degradación (#6127/#6198).
- `dns_enabled` y `enabledOnly`: el caso de lectores por defecto.
- la compuerta de elevación y `THYROX_MITM_SKIP_ANTIGRAVITY_DNS`: su caso cada una.
- el `catch` de los hosts gestionados en `stopDnsTeardown`: su caso.

Lo que NO discrimina, declarado: el `if (isRoot()) return false` de
`sudoGate.ts`. Retirado, la respuesta no cambia, porque
`canRunSudoWithoutPassword` vuelve a comprobar root: el atajo sólo ahorra una
sonda y ninguna salida lo distingue. Pasa lo mismo en la referencia.

Métrica: casos `(fail)` de bun:test por anulación.
Ciega a: el comportamiento con un `sudo` real que pide contraseña (se usa un
`sudo` falso en el PATH), y a Windows real (la plataforma se simula).
