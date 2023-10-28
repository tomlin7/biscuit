from biscuit.core.settings.config.theme import Dark, Light

from .endpoint import Endpoint


class Theme(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)        
        self.__sidebar = self._Endpoint__base.sidebar
        self.__panel = self._Endpoint__base.sidebar

        self.dark = Dark
        self.light = Light

    def register_theme(self, theme):
        ...

    def set_theme(self, theme):
        ...
