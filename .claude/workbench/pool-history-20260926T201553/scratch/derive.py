def _mebibytes(kb: float) -> str:
    """Hacia arriba: una cota de admisión que redondea hacia abajo reserva
    menos de lo medido."""
    return f"{math.ceil(kb / 1024)}M"


def derive(history: Path, model: str, catalog: dict, margin: float = DEFAULT_MARGIN,
           reserve_kb: int = 0) -> Decision:
    """TTL y ``--memfree`` desde la última ejecución medida de esta plantilla.

    ``reserve_kb`` es la memoria de un VECINO que corre junto al pool (el
    ``tsc`` del pipeline, en ``tsc_cycle``): se suma a lo medido del ítem,
    porque la admisión de Parallel tiene que dejar sitio a los dos."""
    reserve_note = f" + reserva {reserve_kb} KB" if reserve_kb else ""
    row = _last_row(history)
    if row is None:
        if reserve_kb:
            return Decision(None, _mebibytes(reserve_kb),
                            f"sin ejecución previa de esta plantilla: la cota es sólo la reserva {reserve_kb} KB")
        return Decision(None, None, "sin ejecución previa de esta plantilla: nada que derivar")
    ttl, ttl_why = model_catalog.choose_cache_ttl(catalog, model, row["max_wall_s"] / 60)
    memfree = _mebibytes(row["peak_kb"] * margin + reserve_kb)
    why = (f"última ejecución: {row['items_measured']} ítems, pared máx {row['max_wall_s']:g} s, "
           f"pico {row['peak_kb']} KB × {margin:g}{reserve_note} -> {memfree}; TTL {ttl}: {ttl_why}")
    return Decision(ttl, memfree, why)
