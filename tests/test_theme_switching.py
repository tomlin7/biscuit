from unittest.mock import MagicMock
from biscuit.settings.config import Config
from biscuit.api.theme import Theme as APITheme


class CustomTheme:
    def __init__(self):
        self.name = "Custom"


def test_config_theme_registration_and_switching(mock_base):
    cfg = Config.__new__(Config)
    cfg.base = mock_base
    cfg.data = {}
    cfg.registered_themes = {}

    # Register custom theme
    cfg.register_theme("my_theme", CustomTheme)
    assert "my_theme" in cfg.registered_themes

    # Switch to registered theme
    cfg.set_theme("my_theme")
    assert isinstance(cfg.theme, CustomTheme)
    assert cfg.data["theme"] == "my_theme"

    # Switch to built-in light theme
    cfg.set_theme("light")
    assert "VSCodeLight" in cfg.theme.__class__.__name__

    # Switch to built-in dark theme
    cfg.set_theme("dark")
    assert "VSCodeDark" in cfg.theme.__class__.__name__


def test_api_theme_registration(mock_base):
    mock_base.settings = MagicMock()
    mock_base.settings.config = MagicMock()

    api_theme = APITheme(mock_base)
    api_theme.register_theme("custom", CustomTheme)
    mock_base.settings.config.register_theme.assert_called_once_with("custom", CustomTheme)

    api_theme.set_theme("custom")
    mock_base.settings.config.set_theme.assert_called_once_with("custom")
