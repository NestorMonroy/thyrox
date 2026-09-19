#!/usr/bin/env bash
# node_resolution.sh — resolver una dependencia como lo hace Node, para gates
# de shell que van a invocar `bun run` sobre un paquete del workspace.
#
# Por que existe. Dos gates —`check-agent-artifacts.sh` y
# `check-cross-model-read.sh`— exigian `node_modules` BAJO el paquete. Esa
# premisa de UBICACION queda rancia en cuanto el workspace iza las
# dependencias a la raiz, que es la forma que la referencia ejerce: el
# directorio no existe, Node resuelve subiendo, y los dos gates rehusaban con
# exit 2 sobre CADA archivo real del paquete con el arbol correcto.
#
# La regla que implementa es la de Node: desde el directorio de partida se
# sube padre a padre y gana el PRIMER `node_modules` que aparece. El mas
# cercano, no la raiz — por eso el caso que lo mide usa dos anidados.
#
# Las dos funciones REHUSAN con exit 1 y sin emitir nada cuando no hallan
# nada. Un eco vacio con exit 0 no distinguiria «no hay» de «hay uno en la
# raiz del sistema», que es el sub-patron D aplicado al propio resolutor:
# quien lo consumiera compondria una ruta a partir de la nada.

# Duenyo del primer `node_modules` de la cadena de resolucion.
#   $1 = directorio de partida
#   exit 0 = lo emite por stdout   |   exit 1 = no hay ninguno, sin emitir
node_modules_owner() {
    local dir="${1:?node_modules_owner: falta el directorio de partida}"
    dir="$(cd "$dir" 2>/dev/null && pwd)" || return 1
    while [[ -n "$dir" && "$dir" != "/" ]]; do
        if [[ -d "$dir/node_modules" ]]; then
            printf '%s\n' "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    [[ -d "/node_modules" ]] && { printf '/\n'; return 0; }
    return 1
}

# Directorio del paquete resuelto, no el del `node_modules` que lo contiene.
#   $1 = directorio de partida   |   $2 = nombre del paquete
#   exit 0 = lo emite por stdout   |   exit 1 = no resuelve, sin emitir
resolved_package_dir() {
    local dir="${1:?resolved_package_dir: falta el directorio de partida}"
    local package="${2:?resolved_package_dir: falta el nombre del paquete}"
    dir="$(cd "$dir" 2>/dev/null && pwd)" || return 1
    while [[ -n "$dir" && "$dir" != "/" ]]; do
        if [[ -d "$dir/node_modules/$package" ]]; then
            printf '%s\n' "$dir/node_modules/$package"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    [[ -d "/node_modules/$package" ]] && { printf '/node_modules/%s\n' "$package"; return 0; }
    return 1
}

# ¿El grafo que `node_modules_owner` devolvio esta anclado al lockfile de la
# raiz del workspace?
#   $1 = dueño del `node_modules` mas cercano   |   $2 = raiz del workspace
#   exit 0 = anclado   |   exit 1 = no lo esta, sin emitir
#
# Por que NO basta comparar `owner == root`. Esa comparacion mide la RUTA del
# dueño para concluir sobre el LOCKFILE, y las dos propiedades solo coinciden
# bajo el linker izado. Medido en este arbol tras un `bun install` sin `linker`
# declarado en `bunfig.toml`: 30 paquetes de `src/packages` pasaron a tener
# `node_modules` propio, cada uno un jardin de enlaces cuyas entradas externas
# apuntan a `$root/node_modules/.bun/<paquete>@<version>/`. El grafo sigue
# siendo el del lockfile de la raiz; lo que cambio es donde esta materializado.
# Con la comparacion de ruta, `check-cross-model-read.sh` rehusaba sobre cada
# archivo de su superficie con un arbol correcto — el sub-patron C de
# `metrica-decide-la-conclusion.md`, con el gate como sujeto.
#
# El temor del gate SI es legitimo y se conserva: hay DOS raices de workspace
# anidadas —la raiz y `src/packages`—, con lockfiles que no fijan las mismas
# resoluciones. Lo que cambia es el instrumento: se mide a donde RESUELVEN las
# entradas, que es la propiedad sobre la que se concluye.
#
# Las entradas `@thyrox/*` se saltan a proposito: son enlaces relativos a
# paquetes hermanos del workspace, no entradas del store, asi que no dicen nada
# sobre que lockfile gobierna.
#
# Esta funcion NO decide entre izado y aislado — eso es TASK-THYROX-0098, y es
# del ejecutor. Acepta los dos.
anchored_to_root_store() {
    local owner="${1:?anchored_to_root_store: falta el dueño}"
    local root="${2:?anchored_to_root_store: falta la raiz}"
    owner="$(cd "$owner" 2>/dev/null && pwd)" || return 1
    root="$(cd "$root" 2>/dev/null && pwd)" || return 1

    # Linker izado: el dueño ES la raiz, y su lockfile gobierna por definicion.
    [[ "$owner" == "$root" ]] && return 0

    # Linker aislado: cada entrada externa tiene que resolver dentro del store
    # de la raiz. Una sola que no lo haga basta para rehusar — ahi el grafo
    # mezcla dos lockfiles, que es justo lo que el gate existe para atajar.
    #
    # `-maxdepth 2` recoge tanto `node_modules/zod` como
    # `node_modules/@alcance/paquete`; el `grep -v` descarta los directorios de
    # servicio y los contenedores de alcance, que no son entradas.
    local entry target found=0
    while IFS= read -r entry; do
        target="$(readlink -f "$entry" 2>/dev/null)"
        [[ -z "$target" ]] && continue
        # Un hermano del workspace no es entrada del store: es un enlace
        # relativo a otro paquete del arbol y no dice nada sobre el lockfile.
        #
        # El `/node_modules/` de la segunda condicion NO es adorno: sin el, el
        # descuento se traga tambien un store ANIDADO —que vive en
        # `src/packages/node_modules/.bun/`— y el caso que discrimina pasaba
        # por la via equivocada. Medido: con el descuento ancho, anular la
        # comprobacion de ancla dejaba la suite en 12 de 12, o sea que la
        # comprobacion era codigo muerto. Un paquete hermano nunca lleva
        # `/node_modules/` en su ruta resuelta; un store anidado, siempre.
        if [[ "$target" == "$root/src/packages/"* && "$target" != */node_modules/* ]]; then
            continue
        fi
        found=1
        [[ "$target" == "$root/node_modules/.bun/"* ]] || return 1
    done < <(find "$owner/node_modules" -mindepth 1 -maxdepth 2 \
                  \( -type l -o -type d \) 2>/dev/null \
             | grep -vE '/node_modules/(\.[a-z]+|@[^/]+)$')

    # Cero entradas medibles: NO se declara anclado. Un 0 aqui no distinguiria
    # «todas anclan» de «no habia ninguna que mirar», que es el sub-patron D
    # aplicado al propio resolutor.
    [[ "$found" -eq 1 ]]
}
