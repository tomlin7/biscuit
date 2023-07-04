from .endpoint import Endpoint


class Commands(Endpoint):
    def __init__(self, *a):
        super().__init__(*a)