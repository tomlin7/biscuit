from typing import Any
from .theme import Theme


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

    def __init__(self, *args, **kwds):
        super().__init__(*args, **kwds)

        self.editors.linenumbers.highlightforeground = "#cccccc"
