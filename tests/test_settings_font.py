from biscuit.settings.font import FontManager, DEFAULT_FALLBACK_FONTS


def test_font_manager_fallbacks():
    fonts = FontManager.get_system_font_families()
    assert len(fonts) > 0
    assert any("Consolas" in f or "Courier" in f or "Mono" in f for f in fonts)


def test_font_availability():
    custom_list = ["Fira Code", "Consolas", "CustomFont"]
    assert FontManager.is_font_available("Fira Code", custom_list) is True
    assert FontManager.is_font_available("fira code", custom_list) is True
    assert FontManager.is_font_available("NonExistentFont", custom_list) is False
