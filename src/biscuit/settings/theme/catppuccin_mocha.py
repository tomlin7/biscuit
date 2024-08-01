import sv_ttk

from .theme import *


class Dark(Theme):
    name = "biscuit dark"

    biscuit = "#f5c2e7"
    biscuit_dark = "#f5c2e7"

    border = "#2A2A2A"
    disabled = "#737373"

    primary_background = "#1e1e2e"
    primary_foreground = "#cdd6f4"
    primary_background_highlight = "#7f849c"
    primary_foreground_highlight = "#cdd6f4"

    secondary_background = "#1e1e2e"
    secondary_foreground = "#cdd6f4"
    secondary_background_highlight = "#7f849c"
    secondary_foreground_highlight = "#cdd6f4"

    # syntax
    Keyword = "#f5c2e7"
    Name = "#89b4fa"
    Function = "#f9e2af"
    String = "#ce9178"
    Number = "#b5cea8"
    Comment = {"foreground": "#a6e3a1", "font": {"slant": "italic"}}
    Punctuation = "#94e2d5"

    def __init__(self, *args, **kwds) -> None:
        super().__init__(*args, **kwds)
        sv_ttk.use_dark_theme()

        self.editors.linenumbers.number.foreground = "#cdd6f4"
        self.editors.linenumbers.number.highlightforeground = "#cdd6f4"

        self.editors.linenumbers.breakpoint.background = "#f38ba8"
        self.editors.linenumbers.breakpoint.highlightbackground = "#f38ba8"
