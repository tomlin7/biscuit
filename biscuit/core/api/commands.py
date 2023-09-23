from .endpoint import Endpoint


class Commands(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.__settings = self._Endpoint__base.settings

        self.register_command = self.__settings.register_command
    
    @property
    def commands(self) -> None:
        return self.__settings.commands.copy()
