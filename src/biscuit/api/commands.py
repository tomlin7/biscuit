from .endpoint import Endpoint


class Commands(Endpoint):
    """Commands endpoint

    This class is used to interact with the commands API.
    Commands are actions that can be executed by the user.
    Command Palette is the main way to interact with commands.
    """

    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.settings = self.base.settings

        self.register_command = self.settings.register_command

    @property
    def commands(self) -> None:
        """Return all registered commands"""

        return self.settings.commands.copy()
