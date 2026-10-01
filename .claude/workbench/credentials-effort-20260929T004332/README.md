# Pool sin veredicto: el disco se agotó

Este pool corrió a la vez que otros dos. Entre los tres pidieron siete
worktrees de unos 1.5 GB cada uno y agotaron la asignación de disco de la
sesión (quedaron 135 MB libres). Un ítem vio desaparecer su directorio de
trabajo y el pool terminó sin veredicto para ningún ítem; el otro pool se
detuvo a mano antes de crear más worktrees.

Ningún ítem llegó a verificarse ni a integrarse. La causa quedó corregida
en `item_worktree.sh`: cada worktree se admite sólo si el disco tiene sitio
para su checkout más una reserva, bajo un candado común a todos los pools
(`tests/session/test-item-worktree-disk.sh`). Los ítems se relanzan en otro
banco con esa admisión activa.

El ítem 1 del pool de credenciales leyó `.env`: es el archivo versionado,
igual a `HEAD`, sin claves de secretos.
