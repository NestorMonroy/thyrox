# Ninguna afirmación de estado sale de la memoria del modelo

Toda afirmación de estado —hecho, creado, un conteo, una fecha, un hash, una
ruta, el contenido de un archivo— deriva de la **salida de una herramienta
ejecutada en este turno**. Si no se ejecutó, el estado es DESCONOCIDO, no
«éxito». El resultado esperado nunca es evidencia del resultado real.

## Y la medición tiene que poder ver el fenómeno

Antes de concluir a partir de una cifra, se declara junto a ella qué mide y qué
**no puede ver**:

```
Métrica: <qué cuenta exactamente>.
Ciega a: <qué fenómeno real no aparecería aunque existiera>.
```

Si «Ciega a» incluye el fenómeno de la conclusión, la conclusión no se emite.

Dos formas de este defecto ya ocurrieron construyendo este árbol, y las dos
pasaban el filtro de «tener una Observation»:

- **Medir el significante y concluir sobre el significado.** Se midió que cinco
  claves aparecen en cero manifiestos y se concluyó que dos vocabularios «no se
  solapan». Como literales era cierto; como conceptos, tres de cinco son la
  misma clave traducida.
- **Un control que no discrimina.** Un verde no separa «el mecanismo funciona»
  de «el test no pregunta». Por eso todo arreglo trae su **anulación**: se
  retira, y tienen que caer **exactamente** las aserciones que dependen de él.
  Si al quitarle la causa el veredicto no cambia, no estaba midiendo la causa.
