import os
import toml

from .theme.catppuccin_mocha import CatppuccinMocha
from .theme.gruvbox_dark import GruvboxDark


class Config:
    """Loads and manages configurations for biscuit."""

    def __init__(self, master) -> None:
        self.base = master.base

        self.config_path = self.get_config_path("settings.toml")
        self.data = {}
        self.load_data()

    def get_config_path(self, relative_path: str) -> str:
        """Get the absolute path to the resource

        Args:
            relative_path (str): path relative to the config directory"""

        path = os.path.join(self.base.configdir, relative_path)
        if not os.path.exists(path):
            # fallback to the default config in the repo
            path = os.path.join(self.base.parentdir, "config", relative_path)
        
        return path

    def load_data(self) -> None:
        """Load configurations from the config file."""
        if os.path.exists(self.config_path):
            with open(self.config_path, "r") as configfile:
                self.data = toml.load(configfile)
        else:
            self.data = {}

        self.setup_properties()

    def setup_properties(self) -> None:
        """Setup properties based on the loaded data."""
        # TODO add more properties
        # Editor
        self.font = (self.get_value("font", "Fira Code"), self.get_value("font_size", 12))
        self.uifont = (self.get_value("uifont", "Fira Code"), self.get_value("uifont_size", 10))
        
        # Theme
        theme_name = self.get_value("theme", "dark")
        from .theme import VSCodeDark, VSCodeLight
        if theme_name == "dark":
            self.theme = VSCodeDark()
        elif theme_name == "light":
            self.theme = VSCodeLight()
        elif theme_name == "gruvbox_dark":
            self.theme = GruvboxDark()
        elif theme_name == "catppuccin_mocha":
            self.theme = CatppuccinMocha()
        else:
            self.theme = VSCodeDark()

        # Text Editor
        self.auto_save_enabled = self.get_value("auto_save", False)
        self.auto_closing_pairs = self.get_value("auto_closing_pairs", True)
        self.auto_closing_delete = self.get_value("auto_closing_delete", True)
        self.auto_indent = self.get_value("auto_indent", True)
        self.auto_surround = self.get_value("auto_surround", True)
        self.word_wrap = self.get_value("word_wrap", False)
        self.tab_size = self.get_value("tab_size", 4)
        self.cursor_style = self.get_value("cursor_style", "line")
        self.relative_line_numbers = self.get_value("relative_line_numbers", False)

    def get_value(self, key: str, default: any) -> any:
        """Get a value from the config data."""
        return self.data.get(key, default)

    def set_value(self, key: str, value: any) -> None:
        """Set a value in the config data and save it."""
        self.data[key] = value
        self.save()
        self.setup_properties()
        
        self.base.refresh_editors() 
        if "font" in key:
             self.base.settings.update_font()

    def save(self) -> None:
        """Save the current config data to the config file."""
        # ensure config directory exists
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, "w") as configfile:
            toml.dump(self.data, configfile)
