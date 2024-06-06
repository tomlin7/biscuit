import sv_ttk
from pygments.token import Token

from .theme import Theme


class Light(Theme):
    name = "biscuit light"

    def __init__(self, *args, **kwds) -> None:
        super().__init__(*args, **kwds)
        sv_ttk.use_light_theme()
