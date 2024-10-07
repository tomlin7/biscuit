# Palette: https://github.com/morhetz/gruvbox

import sv_ttk

from .theme import *


class GruvboxDark(Theme):
    name = "gruvbox dark"

    biscuit = "#8fbf7c"
    biscuit_dark = "#3c3836"

    border = "#3c3836"
    disabled = "#737373"

    primary_background = "#282828"
    primary_foreground = "#ebdbb2"
    primary_background_highlight = "#3c3836"
    primary_foreground_highlight = "#fbf1c7"

    secondary_background = "#1d2021"
    secondary_foreground = "#ebdbb2"
    secondary_background_highlight = "#32302f"
    secondary_foreground_highlight = "#fbf1c7"

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

        self.editors.diff.not_exist = "#424242"
        self.editors.diff.removed = "#452323"
        self.editors.diff.addition = "#203423"

        self.editors.currentword = "#474747"
        self.editors.found = "#203423"
        self.editors.currentline = self.border
        self.editors.selection = "#264f78"
        self.editors.found = "#623315"
        self.editors.foundcurrent = "#9e86b7"
        self.editors.hovertag = "#202b35"

        self.views.panel.logs.time = "#6a9955"
        self.views.panel.logs.caller = "#569cd6"
        self.views.panel.logs.info = "#b5cea8"
        self.views.panel.logs.warning = "#ce9178"
        self.views.panel.logs.error = "#ce9178"

        self.editors.bracket_colors = ("ffd700", "da70d6", "179fff")
        self.editors.activebracket = "#d79921"
        self.editors.hyperlink = "#4583b6"
