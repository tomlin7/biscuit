from .loadtheme import ThemeLoader


class Theme:
    # TODO: properties
    # ...

    def __init__(self, master, theme_name="default"):
        self.base = master.base

        self.theme_name = theme_name

        self.loader = ThemeLoader(self, self.theme_name)
        self.theme = self.loader.get_loaded_theme()