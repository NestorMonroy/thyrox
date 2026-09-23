#!/usr/bin/env bash
# Control de los TRES estados de `check-cli-typecheck.sh`.
#
# El defecto que mide (TASK-THYROX-0056): el gate colapsaba en un solo rojo
# —«el paquete no compila. El arreglo es el tipo, no el bypass»— dos causas con
# arreglo opuesto. Medido el dia que se abrio: los 4 errores de los dos
# proyectos eran `TS2307` sobre `@thyrox/context-compression`, un paquete que
# EXISTE en `src/packages/` y que no estaba en `node_modules/@thyrox/`. Cero
# errores de tipo genuinos, y el gate mandaba arreglar un tipo.
#
# Que haria fallar a este control (sub-patron D): que el gate llamara «workspace
# sin enlazar» a todo `TS2307`. Por eso el cuarto caso —un especificador cuyo
# hermano NO existe en el arbol de paquetes— tiene que seguir siendo codigo
# roto. Sin ese caso, un gate que respondiera «sin enlazar» a cualquier modulo
# ausente pasaria este control igual, y no discriminaria nada.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
THYROX="$(cd "$HERE/../.." && pwd)"
GATE="$THYROX/src/verify/check-cli-typecheck.sh"

ok=0; fail=0
assert() {
    local name="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        ok=$((ok + 1)); printf '  ok   %s\n' "$name"
    else
        fail=$((fail + 1))
        printf '  FALLO %s\n       esperado: %s\n       obtenido: %s\n' \
            "$name" "$expected" "$actual"
    fi
}

# Precondicion declarada: sin el gate no se emite un conteo. Un 0 aqui seria un
# verde falso — el control no habria medido nada.
[ -f "$GATE" ] || {
    echo "ERROR — no existe $GATE. NO se emite un conteo." >&2
    exit 2
}
command -v bunx >/dev/null 2>&1 || {
    echo "ERROR — falta \`bunx\`: el control no puede ejercitar el gate." >&2
    echo "  NO se emite un conteo: un 0 aqui seria un verde falso." >&2
    exit 2
}

T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT

# Un arbol de paquetes sintetico con la forma de `src/packages/`: el sujeto es
# `subject/` y sus hermanos viven al lado. `linked/` esta enlazado en
# `node_modules/@thyrox/`; `unlinked/` existe y NO lo esta.
PKGS="$T/packages"
mkdir -p "$PKGS/subject/node_modules/@thyrox" "$PKGS/linked" "$PKGS/unlinked"

for p in linked unlinked; do
    printf 'export const mark = 1;\n' > "$PKGS/$p/index.ts"
    printf '{"name":"@thyrox/%s","version":"0.0.0","main":"index.ts"}\n' "$p" \
        > "$PKGS/$p/package.json"
done
ln -s ../../../linked "$PKGS/subject/node_modules/@thyrox/linked"

tsconfig_for() {
    cat <<'JSON'
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "module": "preserve",
    "moduleResolution": "bundler",
    "target": "esnext",
    "skipLibCheck": true
  },
  "include": ["*.ts"]
}
JSON
}
tsconfig_for > "$PKGS/subject/tsconfig.json"
tsconfig_for > "$PKGS/subject/tsconfig.tests.json"
printf '{"name":"@thyrox/subject","version":"0.0.0"}\n' > "$PKGS/subject/package.json"

# Los casos 1-4 miden la conducta BINARIA, la de un arbol sin baseline. El
# default del gate apunta a `.claude/baselines/` del arbol real, que si lo
# tiene: sin aislarlo, estos casos medirian el trinquete sin decirlo.
run_gate() {
    OUT="$(CHECK_CLI_TYPECHECK_PKG_DIR="$PKGS/subject" \
           CHECK_CLI_TYPECHECK_PACKAGES_DIR="$PKGS" \
           CHECK_CLI_TYPECHECK_BASELINE="$T/sin-baseline.txt" \
           bash "$GATE" --strict 2>&1)"
    CODE=$?
}

# --- 1. limpio: los dos proyectos compilan -----------------------------------
printf 'import { mark } from "@thyrox/linked";\nexport const v: number = mark;\n' \
    > "$PKGS/subject/index.ts"
run_gate
assert "limpio sale 0" 0 "$CODE"
case "$OUT" in *"OK"*) V=ok ;; *) V="$OUT" ;; esac
assert "limpio publica OK" ok "$V"

# --- 2. codigo roto: error de tipo genuino -----------------------------------
printf 'export const v: number = "no es un numero";\n' > "$PKGS/subject/index.ts"
run_gate
assert "codigo roto sale 1 con --strict" 1 "$CODE"
case "$OUT" in
    *"sin enlazar"*) V=confundio-con-workspace ;;
    *"no compila"*)  V=codigo-roto ;;
    *)               V="$OUT" ;;
esac
assert "codigo roto se publica como codigo roto" codigo-roto "$V"

# --- 3. workspace sin enlazar: el hermano EXISTE y no esta enlazado ----------
# Es el estado que el gate no tenia. Reproduce por construccion el caso vivo de
# `@thyrox/context-compression` medido al abrir la tarea.
printf 'import { mark } from "@thyrox/unlinked";\nexport const v: number = mark;\n' \
    > "$PKGS/subject/index.ts"
