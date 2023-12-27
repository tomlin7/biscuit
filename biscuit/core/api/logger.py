from .endpoint import Endpoint


class Logger(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.logger = self.base.logger

        self.log = self.info = self.show = self.logger.info
        self.warn = self.warning = self.logger.warning
        self.error = self.logger.error
