import json


class ThemeLoader:
    def __init__(self, theme_name, default="default"):
        self.theme_name = theme_name
        self.default = default
        self.try_load_theme()

    def try_load_theme(self):
        try:
            self.themedata = self.load_theme()
        except Exception:
            self.themedata = self.load_theme(self.default)

    def load_theme(self):
        with open(f'src/config/themes/{self.theme_name}.json', 'r') as theme_file:
            theme_data = json.load(theme_file)
        return theme_data
    
    def get_loaded_theme(self):
        return self.theme_data
