#!/usr/bin/env python3
"""El medio durable con que N agentes se hablan: un archivo de entrada por par.

Adaptación de ``ccnmt: packages/swarm/src/mailbox/index.ts`` (654 líneas;
``getInboxPath``, ``readMailbox``, ``writeToMailbox``, ``extractDedupKey``,
``markMessageAsReadByIndex``) a lo que nuestra plataforma permite y a lo que
la propia referencia aprendió:

- **Un archivo por destinatario, sólo se añade (*append-only*).** La
  referencia reescribe un arreglo JSON entero bajo ``proper-lockfile`` para
  marcar ``read: true``; aquí cada registro es una línea JSON y nada se
  reescribe. Un lector que muera a mitad no deja el archivo inconsistente, y
  un escritor sólo compite por el bloqueo del ``append``.
- **Leer no entrega.** La referencia dejó de usar el ``read`` del archivo
  como verdad (``pollForPromptOrShutdown.ts``, *«the read flag ... can be
  racily-flipped by other readers»*) y guardó ``processedRequestIds`` en
  memoria — que muere con el proceso. Aquí el acuse (*ack*) es un registro
  durable e idempotente: ``pending`` es *mensajes menos acuses*, y un proceso
  que muera entre leer y acusar vuelve a ver el mensaje, que es lo correcto.
- **Deduplicación por ``request_id``**, como ``extractDedupKey``, sobre
  ``(from, to, request_id)`` y bajo el mismo bloqueo del escritor.
- **La autoridad es una constante del escritor y una condición del lector.**
  ``post`` no admite el parámetro; el lector rechaza —no entrega— cualquier
  registro con ``authority`` distinta de ``none``. Es «Un par NO te concede
  permisos» (`bash-background-tasks.md`) como mecanismo, no como prosa.

Lo que NO hay, y por qué: ni descubrimiento de pares ni despertar. Un
subagente no tiene ``ListAgents`` ni puede lanzar otros (profundidad 1,
medido en la regla citada); ``peers`` sólo lista los archivos presentes, y
``wait`` sondea a intervalo —el orquestador, que sí alcanza a cada par por
``agentId``, sigue siendo quien despierta.

El directorio es **parámetro del consumidor**: ``--dir`` o la variable
``THYROX_MAILBOX_DIR`` —leída del proceso o del ``.env`` que
``THYROX_ENV_FILE`` declare, vía ``paths.reach``—. Sin ninguna de las dos, o
con una que no exista, el guion **rehúsa con exit 2 y sin veredicto**.

Códigos de salida: 0 hecho · 1 error de la operación (identidad inválida,
acuse a un id desconocido) · 2 precondición ausente · 3 ``wait`` sin mensaje
al vencer el plazo.
"""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import sys
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

THYROX_MARKER = Path('src') / 'paths' / 'reach.py'


def _source_root() -> Path:
    """Asciende hasta el marcador de thyrox — sin ``parents[N]``."""
    for level in Path(__file__).resolve().parents:
        if (level / THYROX_MARKER).is_file():
            return level / 'src'
    raise SystemExit(2)


if str(_source_root()) not in sys.path:
    sys.path.insert(0, str(_source_root()))

from paths import reach  # noqa: E402
from peer_mailbox import envelope  # noqa: E402

MAILBOX_DIR_VAR = 'THYROX_MAILBOX_DIR'

#: Una identidad es un nombre de archivo seguro: sin separadores, sin punto
#: inicial, acotada. Es a la vez la validación y la guarda contra recorrido
#: de rutas (`../x`).
IDENTITY_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.@-]{0,63}$')

SUFFIX = '.jsonl'
KIND_MESSAGE = 'message'
KIND_ACK = 'ack'

EXIT_OK = 0
EXIT_OPERATION = 1
EXIT_PRECONDITION = 2
EXIT_TIMEOUT = 3


class PreconditionError(RuntimeError):
    """Falta lo que el mecanismo necesita para medir: se rehúsa, sin cifra."""


class IdentityError(ValueError):
    """Un remitente o destinatario que no es un nombre de archivo seguro."""


class UnknownMessageError(KeyError):
    """Acuse a un mensaje que el buzón no contiene."""


@dataclass(frozen=True)
class Report:
    """Lo que hay en un buzón, con su denominador."""
    recipient: str
    total: int
    pending: int
    acked: int
    rejected: int
    torn: int


