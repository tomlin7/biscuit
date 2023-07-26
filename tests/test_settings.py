import tkinter as tk
from biscuit.core.settings import Config, Style, Resources, Bindings


class TestSettings:
    # Tests that Config is initialized correctly
    # def test_config_initialization(self, app_instance):
    #     settings = app_instance.settings

    #     assert isinstance(settings.config, Config)
    #     assert isinstance(settings.style, Style)
    #     assert isinstance(settings.res, Resources)
    #     assert isinstance(settings.font, tk.font.Font)
    #     assert isinstance(settings.bindings, Bindings)

    # Tests that register_command method correctly registers new commands
    def test_register_command(self, app_instance):
        settings = app_instance.settings
        settings.register_command('Test Command', lambda: print('Test Command'))
        assert 'Test Command' in (i[0] for i in settings.commands)
