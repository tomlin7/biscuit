from .commands import Commands
from .logger import Logger
from .notifications import Notifications
from .utils import Utils

from core.components import BaseGame, BaseEditor


class ExtensionsAPI:
    def __init__(self, base):
        self.__base = base

        self.commands = Commands(self.__base)
        self.logger = Logger(self.__base)
        self.notifications = Notifications(self.__base)
        self.utils = Utils(self.__base)

        self.Game = BaseGame
        self.Editor = BaseEditor

        self.theme = self.__base.theme
        self.register_game = self.__base.register_game
