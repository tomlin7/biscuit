from biscuit.settings.theme.high_contrast import HighContrastDark, HighContrastLight


def test_high_contrast_dark_properties():
    assert HighContrastDark.name == "High Contrast Dark"
    assert HighContrastDark.primary_background == "#000000"
    assert HighContrastDark.primary_foreground == "#FFFFFF"
    assert HighContrastDark.border == "#6FC3DF"


def test_high_contrast_light_properties():
    assert HighContrastLight.name == "High Contrast Light"
    assert HighContrastLight.primary_background == "#FFFFFF"
    assert HighContrastLight.primary_foreground == "#000000"
    assert HighContrastLight.border == "#0F4A85"
