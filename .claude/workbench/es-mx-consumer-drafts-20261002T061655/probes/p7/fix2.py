from pathlib import Path
def patch(path, pairs):
    p = Path(path); s = p.read_text()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:60]); s = s.replace(old, new)
    p.write_text(s)
patch('tests/test_translation_loop.py', [('"--jobs", "1", "--model", "claude-sonnet-5"]', '"--jobs", "1"]')])
patch('tools/scripts/translate_wave.sh', [('export LOOP WAVE model width compile', 'export LOOP WAVE width compile')])
patch('docs/ES_MX_TRANSLATION_PLAN.md', [
("| Agente | **Traductor**: una conversación `claude -p` por fragmento, con `--tools Read,Grep`. Lee el fragmento zh y **devuelve** la traducción entre `<<<ES` y `ES>>>`; el ciclo la escribe | `headless-pool` de THYROX vía `tools/thyrox/run`. `Write` quedó fuera porque `claude -p` lo bloquea bajo `.claude/` (primer intento del piloto) |",
 "| Agente | **Traductor**: un `thyrox -p` por fragmento, con `--tools Read,Grep`, cada uno en una ExecutionUnit de THYROX autorizada por la identidad de trabajo de este proyecto (`ai-course-notes:es-mx/<lote>/translate/<sello>/<n>`). Lee el fragmento zh y **devuelve** la traducción entre `<<<ES` y `ES>>>`; el ciclo la escribe | `headless-pool --execution unit --model-policy tools/lang/es-mx/model-policy.json` de THYROX vía `tools/thyrox/run`. El modelo lo elige el recomendador dentro de esa política: sólo el Qwen oficial cualificado, sin respaldo al proveedor; sin él, el pool rehúsa. Claude no participa |"),
("uv run --locked bash tools/scripts/translate_wave.sh --from N --to M --jobs 2 --model claude-sonnet-5 --compile \\",
 "uv run --locked bash tools/scripts/translate_wave.sh --from N --to M --jobs 2 --compile \\"),
("""1. **Modelo del traductor:** `claude-sonnet-5`, sostenido por los pilotos. El
   fallo del primer intento fue del contrato, no del modelo. **Se reabre** si la
   retraducción sigue introduciendo inglés donde el original escribe chino; en
   ese caso, A/B con otro modelo sobre los mismos fragmentos, midiendo señales
   y tokens.""",
"""1. **Modelo del traductor:** `qwen2.5:7b-instruct` desde los artefactos
   oficiales de Qwen, cualificado y ejecutado por THYROX (directiva del
   ejecutor 2026-10-02). La política vive en `tools/lang/es-mx/model-policy.json`
   (`fallback.enabled: false`): si Qwen no está cualificado o no arranca, la
   ola se detiene; no cae a Claude. Antes, `claude-sonnet-5`. Al desbloquearse
   la materialización real, A/B mínima sobre fragmentos ya aceptados
   (estructura, V0–V6, señales introducidas, glosario, tokens, tiempo) antes
   de continuar desde el estado persistido."""),
])
print('ok')