run_gate
assert "workspace sin enlazar rehusa con exit 2" 2 "$CODE"
case "$OUT" in
    *"sin enlazar"*) V=sin-enlazar ;;
    *"no compila"*)  V=confundio-con-codigo-roto ;;
    *)               V="$OUT" ;;
esac
assert "workspace sin enlazar se publica como tal" sin-enlazar "$V"
case "$OUT" in *"@thyrox/unlinked"*) V=nombra ;; *) V=no-nombra ;; esac
assert "workspace sin enlazar nombra el paquete" nombra "$V"
case "$OUT" in *"veredicto"*) V=declara ;; *) V=no-declara ;; esac
assert "workspace sin enlazar declara que no hay veredicto" declara "$V"

# --- 4. el control que hace que 3 discrimine ---------------------------------
# Un `TS2307` cuyo hermano NO existe en el arbol de paquetes es una dependencia
# ausente de verdad, no un enlace que falta. Si el gate lo llamara «sin
# enlazar», el estado 3 no separaria nada.
printf 'import { mark } from "@thyrox/fantasma";\nexport const v: number = mark;\n' \
    > "$PKGS/subject/index.ts"
run_gate
case "$OUT" in
    *"sin enlazar"*) V=confundio-con-workspace ;;
    *"no compila"*)  V=codigo-roto ;;
    *)               V="$OUT" ;;
esac
assert "modulo sin hermano en el arbol sigue siendo codigo roto" codigo-roto "$V"
assert "modulo sin hermano sale 1 con --strict" 1 "$CODE"

# --- 5-7. el TRINQUETE: con baseline declarado, --strict bloquea si CRECE ------
# Sin esto el gate era binario sobre un paquete ya rojo: bloqueaba TODO commit
# que tocara `cli`, tambien los que bajaban errores (medido 2026-09-23: un lote
# de imports sin uso que bajaba el total de 4787 a 4493 no pudo commitearse).
# Sin baseline la conducta binaria se conserva: los casos 2 y 4 la miden.
printf 'export const a: number = "x";\nexport const b: number = "y";\n' > "$PKGS/subject/index.ts"
BASE="$T/baseline.txt"
run_ratchet() {
    OUT="$(CHECK_CLI_TYPECHECK_PKG_DIR="$PKGS/subject" \
           CHECK_CLI_TYPECHECK_PACKAGES_DIR="$PKGS" \
           CHECK_CLI_TYPECHECK_BASELINE="$BASE" \
           bash "$GATE" --strict 2>&1)"
    CODE=$?
}

printf 'tsconfig.json 2\ntsconfig.tests.json 2\n' > "$BASE"
run_ratchet
assert "baseline igual al conteo: no crece, sale 0" 0 "$CODE"
case "$OUT" in *"no crece"*) V=declara ;; *) V="$OUT" ;; esac
assert "baseline igual declara que no crece" declara "$V"

printf 'tsconfig.json 1\ntsconfig.tests.json 2\n' > "$BASE"
run_ratchet
assert "conteo sobre el baseline sale 1" 1 "$CODE"
case "$OUT" in *"2 sobre un baseline de 1"*) V=nombra ;; *) V="$OUT" ;; esac
assert "conteo sobre el baseline nombra las dos cifras" nombra "$V"

printf 'tsconfig.json 5\ntsconfig.tests.json 5\n' > "$BASE"
run_ratchet
assert "conteo bajo el baseline sale 0" 0 "$CODE"
case "$OUT" in *"baja el baseline"*) V=pide ;; *) V="$OUT" ;; esac
assert "conteo bajo el baseline pide bajarlo" pide "$V"

# --- 8. el enlace HOISTED: vive en un node_modules ANCESTRO -------------------
# `bunfig.toml` declara `linker = "hoisted"` (H-THYROX-154), asi que `bun
# install` enlaza los workspaces en `node_modules/@thyrox/` de la RAIZ y no en
# el del paquete. La resolucion de Node sube por los ancestros y los encuentra.
# Medido en el arbol real el 2026-09-23: `@thyrox/mcp-runtime` estaba enlazado
# en la raiz, `cli` daba `TS2307` porque su `exports` no declara `"."`, y el
# gate lo publicaba «sin enlazar» y rehusaba el commit — su arreglo, `bun
# install` en el paquete, no crea nada bajo el linker declarado.
#
# Que lo haria fallar: mirar solo el `node_modules` del paquete.
mkdir -p "$PKGS/hoisted" "$T/node_modules/@thyrox"
printf 'export const mark = 1;\n' > "$PKGS/hoisted/sub.ts"
printf '{"name":"@thyrox/hoisted","version":"0.0.0","exports":{"./sub":"./sub.ts"}}\n' \
    > "$PKGS/hoisted/package.json"
ln -s ../../packages/hoisted "$T/node_modules/@thyrox/hoisted"
printf 'import { mark } from "@thyrox/hoisted";\nexport const v: number = mark;\n' \
    > "$PKGS/subject/index.ts"
run_gate
case "$OUT" in
    *"sin enlazar"*) V=confundio-con-workspace ;;
    *"TS2307"*)      V=codigo-roto ;;
    *)               V="$OUT" ;;
esac
assert "enlace hoisted en un ancestro: el TS2307 es codigo roto, no enlace" codigo-roto "$V"
assert "enlace hoisted en un ancestro sale 1 con --strict" 1 "$CODE"

printf '\n%d ok, %d fallo(s)\n' "$ok" "$fail"
[ "$fail" -eq 0 ]