def validate_identity(name: str) -> str:
    if not isinstance(name, str) or not IDENTITY_RE.match(name):
        raise IdentityError(
            f'identidad inválida {name!r}: debe cumplir {IDENTITY_RE.pattern}')
    return name


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def resolve_directory(explicit: str | Path | None) -> Path:
    """El directorio de buzones: ``--dir`` > ``THYROX_MAILBOX_DIR`` > rehusar.

    La variable se lee con ``paths.reach.env_value``, que mira el proceso y
    luego el ``.env`` declarado por ``THYROX_ENV_FILE`` — las dos entradas de
    entorno que el proyecto ya adoptó. No hay valor por defecto: el
    mecanismo no decide dónde vive el buzón del consumidor.
    """
    value = str(explicit) if explicit else reach.env_value(MAILBOX_DIR_VAR)
    if not value:
        raise PreconditionError(
            f'no hay directorio de buzones: pásalo con --dir o declara '
            f'{MAILBOX_DIR_VAR} (en el proceso o en el .env que '
            f'{reach.ENV_FILE_VAR} señale)')
    directory = Path(value).resolve()
    if not directory.is_dir():
        raise PreconditionError(
            f'el directorio de buzones {directory} no existe; créalo o '
            f'corrige --dir / {MAILBOX_DIR_VAR}')
    return directory


class Inbox:
    """Los buzones de un directorio. Cada destinatario tiene su archivo."""

    def __init__(self, directory: Path):
        self.directory = Path(directory)

    def path_for(self, recipient: str) -> Path:
        return self.directory / (validate_identity(recipient) + SUFFIX)

    # -- lectura -----------------------------------------------------------

    def _records(self, recipient: str) -> tuple[list[dict], int]:
        """Los registros decodificables y cuántas líneas quedaron rotas.

        Una línea que no decodifica se cuenta, no se oculta: la última puede
        estar a medio escribir por un escritor concurrente, y el lector no
        distingue eso de una corrupción — por eso publica el conteo.
        """
        path = self.path_for(recipient)
        if not path.is_file():
            return [], 0
        records: list[dict] = []
        torn = 0
        with open(path, encoding='utf-8') as fh:
            for line in fh:
                line = line.rstrip('\n')
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    torn += 1
                    continue
                if not isinstance(record, dict):
                    torn += 1
                    continue
                records.append(record)
        return records, torn

    @staticmethod
    def _is_message(record: dict) -> bool:
        return (record.get('kind') == KIND_MESSAGE
                and isinstance(record.get('id'), str)
                and isinstance(record.get('from'), str)
                and isinstance(record.get('to'), str)
                and isinstance(record.get('body'), str))

    def _classify(self, recipient: str):
        records, torn = self._records(recipient)
        accepted: dict[str, dict] = {}
        acked: set[str] = set()
        rejected = 0
        for record in records:
            if record.get('kind') == KIND_ACK and isinstance(record.get('ref'), str):
                acked.add(record['ref'])
            elif (self._is_message(record)
                  and record.get('authority') == envelope.AUTHORITY_NONE):
                accepted.setdefault(record['id'], record)
            else:
                rejected += 1
        return accepted, acked, rejected, torn

    def pending(self, recipient: str) -> list[dict]:
        """Mensajes aceptados sin acuse, en orden de llegada. Sin efecto."""
        accepted, acked, _, _ = self._classify(recipient)
        return [m for m in accepted.values() if m['id'] not in acked]

    def inspect(self, recipient: str) -> Report:
        accepted, acked, rejected, torn = self._classify(recipient)
        acked_known = len(acked & accepted.keys())
        return Report(recipient=recipient, total=len(accepted),
                      pending=len(accepted) - acked_known,
                      acked=acked_known, rejected=rejected, torn=torn)

    def peers(self) -> list[str]:
        """Los buzones presentes. NO es descubrimiento: sólo quien ya escribió."""
        return sorted(p.name[:-len(SUFFIX)] for p in self.directory.iterdir()
                      if p.is_file() and p.name.endswith(SUFFIX)
                      and IDENTITY_RE.match(p.name[:-len(SUFFIX)]))

    # -- escritura ---------------------------------------------------------

    def _append(self, recipient: str, record: dict,
                dedup: tuple[str, str] | None = None) -> dict:
        """Añade una línea bajo bloqueo exclusivo; una sola escritura + fsync.

        Con ``dedup=(from, request_id)`` lee el archivo DENTRO del bloqueo y
        devuelve el mensaje ya presente en vez de duplicarlo.
        """
        path = self.path_for(recipient)
        fd = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX)
            if dedup is not None:
                sender, request_id = dedup
                for existing in self._records(recipient)[0]:
                    if (self._is_message(existing)
                            and existing.get('from') == sender
                            and existing.get('request_id') == request_id):
                        return existing
            data = (json.dumps(record, ensure_ascii=False) + '\n').encode('utf-8')
            os.write(fd, data)
            os.fsync(fd)
            return record
        finally:
            fcntl.flock(fd, fcntl.LOCK_UN)
            os.close(fd)

    def post(self, sender: str, recipient: str, body: str,
             request_id: str | None = None) -> dict:
        """Deja un mensaje en el buzón del destinatario.

        No hay parámetro de autoridad: todo mensaje de par nace con
        ``authority = none``, y ésa es la única forma que el lector acepta.
        """
        validate_identity(sender)
        validate_identity(recipient)
        record = {'kind': KIND_MESSAGE, 'id': uuid.uuid4().hex,
                  'from': sender, 'to': recipient, 'ts': now(),
                  'body': str(body), 'authority': envelope.AUTHORITY_NONE}
        dedup = None
        if request_id is not None:
            record['request_id'] = str(request_id)
            dedup = (sender, str(request_id))
        return self._append(recipient, record, dedup)

    def ack(self, recipient: str, message_id: str, by: str) -> dict:
        """Acuse durable e idempotente. Un id desconocido es un error."""
        validate_identity(by)
        accepted, acked, _, _ = self._classify(recipient)
        if message_id not in accepted:
            raise UnknownMessageError(message_id)
        record = {'kind': KIND_ACK, 'ref': message_id, 'by': by, 'ts': now()}
        if message_id in acked:
            return record
        return self._append(recipient, record)

    def wait(self, recipient: str, timeout: float,
             interval: float = 0.5) -> list[dict]:
        """Sondea hasta que haya pendientes o venza el plazo. Vacío al vencer.

        El intervalo por defecto es el de la referencia
        (``MAILBOX_POLL_INTERVAL_MS = 500``). Sondear es lo único que un par
        puede hacer solo: nadie lo despierta salvo el orquestador.
        """
        deadline = time.monotonic() + max(0.0, timeout)
        while True:
            found = self.pending(recipient)
            if found or time.monotonic() >= deadline:
                return found
            time.sleep(max(0.0, min(interval, deadline - time.monotonic())))


