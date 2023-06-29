from typing import Any
from .theme import Theme


class Dark(Theme):
    def __init__(self, *args, **kwds):
        super().__init__(*args, **kwds)
