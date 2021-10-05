from lib.config.theme.loadtheme import ThemeLoader


class Theme:
    # TODO: properties
    # ...

    def __init__(self, theme_name):
        self.theme_name = theme_name

        self.loader = ThemeLoader(self.theme_name)
        self.theme = self.loader.get_loaded_theme()