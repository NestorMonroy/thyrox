#!/usr/bin/env python3
"""El cableado de hooks del usuario: declarado en thyrox, medido contra el disco.

thyrox es el PRODUCTOR del multi-repo, asi que el cableado que el cliente
carga tiene que existir aqui como fuente. Hasta hoy no existia en ningun
repo: medido 2026-09-07, el unico `advisorModel` de los seis clones vivia
dentro de un artefacto de sonda del 2026-09-02.

Y llevaba una ruta muerta sin que nada lo dijera: `PreModelSwitch` apuntaba a
`kaupamex-docs/.claude/packages/agent/bin/preModelSwitch.ts`, AUSENTE — el real
esta en `thyrox/src/packages/agent/bin/`. Ese hook estaba muerto. Medido por
este mismo modulo: **1 roto sobre 6 comandos**.

Una segunda ruta ausente —`kaupamex-docs/.claude/scripts/session/`— vive en el
FUENTE de `sync_local_settings.py`, no en la copia viva. Son dos cosas
distintas y al describirlas juntas dije «dos rutas muertas en la copia viva»,
que es falso: este control ve una.

Nada lo delataba porque el cliente no avisa: un hook cuyo comando no existe
falla en silencio y el turno sigue. `broken_targets` es el control que faltaba
— la misma forma que #252 pide para el `bin`.

*Metrica:* primer argumento con pinta de ruta de cada `command`, comprobado
con `os.path.exists`.
*Ciega a:* un comando que resuelva su objetivo por `PATH` o lo construya en
tiempo de ejecucion; y a que el archivo exista pero no sea ejecutable ni
correcto. Mide presencia, no salud.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Protocol

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths.reach import reach, thyrox_root  # noqa: E402

#: El archivo que el lanzador remoto carga. El cwd de la sesion es
#: `/home/user`, no un clon, asi que este es el unico settings de proyecto que
#: pesa — por eso el cableado no puede vivir solo en el `.claude` de un repo.
#:
#: Se DERIVA del arbol, no de `Path.home()`. La primera version usaba
#: `Path.home()` y aterrizaba en `/root/.claude/`, porque HOME es `/root`
#: mientras el cwd es `/home/user`: el control publico «0 rotos sobre 0
#: comandos» — un verde que no medio nada, sobre el archivo que existe a dos
#: directorios de distancia. Es el sub-patron D de
#: `metrica-decide-la-conclusion.md` dentro del instrumento escrito para
#: cerrar otro caso del mismo patron.
LIVE_SETTINGS_VAR = "THYROX_LIVE_SETTINGS"


def live_settings(root: Path | None = None) -> Path:
    """El settings del lanzador: declarado, o derivado del arbol de clones."""
    declarado = os.environ.get(LIVE_SETTINGS_VAR)
    if declarado:
        return Path(declarado)
    base = Path(root) if root else Path(thyrox_root())
    return base.parent / ".claude" / "settings.local.json"


def declared_wiring(root: Path | None = None) -> dict:
    """El cableado que thyrox declara, con sus rutas resueltas a este arbol."""
    base = Path(root) if root else Path(thyrox_root())
    consumer = base.parent / "kaupamex-docs"

    def cmd(command: str, timeout: int | None = None) -> dict:
        entrada = {"type": "command", "command": command}
        if timeout is not None:
            entrada["timeout"] = timeout
        return entrada

    # EL CABLEADO APUNTA AL PRODUCTOR. Antes nombraba los tres envoltorios de
    # `kaupamex-docs/.claude/hooks/`, que era verdad cuando el mecanismo vivia
    # ahi. Ya no: los tres estan en `thyrox: src/agents/` —`register_session.py`
    # 1002 lineas, `measure_delta.py` 227, `save_result.mjs` 259— y los tres
    # tienen puerta de entrada propia. Medido antes de reapuntar.
    #
    # Lo que el envoltorio aportaba era el PARAMETRO del consumidor (DEC-04), y
    # ese parametro no necesita un archivo: lo compone esta funcion, que vive en
    # el productor y ya resuelve el arbol. Un envoltorio que solo antepone
    # argumentos es un salto de mas, y ademas un sitio donde el cableado puede
    # quedarse atras sin que nadie lo vea — que es exactamente lo que paso.
    #
    # Cuanto aporta cada uno, medido:
    #   register_session  0 — el mecanismo ya lee AGENT_STORE_CLAUDE_DIR (:713)
    #   measure_delta     --repo <n>=<ruta> (de `reach`) y --results-dir
    #   save_result       --log-dir
    agentes = f"{base}/src/agents"
    resultados = f"{consumer}/.claude/agent-results"
    repos = " ".join(f"--repo {nombre}={ruta}"
                     for nombre, ruta in sorted(reach().items()))
    delta = f"python3 {agentes}/measure_delta.py"
    registro = f"python3 {agentes}/register_session.py"
    return {
        "hooks": {
            "SubagentStart": [{"hooks": [
                cmd(f"{delta} --start {repos} --results-dir {resultados}"),
                cmd(f"{registro} --start"),
            ]}],
            "PreModelSwitch": [{"hooks": [
                cmd(f"bun run {base}/src/packages/agent/bin/preModelSwitch.ts",
                    timeout=10),
            ]}],
            "SubagentStop": [{"hooks": [
                cmd(f"node {agentes}/save_result.mjs --log-dir {resultados}"),
                cmd(f"{delta} --stop {repos} --results-dir {resultados}"),
                cmd(f"{registro} --stop"),
            ]}],
        },
        "advisorModel": "claude-fable-5-1",
    }


#: Las claves del settings del lanzador que thyrox GOBIERNA. Al instalar, todo
#: lo que no este aqui se conserva verbatim.
#:
#: La lista es corta A PROPOSITO, y su razon ya la dejo escrita
#: `sync_local_settings.py`: el archivo tiene bloques con duenos distintos.
#: `permissions` lo escribe el CLIENTE durante la sesion; `env` y `effortLevel`
#: los pone quien opera. Sobreescribir el archivo entero destruye el trabajo del
#: otro lado, y lo hace en silencio. Por eso instalar es una FUSION sobre las
#: claves propias, nunca un reemplazo.
OWNED_KEYS = ("hooks", "advisorModel")

#: De las claves propias, cuales componen ademas la CLAVE de la cache de prompt.
#: NO se decide de memoria: la referencia lo declara en `createCacheSafeParams`
#: (2.1.266, `bunfs-root/chunk-yw4jc948.js`), que enumera siete campos —
#: `systemPrompt`, `userContext`, `systemContext`, `toolUseContext`,
#: `forkContextMessages`, `advisorModel`, `stickyBetas`—. `hooks` NO esta entre
#: ellos, y tampoco es campo de `toolUseContext`: los hooks se leen del registro
#: de la sesion. Y `isMainThreadCacheWarm` compara el advisor **resuelto**, no si
#: la clave se escribio — por eso el delta se mide por VALOR y no por presencia.
#: Banco: `docs: .claude/eventos/measure-cache-key-surface-20260910T021100/`.
CACHE_KEY_FIELDS = ("advisorModel",)


def cache_key_delta(current: dict, declared: dict,
                    fields: tuple[str, ...] | None = None) -> list[str]:
    """Los campos de la clave de cache que la instalacion cambiaria de valor.

    Vacio significa que la escritura es cache-safe: `isMainThreadCacheWarm` no
    tiene por que enfriarse. Es la distincion que la premisa de H-DOCS-1012
    colapsaba — aquella decia «escribir el archivo invalida la clave», y lo que
    la invalida es que un campo de la clave cambie de VALOR. Instalar el mismo
    `advisorModel` que ya esta vivo no cambia nada.
    """
    # El default se resuelve AQUI y no en la firma: un `fields=CACHE_KEY_FIELDS`
    # congela la tupla al importar, no al usar, y entonces la constante deja de
    # ser fuente unica — es la misma forma que ERR-065.
    campos = CACHE_KEY_FIELDS if fields is None else fields
    return [key for key in campos
            if key in declared and current.get(key) != declared[key]]



class WiringRefused(Exception):
    """Lo declarado no esta sano, o el respaldo no se pudo comprobar."""


class ForBackingUp(Protocol):
    """Puerto CONDUCIDO: como se pone a salvo el archivo antes de reescribirlo.

    Se declara como puerto —no como llamada directa— porque el respaldo real es
    un trabajo en SEGUNDO PLANO, y un trabajo en segundo plano no se puede
    ejercitar dentro de un caso de prueba sin convertir la prueba en una espera.
    Con el puerto, la decision de instalar se prueba con un doble y el adaptador
    real se mide por separado.
    """

    def backup(self, source: Path, destination: Path) -> None:
        """Deja en `destination` una copia de `source`, o lanza."""
        ...


#: Las clases del ledger que NO avanzan solas. Salen de `class()` de
#: `wait-jobs.sh`, que es donde ya vive la taxonomia; no se re-derivan aqui.
STUCK_CLASSES = ("DETENIDO", "ZOMBIE", "RECICLADO", "BAIL")


class BackgroundBackup:
    """El adaptador real: `nohup` mas el ledger de trabajos — el patron R-2.0.

    Segundo plano NO es sinonimo de «cosa de agentes»: el ledger es maquinaria
    de TRABAJOS, y un respaldo es un trabajo como cualquier otro.

    Por que este respaldo NO se espera sobre el ledger compartido
    =============================================================
    La primera version llamaba a `wait` sin mas, y razonaba que esperar a TODO
    el ledger era deseable. Es un defecto, y es el mismo que el roster ya midio
    en los agentes: un trabajo puede quedar DETENIDO (estado `T`) o ZOMBIE
    (`Z`), y los dos responden a `kill -0` como si vivieran. `cmd_wait` los
    cuenta como vivos, agota su timeout, sale 3 y **deja en el ledger a todos
    los trabajos, incluido el que si termino**. El respaldo quedaria rehen de un
    trabajo ajeno que nadie va a revivir.

    Por eso el respaldo corre en su PROPIO ledger —`THYROX_JOBS_DIR` junto a los
    respaldos, durable, no en `/tmp`—, de modo que la barrera mida exactamente
    este trabajo. El ledger compartido no se toca: se MIRA con `status` y sus
    clases atascadas se reportan, que es la adaptacion del roster — surfacing
    sin quedar bloqueado.

    Y el veredicto final no lo da ni el exit del `cp` ni el del ledger, sino el
    archivo que tenia que quedar: un exit 0 dice que el comando termino, no que
    el respaldo exista.
    """

    def __init__(self, root: Path | None = None, timeout: int = 120) -> None:
        self.root = Path(root) if root else Path(thyrox_root())
        self.timeout = timeout
        self.stuck_elsewhere: list[str] = []

    def _ledger(self) -> Path:
        return self.root / "src" / "session" / "wait-jobs.sh"

    def foreign_stuck(self, env: dict) -> list[str]:
        """Las lineas del ledger COMPARTIDO que no van a avanzar solas.

        Se reportan, no se esperan. Un DETENIDO necesita `continue` o `kill`, y
        un ZOMBIE ya termino: ninguno de los dos es una espera.
        """
        import subprocess  # noqa: PLC0415 - adaptador

        output = subprocess.run([str(self._ledger()), "status"],
                                capture_output=True, text=True, env=env).stdout
        return [line.strip() for line in output.splitlines()
                if any(c in line for c in STUCK_CLASSES)]

    def backup(self, source: Path, destination: Path) -> None:
        import os as _os  # noqa: PLC0415 - adaptador
        import subprocess  # noqa: PLC0415 - adaptador

        destination.parent.mkdir(parents=True, exist_ok=True)
        log = destination.with_suffix(destination.suffix + ".log")
        label = f"backup-{destination.name}"

        # Lo que hay en el ledger compartido se MIRA antes, y se dice.
        self.stuck_elsewhere = self.foreign_stuck(dict(_os.environ))

        # El ledger propio de este respaldo: durable, junto a lo que respalda.
        mine = destination.parent / "ledger"
        env = {**_os.environ, "THYROX_JOBS_DIR": str(mine)}

        launch = (
            f'nohup bash -c "cp -p {source} {destination}; echo EXIT=\\$?" '
            f"> {log} 2>&1 & P=$!; disown $P; echo $P"
        )
        pid = subprocess.run(["bash", "-c", launch], capture_output=True,
                             text=True).stdout.strip()
        subprocess.run([str(self._ledger()), "register", label, str(log), pid],
                       capture_output=True, text=True, env=env)
        collected = subprocess.run(
            [str(self._ledger()), "wait", "--timeout", str(self.timeout)],
            capture_output=True, text=True, env=env)

        if not destination.exists() or destination.stat().st_size == 0:
            # El diagnostico nombra la CLASE, no solo «no llego»: un timeout no
            # distingue «sigue copiando» de «murio callado» ni de «lo pararon».
            classes = subprocess.run([str(self._ledger()), "status"],
                                    capture_output=True, text=True,
                                    env=env).stdout
            raise WiringRefused(
                f"el respaldo no aterrizo en {destination} "
                f"(ledger: exit {collected.returncode})\n{classes}")


def merged_wiring(live: dict, declared: dict,
                  owned: tuple[str, ...] = OWNED_KEYS) -> dict:
    """Lo vivo con las claves propias sustituidas, y nada mas tocado."""
    merged = dict(live)
    for key in owned:
        if key in declared:
            merged[key] = declared[key]
    return merged


def backup_path(live: Path, stamp: str, backups: Path | None = None) -> Path:
    """Donde va el respaldo: durable, dentro del estado de thyrox.

    NO en `/tmp` ni en el scratchpad: los dos son efimeros, y un respaldo que no
    sobrevive al contenedor no es un respaldo. Mismo criterio con que el ledger
    dejo `/tmp` tras el reinicio del worker.
    """
    base = (Path(backups) if backups
            else Path(thyrox_root()) / ".claude" / "settings-backups")
    return base / f"{live.name}.{stamp}"


def install(live: Path, declared: dict, backup: ForBackingUp, stamp: str,
            owned: tuple[str, ...] = OWNED_KEYS,
            backups: Path | None = None,
            allow_cache_key_change: bool = False) -> dict:
    """Deja el settings del lanzador en lo que thyrox gobierna. Devuelve el acta.

    El orden ES el contrato, y cada paso existe porque su ausencia ya costo algo:

    1. **Validar lo declarado** antes de tocar nada. Instalar un cableado con una
       ruta ausente reproduce el defecto que este modulo vino a cerrar — un hook
       muerto que falla en silencio y el turno sigue.
    2. **Leer lo vivo** y medir el delta de la clave de cache. Si un campo de la
       clave cambiaria de valor, REHUSA salvo permiso explicito.
    3. **Rehusar la escritura vacia.** Si la fusion es identica a lo que ya hay,
       no se escribe: sin escritura no hay evento de cambio de settings, y sin
       evento no hay suscriptor que reaccione.
    4. **Respaldar** si el archivo existe, y comprobar que el respaldo aterrizo.
    5. **Fusionar** sobre las claves propias, nunca reemplazar, y **escribir**.

    Sin el paso 4 no hay vuelta atras; sin el 5 se pierde `permissions`, que lo
    escribe el cliente y no thyrox.

    CUANDO correrlo — corregido 2026-09-10 contra la referencia 2.1.266. La
    version anterior de este parrafo decia que *«los hooks y el `advisorModel`
    son los dos parte de la CLAVE de la cache»*, y era falso en su mitad:
    `createCacheSafeParams` enumera siete campos y `hooks` no es ninguno, ni es
    campo de `toolUseContext`. Lo que enfria la cache es que un campo de la clave
    cambie de **valor** — `isMainThreadCacheWarm` compara el advisor **resuelto**.

    De ahi que la decision no sea horaria sino de contenido: una instalacion cuyo
    `cache_key_delta` es vacio se corre a mitad de sesion sin coste. El episodio
    de H-DOCS-1012 —778 297 tokens reescritos— fue un cambio de valor real: el
    advisor paso de ausente a `claude-fable-5-1`.
    """
    broken = broken_targets(declared)
    if broken:
        raise WiringRefused(
            "lo declarado apunta a rutas ausentes; no se instala: "
            + ", ".join(r["path"] for r in broken))

    record = {"live": str(live), "backup": None, "existed": live.exists()}
    current: dict = {}
    raw = ""
    if live.exists():
        raw = live.read_text()
        current = json.loads(raw)

    delta = cache_key_delta(current, declared)
    record["cache_key_delta"] = delta
    if delta and not allow_cache_key_change:
        raise WiringRefused(
            "cambiaria de valor un campo de la clave de la cache de prompt: "
            + ", ".join(f"{k} {current.get(k)!r} -> {declared[k]!r}"
                        for k in delta)
            + ". Con la cache caliente eso reescribe el contexto entero "
              "(H-DOCS-1012). Instalalo al arrancar la sesion, o justo tras "
              "una compactacion, con allow_cache_key_change.")

    merged = merged_wiring(current, declared, owned)
    record["preserved"] = sorted(k for k in current if k not in owned)
    record["written"] = sorted(k for k in merged if k in owned)

    payload = json.dumps(merged, indent=2) + "\n"
    # La escritura identica NO es inocua por barata: es inocua porque no ocurre.
    # El cliente recarga los settings al detectar el cambio, y ahi es donde
    # despiertan sus trece suscriptores. Sin escritura, ninguno se entera.
    if raw == payload:
        record["written"] = []
        record["unchanged"] = True
        return record
    record["unchanged"] = False

    if live.exists():
        destination = backup_path(live, stamp, backups)
        backup.backup(live, destination)
        record["backup"] = str(destination)

    live.parent.mkdir(parents=True, exist_ok=True)
    live.write_text(payload)
    return record


def _target_of(command: str) -> str | None:
    """La ruta que el comando invoca, o None si no nombra ninguna."""
    for pieza in command.split():
        if pieza.startswith("/"):
            return pieza
    return None


def broken_targets(settings: dict) -> list[dict]:
    """Los comandos cuya ruta declarada no existe, con su evento."""
    rotos = []
    for evento, grupos in (settings.get("hooks") or {}).items():
        for grupo in grupos:
            for entrada in grupo.get("hooks", []):
                ruta = _target_of(entrada.get("command", ""))
                if ruta and not os.path.exists(ruta):
                    rotos.append({"event": evento, "path": ruta,
                                  "command": entrada["command"]})
    return rotos


def _commands_by_event(settings: dict) -> dict:
    """Las cadenas de ``command`` de un settings, agrupadas por evento."""
    por_evento: dict = {}
    for evento, grupos in (settings.get("hooks") or {}).items():
        por_evento[evento] = [entrada.get("command", "")
                              for grupo in grupos
                              for entrada in grupo.get("hooks", [])]
    return por_evento


def wiring_drift(live: dict, declared: dict) -> dict:
    """Los eventos cuyo cableado instalado no coincide LITERALMENTE con el declarado.

    Devuelve ``{evento: {"only_live": [...], "only_declared": [...]}}`` y sólo
    incluye los eventos que difieren; sin deriva, ``{}``.

    *Métrica:* cadenas de ``command`` por evento, comparadas como conjuntos.
    *Ciega a:* un stub que DELEGA en el mismo mecanismo. Medido 2026-09-07 sobre
    el archivo vivo: ``SubagentStart`` y ``SubagentStop`` dan **cero** literales
    en común con lo declarado, y las dos formas resuelven al MISMO destino — el
    stub compone ``reach.root("docs")/.claude/agent-results`` donde el declarado
    escribe ``--results-dir`` con esa misma ruta, y ninguna de las dos pasa
    destino al store. Por eso un rojo de este instrumento autoriza a concluir
    «las dos formas no son la misma cadena», NUNCA «la instalación está
    atrasada»: son afirmaciones distintas y sólo la primera se mide aquí.

    Tampoco mide alcanzabilidad —para eso está ``broken_targets``— ni
    procedencia; el caso 12 de la suite cubre que el ejecutable declarado viva
    en el productor.
    """
    vivo = _commands_by_event(live)
    decl = _commands_by_event(declared)
    deriva: dict = {}
    for evento in sorted(set(vivo) | set(decl)):
        v, d = set(vivo.get(evento, [])), set(decl.get(evento, []))
        if v != d:
            deriva[evento] = {"only_live": sorted(v - d),
                              "only_declared": sorted(d - v)}
    return deriva


def main() -> int:
    import argparse  # noqa: PLC0415 - superficie de linea de comandos

    parser = argparse.ArgumentParser(
        description="Mide el cableado vivo, o instala el que thyrox declara.")
    parser.add_argument("--write", action="store_true",
                        help="instala: respalda en segundo plano y fusiona")
    parser.add_argument("--backups", default=None,
                        help="donde dejar el respaldo (por defecto, el estado)")
    parser.add_argument("--allow-cache-key-change", action="store_true",
                        help="instala aunque cambie de valor un campo de la "
                             "clave de la cache de prompt (reescribe el "
                             "contexto entero: usalo entre turnos)")
    args = parser.parse_args()

    ruta = live_settings()

    if args.write:
        import datetime  # noqa: PLC0415 - sello del respaldo

        stamp = datetime.datetime.now(datetime.timezone.utc).strftime(
            "%Y%m%dT%H%M%S")
        try:
            record = install(
                ruta, declared_wiring(), BackgroundBackup(), stamp,
                backups=args.backups,
                allow_cache_key_change=args.allow_cache_key_change)
        except WiringRefused as e:
            print(f"REHUSA — {e}", file=sys.stderr)
            return 2
        if record["unchanged"]:
            # Se distingue de «instalado» a proposito: son estados distintos del
            # mundo, y colapsarlos deja sin saber si hubo evento de settings.
            print(f"sin cambio en {record['live']}")
            print("  lo declarado ya estaba vivo; no se escribio, no se "
                  "respaldo, y no hubo evento de recarga de settings")
            return 0
        print(f"instalado en {record['live']}")
        print(f"  respaldo   {record['backup'] or '(no existia; nada que respaldar)'}")
        print(f"  escritas   {', '.join(record['written']) or '(ninguna)'}")
        print(f"  conservadas {', '.join(record['preserved']) or '(ninguna)'}")
        if record["cache_key_delta"]:
            print("  AVISO: cambio de valor en "
                  f"{', '.join(record['cache_key_delta'])} — es campo de la "
                  "clave de la cache. Con contexto caliente se reescribe entero.")
        else:
            print("  cache-safe: ningun campo de la clave cambio de valor")
        return 0

    if not ruta.exists():
        # REHUSA en vez de publicar un cero. Un «0 rotos» sobre un archivo que
        # no se encontro no se distingue de un «0 rotos» sobre uno sano, y esa
        # confusion es el defecto que este modulo existe para no repetir.
        print(f"ERROR — no se encuentra el cableado vivo en {ruta}. "
              f"Declaralo con {LIVE_SETTINGS_VAR}. NO se emite conteo: un 0 "
              f"aqui seria un verde falso.", file=sys.stderr)
        return 2
    viva = json.loads(ruta.read_text())
    rotos_vivos = broken_targets(viva)
    rotos_declarados = broken_targets(declared_wiring())
    n_viva = sum(len(g.get("hooks", [])) for gs in (viva.get("hooks") or {}).values() for g in gs)

    for r in rotos_vivos:
        print(f"  roto en la copia viva  {r['event']:16} {r['path']}", file=sys.stderr)
    for r in rotos_declarados:
        print(f"  roto en lo declarado   {r['event']:16} {r['path']}", file=sys.stderr)
    print(f"{len(rotos_vivos)} roto(s) en la copia viva sobre {n_viva} comandos "
          f"({ruta}) · {len(rotos_declarados)} en lo que thyrox declara")

    # La deriva se publica AQUI y no en un host de surfacing, porque ese host
    # no existe: `session-start.sh` tiene cero invocadores ejecutables y el
    # settings vivo no declara `SessionStart`. Inventarle uno seria afirmar una
    # superficie sin medirla; publicarla en el comando que ya se corre no.
    #
    # Y NO entra al codigo de salida a proposito. El codigo lo gobierna
    # `broken_targets` de lo declarado, que mide ALCANZABILIDAD; la deriva mide
    # COINCIDENCIA LITERAL, y su propio docstring declara que un rojo suyo
    # autoriza a decir «no son la misma cadena» y nunca «la instalacion esta
    # atrasada» — un stub que delega en el mismo mecanismo deriva sin estar mal.
    deriva = wiring_drift(viva, declared_wiring())
    if not deriva:
        print("  sin deriva: los dos cableados coinciden literalmente por evento")
    for evento, lados in deriva.items():
        print(f"  deriva en {evento}")
        for c in lados["only_live"]:
            print(f"    solo vivo      {c}")
        for c in lados["only_declared"]:
            print(f"    solo declarado {c}")

    return 1 if rotos_declarados else 0


if __name__ == "__main__":
    raise SystemExit(main())
