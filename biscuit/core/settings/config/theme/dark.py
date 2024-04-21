import sv_ttk
from pygments.token import Token

from .theme import *


class Dark(Theme):
    name = "biscuit dark"

    border = "#2A2A2A"

    primary_background = "#181818"
    primary_foreground = "#8B949E"
    primary_background_highlight = "#2C2D2D"
    primary_foreground_highlight = "#CCCCCC"

    secondary_background = '#1f1f1f'
    secondary_foreground = '#a9a9a9'
    secondary_background_highlight = '#323232'
    secondary_foreground_highlight = '#e0e0e0'

    # syntax
    Keyword = "#569cd6"
    Name = "#4EC9B0"
    Function = "#dcdcaa"
    String = "#ce9178"
    Number = "#b5cea8"
    Comment = "#7ca668"
    Punctuation = "#808080"

    def __init__(self, *args, **kwds) -> None:
        super().__init__(*args, **kwds)
        sv_ttk.use_dark_theme()

        self.editors.linenumbers.number.foreground = "#6e7681"
        self.editors.linenumbers.number.highlightforeground = "#cccccc"

        self.editors.diff.not_exist = "#424242"
        self.editors.diff.removed = "#452323"
        self.editors.diff.addition = "#203423"

        self.editors.currentword = "#474747"
        self.editors.found = "#203423"
        self.editors.selection = "#264f78"
        self.editors.currentword = "#27323c"
        self.editors.found = "#623315"
        self.editors.foundcurrent = "#9e86b7"
        self.editors.hovertag = "#202b35"

        self.views.panel.logs.time = "#6a9955"
        self.views.panel.logs.caller = "#569cd6"
        self.views.panel.logs.info = "#b5cea8"
        self.views.panel.logs.warning = "#ce9178"
        self.views.panel.logs.error = "#ce9178"

        self.editors.linenumbers.breakpoint.background = '#6e1b13' 
        self.editors.linenumbers.breakpoint.highlightbackground = '#e51400'
