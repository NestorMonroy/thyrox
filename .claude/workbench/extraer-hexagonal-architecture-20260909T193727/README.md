# Extraccion de «Hexagonal Architecture Explained»

Fecha: 2026-09-09T20:16:13
Fuente: PDF de Alistair Cockburn y Juan Manuel Garrido de Paz, aportado por el
ejecutor. Obra **comercial**.

## Por que este banco vive en THYROX y no en el consumidor

Nacio en `kaupamex-docs/.claude/workbench/` y se mudo aqui el mismo dia. La
directiva del ejecutor era explicita —*«el mecanismo … ahora lo tendras que
pasar a `/home/user/thyrox/.claude/workbench/`»*— y su razon es la de siempre:
`extract.py` es MECANISMO, y el mecanismo vive en el productor. Lo que si va al
consumidor es el DOCUMENTO, que esta en
`kaupamex-docs: source/base-cognitiva/hexagonal-architecture/index.rst`.

## Que se versiona, y que NO — la decision, declarada

| Pieza | Veredicto |
|---|---|
| `extract.py` | **se versiona** — es mecanismo reusable |
| `hexagonal-architecture-explained.en.txt` | **NO se versiona** |

El `.txt` es el texto integro de una obra comercial (16 paginas, 17 925
caracteres). No hay precedente en este arbol: medido, es el primer `*.en.txt`
que existe, asi que la decision no se hereda de ningun sitio y se escribe aqui.

**No es una regla unica aplicada a ciegas.** Los factores pesan distinto segun
el caso, y aqui pesan asi:

- **Licencia** — obra comercial. Es el factor que decide, y va en la misma
  direccion que la postura ya tomada con PMBOK, NetSuite y BPM.
- **Reproducibilidad** — `extract.py` regenera el `.txt` del PDF en segundos, y
  es determinista. Versionar la salida de un mecanismo determinista cuyo insumo
  es del ejecutor no compra durabilidad, compra una copia.
- **Durabilidad de la evidencia** — lo que sostiene el analisis son las citas
  cortas del documento, que si estan versionadas con su pagina.
- **Tamano** — 17.9 KB, despreciable. NO es el factor: si lo fuera, la decision
  seria la contraria.

El caso OAIS diverge y esta bien que diverja: aquel `.txt` **si** se versiona
porque su fuente es un estandar publico del CCSDS, no una obra comercial. Mismo
tipo de artefacto, licencia distinta, veredicto distinto.

## El mecanismo que `extract.py` aporta

Bloquea el enlace roto de `cryptography` con un buscador propio en
`sys.meta_path` antes de importar el lector de PDF. Sin eso el import muere y la
extraccion no arranca — y el fallo no dice que la causa es un binding ajeno.
