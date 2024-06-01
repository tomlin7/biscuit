from src.biscuit.settings.theme import Dark, Light

from .endpoint import Endpoint


class Theme(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.dark = Dark
        self.light = Light

    # TODO themes registration, api
    def register_theme(self, theme): ...

    def set_theme(self, theme): ...
