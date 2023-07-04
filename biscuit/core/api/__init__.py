from .commands import Commands
from .logger import Logger
from .notifications import Notifications
from .utils import Utils


class ExtensionsAPI:
    def __init__(self, base):
        self.__base = base

        self.commands = Commands(self)
        self.logger = Logger(self)
        self.notifications = Notifications(self)
        self.utils = Utils(self)
