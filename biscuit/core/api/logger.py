from .endpoint import Endpoint


class Logger(Endpoint):
    def __init__(self, *a):
        super().__init__(*a)
        self.__logger = self._Endpoint__base.logger

        self.log = self.info = self.show = self.__logger.info
        self.warn = self.warning = self.__logger.warning
        self.error = self.__logger.error