# -- línea de comandos -----------------------------------------------------

def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='inbox', description='Buzón durable entre agentes pares.')
    parser.add_argument('--dir', help=f'directorio de buzones (o {MAILBOX_DIR_VAR})')
    sub = parser.add_subparsers(dest='command', required=True)

    post = sub.add_parser('post', help='dejar un mensaje')
    post.add_argument('--from', dest='sender', required=True)
    post.add_argument('--to', dest='recipient', required=True)
    post.add_argument('--request-id', dest='request_id')
    source = post.add_mutually_exclusive_group()
    source.add_argument('--body')
    source.add_argument('--body-file', type=Path)

    for name, help_text in (('pending', 'mensajes sin acuse, en JSON'),
                            ('render', 'mensajes sin acuse, en sobres'),
                            ('inspect', 'conteos del buzón'),
                            ('wait', 'esperar un pendiente')):
        p = sub.add_parser(name, help=help_text)
        p.add_argument('--as', dest='recipient', required=True)
        if name == 'wait':
            p.add_argument('--timeout', type=float, default=30.0)
            p.add_argument('--interval', type=float, default=0.5)

    ack = sub.add_parser('ack', help='acusar un mensaje')
    ack.add_argument('--as', dest='recipient', required=True)
    ack.add_argument('--id', dest='message_id', required=True)
    ack.add_argument('--by', help='quien acusa (por defecto, el destinatario)')

    sub.add_parser('peers', help='buzones presentes')
    return parser


def _body(args: argparse.Namespace) -> str:
    if args.body is not None:
        return args.body
    if args.body_file is not None:
        return args.body_file.read_text(encoding='utf-8')
    return sys.stdin.read()


def _emit(value) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def main(argv: list[str]) -> int:
    args = _parser().parse_args(argv)
    try:
        box = Inbox(resolve_directory(args.dir))
    except PreconditionError as error:
        print(f'PRECONDICIÓN: {error}', file=sys.stderr)
        return EXIT_PRECONDITION
    try:
        if args.command == 'post':
            _emit(box.post(args.sender, args.recipient, _body(args),
                           request_id=args.request_id))
        elif args.command == 'pending':
            _emit(box.pending(args.recipient))
        elif args.command == 'render':
            print(envelope.render_many(box.pending(args.recipient)))
        elif args.command == 'inspect':
            _emit(asdict(box.inspect(args.recipient)))
        elif args.command == 'ack':
            _emit(box.ack(args.recipient, args.message_id,
                          by=args.by or args.recipient))
        elif args.command == 'peers':
            _emit(box.peers())
        elif args.command == 'wait':
            found = box.wait(args.recipient, args.timeout, args.interval)
            _emit(found)
            if not found:
                return EXIT_TIMEOUT
    except IdentityError as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return EXIT_OPERATION
    except UnknownMessageError as error:
        print(f'ERROR: acuse a un mensaje desconocido {error.args[0]!r}',
              file=sys.stderr)
        return EXIT_OPERATION
    return EXIT_OK


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
