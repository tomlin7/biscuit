from .commands import Commands
from .logger import Logger
from .notifications import Notifications
from .utils import Utils


class ExtensionsAPI:
    def __init__(self, base):
        self.__base = base

        self.commands = Commands(self.__base)
        self.logger = Logger(self.__base)
        self.notifications = Notifications(self.__base)
        self.utils = Utils(self.__base)
