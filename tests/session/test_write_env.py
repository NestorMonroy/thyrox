#!/usr/bin/env python3
"""Control de ``src/session/write-env.sh`` — el escritor de la segunda entrada.

Lo que tiene que poder fallar, y por eso es el caso central: **la rehusa**. Si
el guion no encuentra la raíz y aun así escribe un ``.env``, deja un valor
equivocado que gana sobre el ascenso — y entonces el mecanismo deja de correr
sin que nadie vea por qué. Un ``.env`` a medias es peor que ninguno.

El control de anulación retira el marcador del alcance del ascenso y comprueba
que caen exactamente las aserciones que dependen de él.
"""
from __future__ import annotations

import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
SCRIPT = ROOT / "src/session/write-env.sh"

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def run(*args: str, cwd: pathlib.Path | None = None,
        script: pathlib.Path | None = None,
        env: dict | None = None) -> subprocess.CompletedProcess:
    """Corre el guion con el entorno LIMPIO de las dos entradas.

    Sin limpiarlas el test mediría el entorno de quien lo lanza, no el guion:
    un ``THYROX_ROOT`` exportado haría pasar el caso de la rehusa por la razón
    equivocada.
    """
    base = dict(os.environ)
    for var in ("THYROX_ROOT", "THYROX_ENV_FILE", "THYROX_REACH_ROOT"):
        base.pop(var, None)
    base.update(env or {})
    return subprocess.run(["bash", str(script or SCRIPT), *args],
                          capture_output=True, text=True,
                          cwd=str(cwd or ROOT), env=base)


