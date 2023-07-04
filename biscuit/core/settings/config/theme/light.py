import sv_ttk
from .theme import Theme


class Light(Theme):
    name = "biscuit light"
    
    border = "#dfdfdf"

    primary_background = "#f8f8f8"
    primary_background_highlight = "#e1e1e1"
    secondary_background = 'white'
    secondary_background_highlight = 'white'

    primary_foreground = "#424242"
    primary_foreground_highlight = 'black'
    secondary_foreground = 'black'
    secondary_foreground_highlight = 'black'

    def __init__(self, *args, **kwds):
        super().__init__(*args, **kwds)
        sv_ttk.use_light_theme()