from .endpoint import Endpoint


class Commands(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.settings = self.base.settings

        self.register_command = self.settings.register_command

    @property
    def commands(self) -> None:
        return self.settings.commands.copy()