def keys(path: pathlib.Path) -> dict[str, str]:
    out = {}
    for line in path.read_text().splitlines():
        if line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip()
    return out


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)

        # --- caso 1: escribe, y el valor es la raíz REAL --------------------
        destination = base / "escrito.env"
        r = run("--out", str(destination))
        check("escribe y sale 0", r.returncode == 0, r.stderr)
        if destination.is_file():
            declared = keys(destination)
            check("declara THYROX_ROOT", "THYROX_ROOT" in declared)
            check("y su valor es la raíz real de thyrox",
                  declared.get("THYROX_ROOT") == str(ROOT),
                  f"dio {declared.get('THYROX_ROOT')!r}, esperaba {str(ROOT)!r}")
            check("NO es el árbol padre (el defecto que originó todo esto)",
                  declared.get("THYROX_ROOT") != str(ROOT.parent))
            check("declara los dos localizadores",
                  {"THYROX_LOCATOR", "THYROX_LIB_REACH"} <= declared.keys())
            check("y el .env que escribe lo puede leer reach.py",
                  _readable_by_reach(destination, str(ROOT)))
        else:
            check("escribe el archivo", False, "no aterrizó")

        # --- caso 2: no pisa un .env existente sin --force -------------------
        existing = base / "existente.env"
        existing.write_text("THYROX_ROOT=/valor/que/alguien/eligio\n")
        r = run("--out", str(existing))
        check("un .env existente NO se pisa", r.returncode == 1)
        check("y conserva su contenido",
              "que/alguien/eligio" in existing.read_text())
        r = run("--out", str(existing), "--force")
        check("--force sí lo reescribe", r.returncode == 0)
        check("y ahora lleva el valor derivado",
              keys(existing).get("THYROX_ROOT") == str(ROOT))

        # --- caso 3: una opción desconocida rehúsa en vez de tragársela -----
        r = run("--que-no-existe", "--out", str(base / "x.env"))
        check("una opción desconocida rehúsa con 2", r.returncode == 2)
        check("y no crea el archivo", not (base / "x.env").is_file())

        # --- caso 4: LA RAMA QUE IMPORTA — sin marcador, rehúsa sin escribir -
        # Anulación: se copian las dos mitades FUERA de todo árbol con marcador.
        # Si el guion escribiera igual, dejaría un .env con una raíz inventada.
        isolated = base / "sin-marcador"
        (isolated / "src" / "lib").mkdir(parents=True)
        shutil.copy(SCRIPT, isolated / "write-env.sh")
        shutil.copy(ROOT / "src/lib/reach.sh", isolated / "src/lib/reach.sh")
        salida = isolated / "huerfano.env"
        r = run("--out", str(salida), cwd=isolated,
                script=isolated / "write-env.sh")
        check("sin marcador alcanzable, rehúsa con 2", r.returncode == 2,
              f"dio {r.returncode}: {r.stdout[:120]}{r.stderr[:120]}")
        check("y NO deja un .env a medias", not salida.is_file())
        check("y dice por qué", "no se pudo derivar" in r.stderr.lower())

        # --- caso 5: el hogar del banco se emite SOLO para el proveedor ----
        # Su discriminador es el DESTINO, no el valor: en el `.env` de un
        # consumidor esta clave seria el hogar de otro arbol, que es el defecto
        # que la familia `THYROX_WORKBENCH_<CLONE>` existe para evitar.
        #
        # Anulacion: el mismo guion con `--out` fuera de `$ROOT/.env` NO debe
        # emitirla. Un control que solo mirara el `.env` del proveedor pasaria
        # con y sin la guarda — no discriminaria.
        propio = ROOT / ".env"
        check("el proveedor la declara en su .env vivo",
              any(l.startswith("THYROX_WORKBENCH_DIR=/")
                  for l in propio.read_text().splitlines()),
              "sin ella `workbench_dir()` rehusa: su .claude/ no lo distingue "
              "de un consumidor")
        ajeno = base / "consumidor.env"
        run("--out", str(ajeno), "--force")
        check("y NO la emite al .env de un consumidor",
              "THYROX_WORKBENCH_DIR" not in ajeno.read_text())

        # El hogar de los TRABAJOS del proveedor, por la misma razon y con la
        # misma guarda. Sin el, `jobs_dir()` cae al default y devuelve un
        # SEGMENTO relativo —`.claude/jobs`—, que resuelve contra el CWD: el
        # defecto home-by-cwd de #284/#286, en la familia hermana.
        check("el proveedor declara tambien el hogar de sus trabajos",
              any(l.startswith("THYROX_JOBS_DIR=/")
                  for l in propio.read_text().splitlines()),
              "sin ella jobs_dir() devuelve una ruta relativa")
        check("y tampoco esa al .env de un consumidor",
              "THYROX_JOBS_DIR" not in ajeno.read_text())

        # --- caso 6: --force CONSERVA lo que el guion no emite --------------
        # El generador deriva del arbol lo que se puede derivar. Lo que NO se
        # puede —una clave de POLITICA como `THYROX_JOBS_API`, cuyo valor
        # decide el ejecutor— vive en el mismo archivo y lo borraba en cada
        # `--force`. Una declaracion que el mecanismo no puede regenerar y
        # ademas destruye no es una declaracion: es una nota que caduca.
        #
        # Lo que hace al caso DISCRIMINAR es su segunda mitad. Conservar el
        # archivo entero pasaria la primera —la clave ajena sobrevive— y
        # dejaria ademas el `THYROX_ROOT` rancio, que es justo lo que `--force`
        # existe para reescribir. Las claves del generador GANAN; las ajenas se
        # conservan.
        mixto = base / "mixto.env"
        mixto.write_text(
            "THYROX_ROOT=/raiz/rancia\n"
            "THYROX_JOBS_API=/home/user/kaupamex-api/scripts/evidence\n"
            "THYROX_JOBS_DOCS=/home/user/kaupamex-docs/.claude/jobs\n"
            "# un comentario del ejecutor\n"
        )
        r = run("--out", str(mixto), "--force")
        check("--force sale 0 sobre un .env con claves ajenas", r.returncode == 0,
              r.stderr)
        tras = keys(mixto)
        check("conserva la clave de politica por clon (api)",
              tras.get("THYROX_JOBS_API")
              == "/home/user/kaupamex-api/scripts/evidence",
              f"dio {tras.get('THYROX_JOBS_API')!r}")
        check("conserva la de docs tambien",
              tras.get("THYROX_JOBS_DOCS")
              == "/home/user/kaupamex-docs/.claude/jobs")
        check("y REGENERA la suya: el valor rancio no sobrevive",
              tras.get("THYROX_ROOT") == str(ROOT),
              f"dio {tras.get('THYROX_ROOT')!r}, esperaba {str(ROOT)!r}")
        check("sin duplicar la clave regenerada",
              sum(1 for l in mixto.read_text().splitlines()
                  if l.startswith("THYROX_ROOT=")) == 1)

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: {SCRIPT.name})")
    return 1 if failed else 0


def _readable_by_reach(env_path: pathlib.Path, expected: str) -> bool:
    """El .env escrito lo entiende el lector: cierra el lazo escritor↔lector."""
    sys.path.insert(0, str(ROOT / "src/paths"))
    import reach  # noqa: PLC0415
    return reach.read_env_file(env_path).get("THYROX_ROOT") == expected


if __name__ == "__main__":
    raise SystemExit(main())
