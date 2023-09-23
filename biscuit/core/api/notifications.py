from .endpoint import Endpoint


class Notifications(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)        
        self.__notifications = self._Endpoint__base.notifications

        self.info = self.show = self.__notifications.info
        self.warn = self.warning = self.__notifications.warning
        self.error = self.__notifications.error
