import sv_ttk

from .theme import *


class Dark(Theme):
    name = "Myst"

    biscuit = "#EE720D"
    biscuit_dark = "#EE720D"

    border = "#141414"
    disabled = "#141414"

    primary_background = "#141414"
    primary_foreground = "#757575"
    primary_background_highlight = "#1C1C1C"
    primary_foreground_highlight = "#757575"

    secondary_background = "#222222"
    secondary_foreground = "#ffdadb"
    secondary_background_highlight = "#2A2A2A"
    secondary_foreground_highlight = "#ffdadb"

    # syntax
    Keyword = "#f84b3c"
    Name = "#ebdab4"
    Function = "#8fbf7f"
    String = "#b8ba37"
    Number = "#d28797"
    Comment = {"foreground": "#928375", "font": {"slant": "italic"}}
    Punctuation = "#8fbf7f"

    def __init__(self, *args, **kwds) -> None:
        super().__init__(*args, **kwds)
        sv_ttk.use_dark_theme()

        self.editors.linenumbers.number.foreground = "#928375"
        self.editors.linenumbers.number.highlightforeground = "#928375"

        self.editors.linenumbers.breakpoint.background = "#df463a"
        self.editors.linenumbers.breakpoint.highlightbackground = "#df463a"
