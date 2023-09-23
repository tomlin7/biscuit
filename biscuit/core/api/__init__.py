from biscuit.core.components import BaseEditor, BaseGame

from .commands import Commands
from .logger import Logger
from .notifications import Notifications
from .utils import Utils
from .views import Views


class ExtensionsAPI:
    def __init__(self, base) -> None:
        self.__base = base

        self.commands = Commands(self.__base)
        self.logger = Logger(self.__base)
        self.notifications = Notifications(self.__base)
        self.utils = Utils(self.__base)
        self.views = Views(self.__base)

        self.Game = BaseGame
        self.Editor = BaseEditor
        
        self.register_game = self.__base.register_game
