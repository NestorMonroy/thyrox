#!/usr/bin/env python3
"""Los renombres que la tabla palabra-a-palabra no puede resolver sola.

Cada uno es una COLISION real: la traduccion directa ya nombra OTRO simbolo en
el mismo ambito, asi que renombrar fusionaria dos cosas distintas. La salida no
es buscar un sinonimo —eso es lo que `redaccion-tecnica-es.md` prohibe— sino
**traducir la palabra y calificarla con su papel**, que es informacion del
sitio y no del diccionario: `fila` dentro de un bucle cuyo `row` ya existe es
el registro que se compone con esa fila, luego `record`.

Por eso viven aqui, con su sitio, y no en el lexico: el lexico traduce
palabras y esto decide nombres.
"""

#: (ruta, nombre viejo) -> nombre nuevo.
OVERRIDES = {
    ('src/agents/agent_store.py', 'suma'): 'bucket_sum',
    ('src/hooks/detect_topic_duplication.py', 'ordenados'): 'sorted_hits',
    ('src/session/job_runs.py', 'ordenadas'): 'sorted_durations',
    ('src/task/board_sync.py', 'entrada'): 'board_entry',
    ('src/task/board_sync.py', 'fila'): 'record',
    ('src/verify/verificar_premisa.py', 'raiz'): 'root_dir',
    ('src/verify/writer_census.py', 'desde'): 'since',
    ('tests/agents/test_final_message_closing.py', 'etiqueta'): 'case_label',
    ('tests/agents/test_final_message_closing.py', 'ruta'): 'jsonl_path',
    ('tests/docs/test_initiative_placement.py', 'raiz'): 'root_dir',
    ('tests/docs/test_scaffold_initiative.py', 'raiz'): 'root_dir',
    ('tests/docs/test_scaffold_initiative.py', 'cuerpo'): 'template_body',
    ('tests/hooks/test_detect_code_language.py', '_RAIZ'): '_TREE_ROOT',
    ('tests/hooks/test_detect_narrative_continuity.py', 'anterior'): 'prior',
    ('tests/measurement/test_trend.py', 'recta'): 'straight_line',
    ('tests/session/test_marker_wait.py', 'etiqueta'): 'case_label',
    ('tests/verify/test_writer_census.py', 'con'): 'with_resolution',
    # --- traducir-identificadores-nuevos: nombres de test, frase entera
    ('tests/corpus/test_backfill_store_destination.py', 'test_agent_store_claude_dir_desvia_la_escritura'): 'test_agent_store_claude_dir_diverts_the_write',
    ('tests/corpus/test_term_census.py', 'test_4_the_ENIE_does_not_fold_into_the_ENE'): 'test_4_n_with_tilde_does_not_fold_into_plain_n',
    ('tests/paths/test_consumer_strict_optin.py', 'test_declarada_no_rehusa_sin_punto_de_partida'): 'test_declared_does_not_refuse_without_a_starting_point',
    ('tests/paths/test_consumer_strict_optin.py', 'test_declarada_rehusa_cuando_el_partida_es_el_proveedor'): 'test_declared_refuses_when_the_start_is_the_provider',
    ('tests/paths/test_consumer_strict_optin.py', 'test_declarada_resuelve_lo_relativo_contra_el_contenedor'): 'test_declared_resolves_relative_against_the_container',
    ('tests/paths/test_consumer_strict_optin.py', 'test_la_absoluta_sigue_mandando_con_o_sin_declaracion'): 'test_absolute_still_rules_with_or_without_declaration',
    ('tests/paths/test_consumer_strict_optin.py', 'test_los_valores_que_apagan_la_clausula'): 'test_values_that_turn_the_clause_off',
    ('tests/paths/test_consumer_strict_optin.py', 'test_los_valores_que_la_encienden'): 'test_values_that_turn_it_on',
    ('tests/paths/test_consumer_strict_optin.py', 'test_sin_la_declaracion_la_conducta_es_la_de_siempre'): 'test_without_declaration_behavior_is_unchanged',
    ('tests/paths/test_consumer_strict_optin.py', 'test_sin_la_declaracion_lo_relativo_se_resuelve_contra_el_cwd'): 'test_without_declaration_relative_resolves_against_cwd',
    ('tests/paths/test_declaration_port.py', 'test_el_consumidor_gana_sobre_el_proveedor'): 'test_consumer_wins_over_provider',
    ('tests/paths/test_declaration_port.py', 'test_el_hogar_propio_del_proveedor_no_se_filtra'): 'test_provider_own_home_does_not_leak',
    ('tests/paths/test_declaration_port.py', 'test_el_proceso_gana_sobre_las_dos'): 'test_process_wins_over_both',
    ('tests/paths/test_declaration_port.py', 'test_env_file_declarado_apaga_la_capa_del_proveedor'): 'test_declared_env_file_turns_off_provider_layer',
    ('tests/paths/test_declaration_port.py', 'test_la_familia_de_otro_clon_no_se_filtra'): 'test_family_of_another_clone_does_not_leak',
    ('tests/paths/test_declaration_port.py', 'test_la_familia_por_clon_cae_al_proveedor'): 'test_per_clone_family_falls_back_to_provider',
    ('tests/paths/test_declaration_port.py', 'test_positivo_real_la_familia_por_clon_se_lee_desde_el_consumidor'): 'test_real_positive_per_clone_family_is_read_from_consumer',
    ('tests/paths/test_declaration_port.py', 'test_sin_env_del_proveedor_no_hay_respaldo_ni_error'): 'test_without_provider_env_there_is_no_fallback_nor_error',
    ('tests/paths/test_declaration_port.py', 'test_sin_raiz_declarada_el_proveedor_es_el_hermano_del_clon'): 'test_without_declared_root_provider_is_clone_sibling',
    ('tests/paths/test_declaration_port.py', 'test_un_arbol_sin_proveedor_hermano_no_hereda_el_del_host'): 'test_tree_without_sibling_provider_does_not_inherit_host',
    ('tests/session/test_kernel_module_support.py', 'test_ENOSYS_es_la_unica_ausencia'): 'test_ENOSYS_is_the_only_absence',
    ('tests/session/test_kernel_module_support.py', 'test_el_instrumento_puede_decir_algo_QUE_NO_sea_ENOSYS'): 'test_instrument_can_say_something_OTHER_than_ENOSYS',
    ('tests/session/test_kernel_module_support.py', 'test_el_numero_de_llamada_es_por_arquitectura'): 'test_syscall_number_is_per_architecture',
    ('tests/session/test_kernel_module_support.py', 'test_la_familia_entera_responde_igual'): 'test_whole_family_answers_the_same',
    ('tests/session/test_kernel_module_support.py', 'test_la_sonda_no_puede_cargar_nada'): 'test_probe_cannot_load_anything',
    ('tests/session/test_kernel_module_support.py', 'test_los_archivos_no_deciden_nada'): 'test_files_decide_nothing',
    ('tests/session/test_transcripts_home.py', 'test_el_desempate_es_uno_solo'): 'test_tie_break_is_a_single_one',
    ('tests/session/test_transcripts_home.py', 'test_el_hogar_se_declara'): 'test_home_is_declared',
    ('tests/session/test_transcripts_home.py', 'test_los_dos_consumidores_reales_coinciden'): 'test_both_real_consumers_agree',
    ('tests/session/test_transcripts_home.py', 'test_ningun_modulo_compone_el_hogar_por_su_cuenta'): 'test_no_module_composes_home_on_its_own',
    ('tests/session/test_transcripts_home.py', 'test_sin_declaracion_se_compone_y_se_anota'): 'test_without_declaration_it_is_composed_and_noted',
    ('tests/session/test_transcripts_home.py', 'test_sin_transcript_no_compone_una_ruta'): 'test_without_transcript_no_path_is_composed',
    ('tests/session/test_transcripts_home.py', 'test_una_sesion_puede_tener_VARIOS_transcripts'): 'test_a_session_can_have_SEVERAL_transcripts',
    # --- colisiones en test_emit_declarations: el papel en el sitio
    ('tests/typescript/test_emit_declarations.py', 'raiz'): 'root_package',
    ('tests/typescript/test_emit_declarations.py', 'resultado'): 'emit_result',
    ('tests/typescript/test_emit_declarations.py', 'emitidas'): 'emitted_files',
    ('tests/typescript/test_emit_declarations.py', 'enlace'): 'link_dir',
}
