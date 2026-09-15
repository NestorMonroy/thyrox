#!/usr/bin/env python3
"""Suite de ``hooks/detect_narrative_continuity.py`` — noveno detector.

Origen: TASK-THYROX-0041. Generaliza ``weak_section_openers()``
(``NestorMonroy/ai-course-notes@717e2df6``, ``tools/scripts/
check_note_coverage.py``) — CON una corrección de diseño, no una copia: el
léxico de palabras-puente que la referencia usa mide la ETIQUETA, no el
TRASPASO de contenido. Medido cruzando ``kaist-cs492d/lecture01.tex`` contra
su ``.en.srt``: un encuadre hablado del profesor aterrizó en el ``.tex`` SIN
ningún marcador de "voz del profesor", y el contador por léxico habría
reportado 0 — sub-patrón A/C de ``metrica-decide-la-conclusion.md``.

Por eso este detector NO usa un léxico de palabras-puente. Verifica contra
la FUENTE: extrae los términos citados entre backticks dobles (``` `` ``` —
la convención RST para nombrar un símbolo o concepto preciso) de la sección
anterior, y pregunta si la apertura de la sección siguiente referencia al
menos uno. Es TASK-THYROX-0039 (el manifiesto de nodos) aplicado a un solo
archivo: los términos distintivos de una sección SON su manifiesto.

Lo que la suite mide:

1. ``distinctive_terms`` — extrae los términos entre backticks dobles, no
   palabras sueltas.
2. ``opens_with_continuity`` — CASO (a): apertura con palabra-puente clásica
   ("por lo tanto") pero SIN referenciar ningún término de la sección
   anterior -> NO cuenta como continuidad (el defecto exacto que el léxico
   puro se perdería).
3. ``opens_with_continuity`` — CASO (b): apertura SIN palabra-puente pero
   CON un término citado de la sección anterior -> SÍ cuenta. Es el caso de
   aceptación textual de TASK-THYROX-0041.
4. ``weak_openers`` — la primera sección nunca se marca (no tiene anterior
   contra qué verificar).
5. ``split_sections`` — separa por encabezado RST real (título + línea de
   subrayado de longitud >= título), no por cualquier línea de ``=``.
6. ``detect(payload)`` — el hook de PreToolUse: sólo mira ``Write`` sobre
   ``.rst`` con ``content``; ``None`` si no aplica.
7. ANULACIÓN: sustituyendo ``distinctive_terms`` por un detector de
   palabras-puente léxicas (la forma que SÍ falla en el caso real medido),
   el CASO (a) —léxico presente, sin continuidad real— deja de marcarse
   como débil. Cae exactamente esa aserción.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from hooks import detect_narrative_continuity as dnc  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


print("=== 1. distinctive_terms ===")
cuerpo = "Se declara ``CLAVE_X`` y también ``otro_termino``, más prosa genérica sin backticks."
check("dos términos citados", {"CLAVE_X", "otro_termino"}, dnc.distinctive_terms(cuerpo))
check("sin backticks -> conjunto vacío", set(), dnc.distinctive_terms("prosa llana sin nada citado"))

print("=== 2. CASO (a): palabra-puente sin continuidad real -> NO cuenta ===")
anterior = dnc.Section(title="Primera", body="Aquí se define ``CLAVE_X`` con su comportamiento.", start_line=1)
siguiente_a = dnc.Section(
    title="Segunda",
    body="Por lo tanto, consideremos ahora un tema totalmente distinto sin relación.",
    start_line=10,
)
check("léxico presente, sin término compartido -> False", False,
      dnc.opens_with_continuity(siguiente_a, anterior))

print("=== 3. CASO (b): sin palabra-puente, con término citado -> SÍ cuenta ===")
siguiente_b = dnc.Section(
    title="Segunda",
    body="``CLAVE_X`` vuelve a aparecer aquí, ahora en otro contexto distinto.",
    start_line=10,
)
check("sin léxico, con término compartido -> True", True,
      dnc.opens_with_continuity(siguiente_b, anterior))

print("=== 4. weak_openers — la primera sección nunca se marca ===")
solo_una = [anterior]
check("una sola sección -> sin débiles", [], dnc.weak_openers(solo_una))
# Cadena propia: cada sección se compara contra su PREDECESOR INMEDIATO, no
# contra cualquier sección anterior en la lista.
tercera_referencia_a_siguiente_a = dnc.Section(
    title="Tercera",
    body="Nada que ver con lo anterior, sin backticks ni continuidad declarada.",
    start_line=20,
)
tres_secciones = [anterior, siguiente_b, tercera_referencia_a_siguiente_a]
debiles = dnc.weak_openers(tres_secciones)
check("de tres secciones (anterior -> b continua -> tercera no), sólo la tercera es débil",
      ["Tercera"], [s.title for s in debiles])
check("exactamente una sección débil, no dos", 1, len(debiles))

print("=== 5. split_sections — encabezado RST real, no cualquier '=' ===")
texto = (
    "Introducción\n============\n\nPrimer párrafo con ``TERMINO_UNO``.\n\n"
    "Cierre\n======\n\nSegundo párrafo que cita ``TERMINO_UNO`` de nuevo.\n"
)
secciones = dnc.split_sections(texto)
check("dos secciones detectadas", ["Introducción", "Cierre"], [s.title for s in secciones])
check("el cuerpo de la primera no incluye el encabezado de la segunda", False,
      "Cierre" in secciones[0].body)

print("=== 6. detect(payload) — sólo Write sobre .rst con content ===")
payload_no_rst = {"tool_input": {"file_path": "archivo.py", "content": "texto"}}
check("archivo .py -> None", None, dnc.detect(payload_no_rst))
payload_sin_content = {"tool_input": {"file_path": "archivo.rst"}}
check("sin content (Edit) -> None", None, dnc.detect(payload_sin_content))
payload_rst_debil = {"tool_input": {"file_path": "archivo.rst", "content": texto.replace(
    "Segundo párrafo que cita ``TERMINO_UNO`` de nuevo.",
    "Por lo tanto, un segundo párrafo sin relación alguna con lo anterior.",
)}}
aviso = dnc.detect(payload_rst_debil)
check("rst con apertura débil -> aviso no vacío", True, bool(aviso))
check("el aviso cita el título de la sección débil", True, "Cierre" in (aviso or ""))

print("=== 7. ANULACIÓN — léxico de palabras-puente en vez de términos citados ===")


def opens_with_continuity_lexico(section, previous, *, window=400):
    # Anulación: vuelve al patrón que SÍ falla en el caso real medido (H-THYROX-.../srt).
    puentes = ("por lo tanto", "en consecuencia", "así", "entonces")
    apertura = section.body[:window].lower()
    return any(p in apertura for p in puentes)


check(
    "anulación: con léxico de palabras-puente, el CASO (a) YA NO se marca débil "
    "(léxico presente basta) -- cae exactamente esta aserción",
    True, opens_with_continuity_lexico(siguiente_a, anterior),
)

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
