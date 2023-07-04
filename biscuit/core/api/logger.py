from .endpoint import Endpoint


class Logger(Endpoint):
    def __init__(self, *a):
        super().__init__(*a)
