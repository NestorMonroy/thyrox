#!/usr/bin/env bash
# Mide si Podman puede dar a un ítem el árbol del repositorio SIN copiarlo:
# (1) --rootfs /:O corre sobre la raíz del anfitrión con una capa superior
#     desechable (bun, python, git sin construir imagen);
# (2) -v <repo>:/w:O monta el repositorio como capa inferior: lo que el ítem
#     escribe cae en una capa superior que no toca el árbol del anfitrión;
# (3) cuánto disco nuevo consume un contenedor que instala dependencias.
# Imprime una línea TSV por caso: <caso>\t<resultado>.
set -uo pipefail
R=/home/user/thyrox
mark="probe-overlay-$$"
t0=$SECONDS
out=$(timeout 120 podman run --rm --network none --rootfs /:O bash -c 'bun --version; python3 --version; git --version | head -1' </dev/null 2>&1 | tr '\n' ' ')
printf 'rootfs-host-overlay\t%s (%ss)\n' "$out" "$((SECONDS-t0))"
out=$(timeout 120 podman run --rm --network none -v "$R:/w:O" --rootfs /:O bash -c "echo x > /w/$mark && test -f /w/$mark && echo escrito-dentro; git -C /w rev-parse --short HEAD" </dev/null 2>&1 | tr '\n' ' ')
printf 'repo-overlay-write\t%s\n' "$out"
if [[ -e "$R/$mark" ]]; then printf 'repo-overlay-host\tFUGA: el archivo aparecio en el anfitrion\n'; rm -f "${R:?}/$mark"
else printf 'repo-overlay-host\tanfitrion intacto\n'; fi
before=$(df -B1 --output=used / | gawk 'NR==2{print $1}')
out=$(timeout 300 podman run --rm -v "$R:/w:O" -w /w --rootfs /:O bash -c 'bun install --frozen-lockfile >/dev/null 2>&1 && echo install-ok; du -sh node_modules | cut -f1; du -sh /w 2>/dev/null | cut -f1' </dev/null 2>&1 | tr '\n' ' ')
after=$(df -B1 --output=used / | gawk 'NR==2{print $1}')
printf 'deps-in-overlay\t%s disco-neto-tras-rm=%sMB\n' "$out" "$(( (after-before)/1048576 ))"
