# I3 en la publicación: un escritor vivo impide publicar

La especificación exige que `<n>.closed` implique cero escritores vivos de
esa generación. Hasta ahora sólo lo garantizaba el drenaje de
`headless-pool` antes del finalize; `reconcile`, que publica ítems cuyo
dueño murió, podía publicar uno con un hijo huérfano escribiendo todavía.

`publish` rehúsa ahora mientras otro proceso tenga abierto en escritura un
artefacto del ítem en el runtime. Se excluye a sí mismo: hereda como stderr
`<n>.lifecycle.err`, que es un artefacto del ítem.

- `outputs/red.txt`: sin la comprobación, publicar con un escritor vivo no
  rehúsa y el ítem queda publicado (45 de 47).
- `outputs/green.txt`: 47 de 47. La mitad roja es el control de anulación:
  sin la comprobación caen exactamente esas dos aserciones.
- `outputs/drain-after-i3.txt`: el control de anulación de la prueba de
  drenaje medía que, sin drenaje, el hijo escribía en la salida publicada.
  Con I3 esa salida ya no se publica, así que el control se reancló al
  stream del runtime y ganó una aserción: el ítem queda sin cerrar. 17 de 17.

Regresión en el árbol principal: `.claude/jobs/i3-regress-*`.
