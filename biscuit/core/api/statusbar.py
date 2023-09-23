from .endpoint import Endpoint


class Theme(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)        
        self.__statusbar = self._Endpoint__base.statusbar

    def add_item(self, theme):
        ...
