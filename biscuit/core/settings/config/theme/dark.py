import sv_ttk
from .theme import Theme
from pygments.token import Token


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

    def __init__(self, *args, **kwds):
        super().__init__(*args, **kwds)
        sv_ttk.use_dark_theme()

        self.editors.linenumbers.number.foreground = "#6e7681"
        self.editors.linenumbers.number.highlightforeground = "#cccccc"

        self.editors.diff.not_exist = "#424242"
        self.editors.diff.removed = "#452323"
        self.editors.diff.addition = "#203423"
