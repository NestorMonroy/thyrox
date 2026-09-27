# Afinidad de sesión del proxy — porte de CLIProxyAPI `sdk/cliproxy/session/`

Fase 1: `identity.go` → `src/packages/provider/src/proxy/session/`
(`identity.ts`, `payload.ts`, `goJson.ts`). Prueba:
`src/packages/provider/__tests__/proxySessionIdentity.test.ts`, casos de
`identity_test.go` salvo `Enrich`, que depende de `ExtractSessionInfo` (fase 2).

## Fidelidad del hash contra Go

`DeriveID` es el sha256 de `json.Marshal(canonicalRoot)`. Si un byte difiere,
thyrox y un proxy con la referencia derivan identidades distintas para la
misma conversación. `probes/gomarshal/main.go` copia el struct verbatim
(`identity.go:27-40`) y deja en `outputs/gomarshal-golden.tsv` el JSON y su
hash para tres raíces: orden de campos, `omitempty` y los escapes de Go
(`<`, `>`, `&`, U+2028, U+2029). La prueba `goMarshal` las exige byte a byte.

```bash
cd probes/gomarshal && GO111MODULE=off go run main.go
```

## Controles de anulación

`probes/annul.sh` aplica un reemplazo literal, corre la prueba y restaura
(hash del archivo igual antes y después). Salida por caso en `outputs/annul/`.

| Anulación | Caen |
|---|---|
| sin escapes de Go | `escapa <, >, &, U+2028 y U+2029` |
| `omitempty` ignorado | los tres de `goMarshal` |
| límite de instrucciones 50 → 5000 | `las instrucciones cuentan hasta 50` |
| `caller_scope` vacío | `aísla por llamador` |
| sin prefijos conocidos | `prefijos sin cuerpo dan vacío`, `quita prefijos encadenados` |

El caso `un prefijo … delante de un UUID se quita` sobrevive a la última: lo
cubre también la rama genérica «`algo:` + UUID», que es su otra mitad.

## Episodio

El primer `bun test` dio `Syntax Error` sin archivo: `goJson.ts` llevaba
U+2028 literal dentro de una regex, y para el parser de JavaScript es un fin
de línea. Se escribe como ` `.

*Métrica:* igualdad de bytes contra `encoding/json` de Go 1.x del contenedor.
*Ciega a:* claves de mapa no-ASCII y números (el struct sólo lleva cadenas).
