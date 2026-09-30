# Los pares de workspace fuera del alcance `@thyrox/*`

`TASK-THYROX-0099` (board #449) y `TASK-THYROX-0198` (#507). Banco de 2026-09-19.

## La ceguera que lo origina

`TASK-THYROX-0192` cerro «139 pares (importador, hermano) sin declarar» y
publico **DECL-SIN-ENLACE: 0 pares — bun enlaza todo lo declarado**. Las dos
afirmaciones eran ciertas **sobre el alcance `@thyrox/*`**, que fue el unico que
su censo midio. El arbol tiene **tres** alcances de workspace:

| alcance | paquetes |
|---|---|
| `@thyrox` | 42 |
| `@ant` | 4 |
| `@anthropic` | **1** |

`@anthropic/ink` solo: **273 `TS2307`**, declarado por **1** paquete y enlazado
en **0** de los 12 que lo importan.

## `@anthropic/ink` NO era un renombre a medias

Lo parecia: el directorio es `src/packages/@ant/ink` y el arbol tiene hermanos
`@ant/*`. Medido, su `package.json` declara `"name": "@anthropic/ink"`, que es
el nombre de la referencia — `ccnmt` lo importa **772** veces mas 105 de
`/keybindings`, 7 de `/search` y 1 de `/vim`, y nuestro paquete exporta
exactamente esos cuatro subpaths. `bun.lock:726` lo registra como workspace.

El nombre es correcto; lo anomalo es el **directorio**, y eso no lo decide este
pase.

## El reparto de los 487 `TS2307` de alcance propio

| Cubo | pares | errores | Clase |
|---|---|---|---|
| **SIN-DECLARAR** | **33** | **317** | declaracion — este pase |
| DECLARADO-Y-NO-RESUELVE | 38 | 170 | el modulo NO existe en la fuente |

El segundo cubo **ya no es vacio**, y no contradice al pase anterior: aquel
midio `@thyrox/*` con los `.tsx` fuera del programa. Cruzado contra el arbol:
de los 487, **414** citan un modulo que SI existe y **73** uno que no.

## El control, y discrimina

Declarados los 33 pares y corrido `bun install`:

| | antes | despues | delta |
|---|---|---|---|
| `TS2307` | 1159 | 843 | **−316** |
| `TS7006` | 775 | 730 | −45 |
| `TS2322` | 401 | 392 | −9 |
| total | 7592 | **7227** | −365 |

**32 de los 33 pares caen enteros.** El que sobrevive —
`computer-use-mcp -> @thyrox/permission`, 1 error — es de OTRA clase: cita
`@thyrox/permission/components/ComputerUseApproval/ComputerUseApproval.js`, y
ese modulo no esta portado (`TASK-THYROX-0113`, permission 69 de 106 fuera).
El control no lo tapa: lo mueve al cubo correcto.

`@anthropic/ink` residual: **0**.

Y la poblacion que el pase cierra queda **vacia y medida**: 0 pares
sin-declarar, contra 39 declarados-y-sin-resolver, que son modulos ausentes.

*Metrica:* pares (importador, hermano de workspace) extraidos de los `TS2307`
de `bunx tsc --noEmit` desde la raiz, cruzados contra `dependencies` y
`devDependencies` de cada `package.json`.
*Ciega a:* un hermano que el importador cite y que `tsc` no alcance a reportar
porque otro error cancela el analisis aguas arriba; y a si el subpath citado
esta en el `exports` del destino — el cubo «declarado y no resuelve» mezcla
«modulo ausente» con «subpath no exportado», y aqui se midio solo el primero.
